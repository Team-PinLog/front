import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  loadKakaoMaps,
  type KakaoCustomOverlay,
  type KakaoMap,
  type KakaoNamespace,
} from '@/shared/lib/kakaoMaps';
import {
  getRecordMarkerAsset,
  RECORD_MARKER_ASSET_HEIGHT,
  RECORD_MARKER_ASSET_WIDTH,
  RECORD_MARKER_TIP_Y_RATIO,
} from '@/shared/lib/getRecordMarkerAsset';
import {
  clampPointToBox,
  countPointsOutsideViewport,
  getFitPadding,
  getMedianPoint,
  getVisibleCenterLatOffset,
  KOREA_PAN_BOUNDS,
  MAX_ZOOM_OUT_LEVEL,
  shrinkViewportFromTop,
  type LatLngBox,
  type MapPoint,
  type MapViewInsets,
} from '../lib/recordMapViewportLimits';
import type { RecordMapBbox, RecordMapItem } from '../api/getRecordMapMarkers';
import { useRecordMapMarkersQuery } from '../hooks/useRecordMapMarkersQuery';

// 화면에 그릴 마커 크기(px). src/assets/color-markers/*.svg 원본(64x76)의 정확히 1/2이라
// 비율이 어긋나지 않는다. 근거: Jira S15P11A705-307.
const MARKER_WIDTH = RECORD_MARKER_ASSET_WIDTH / 2;
const MARKER_HEIGHT = RECORD_MARKER_ASSET_HEIGHT / 2;

/**
 * 카카오 기본 Marker(빨간 핀) 대신 CustomOverlay에 올릴 마커 엘리먼트를 만든다.
 * 색은 getRecordMarkerAsset(latestCollectionId 해시)이 고른 SVG asset으로 결정된다.
 * JS로 SVG 마크업을 만들어 innerHTML로 넣지 않고 <img src>로 불러온다 — asset 20개가 모두 같은
 * `<filter id="shadow">`를 쓰기 때문에, 인라인으로 심으면 문서 전체에서 id가 충돌해 마커 전부가
 * 첫 번째 필터 하나를 공유한다. <img>는 각 SVG가 독립 문서로 렌더돼 그 문제가 없고, 그림자도
 * asset 안에 이미 들어 있어 wrapper에 별도 drop-shadow를 걸 필요가 없다.
 */
function createRecordMarkerElement(assetUrl: string, title: string): HTMLImageElement {
  const image = document.createElement('img');
  image.src = assetUrl;
  // 마커 자체는 장식이 아니라 클릭 대상이지만 이름은 title로 노출되므로 alt는 비워 중복을 피한다.
  image.alt = '';
  image.title = title;
  image.width = MARKER_WIDTH;
  image.height = MARKER_HEIGHT;
  image.draggable = false;
  image.style.display = 'block';
  image.style.cursor = 'pointer';
  // width/height 속성만으로는 부족하다. Tailwind preflight의 `img { max-width: 100%; height: auto }`가
  // 살아 있는데, CustomOverlay가 content를 감싸는 래퍼 div는 폭이 0이라 max-width:100%가 0으로
  // 계산돼 마커가 0x0으로 찌그러진다(실측: naturalWidth 64인데 렌더 폭 0). max-width를 풀고 크기를
  // 인라인 스타일로 못박아야 그려진다. 이전 인라인 <svg> 방식엔 preflight의 이 규칙이 걸리지
  // 않아서 드러나지 않던 차이다.
  image.style.maxWidth = 'none';
  image.style.width = `${MARKER_WIDTH}px`;
  image.style.height = `${MARKER_HEIGHT}px`;
  return image;
}

// 마커가 없을 때(최초 SDK 로드 등) 지도 기본 중심(서울시청). KakaoPlaceMap.tsx와 동일 기본값.
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };

// 최초 진입 fitBounds 여유(px). 근거: docs/reference/08_API_명세.md 4.2
// "fitBounds(bounds, padding)으로 모든 마커가 한눈에 보이는 최소 화면(여유 포함)을 만든다."
// 경계에 걸친 마커 아이콘이 뷰포트 가장자리에서 잘리지 않도록 사방에 동일하게 적용한다.
// 상단만은 topObstructionPx만큼 더 키운다(getFitPadding) — 그 구간은 오버레이에 가려 있어
// 여유를 줘도 마커가 보이지 않는다. 근거: Jira S15P11A705-325.
const FIT_BOUNDS_PADDING = 48;

// 지도 생성 직후(fitBounds 적용 전)와 bounds가 null(저장된 기록 없음)일 때 유지되는 고정 줌 레벨.
// 카카오맵 레벨 6 ≈ 반경 500m. 근거: Jira S15P11A705-237 — 기존 레벨 7(약 1km 반경)이 초기
// 진입 시 지나치게 넓게 보인다는 리포트에 따라 축소. bounds가 있는 경우는 docs/api-contract.md
// "Place · 지도 · 검색"에 fitBounds 사용이 확정돼 있어 이 값과 무관하게 fitBounds가 우선 적용된다.
const INITIAL_ZOOM_LEVEL = 6;

/** 지도가 지금 보여주는 영역을 순수 함수들이 다룰 수 있는 형태로 꺼낸다. */
function readViewport(map: KakaoMap): LatLngBox {
  const view = map.getBounds();
  const sw = view.getSouthWest();
  const ne = view.getNorthEast();
  return { swLat: sw.getLat(), swLng: sw.getLng(), neLat: ne.getLat(), neLng: ne.getLng() };
}

/** 컨테이너 중 오버레이에 가리지 않아 사용자가 실제로 보는 영역. */
function readVisibleViewport(map: KakaoMap, insets: MapViewInsets): LatLngBox {
  return shrinkViewportFromTop(readViewport(map), insets);
}

/**
 * 지점을 가시 영역의 세로 한가운데에 놓는다. 지도 중심에 그대로 두면 오버레이 높이의 절반만큼
 * 위로 밀려 보이므로, 중심을 그만큼 북쪽으로 올려 목표 지점을 아래로 내린다.
 */
function centerOnVisibleArea(
  kakao: KakaoNamespace,
  map: KakaoMap,
  point: MapPoint,
  insets: MapViewInsets,
  animate: boolean,
): void {
  const latOffset = getVisibleCenterLatOffset(readViewport(map), insets);
  const target = new kakao.maps.LatLng(point.lat + latOffset, point.lng);
  if (animate) {
    map.panTo(target);
  } else {
    map.setCenter(target);
  }
}

/**
 * 지도 중심이 KOREA_PAN_BOUNDS를 벗어나 있으면 가장 가까운 경계 지점으로 되돌린다.
 * 이미 범위 안이면 아무것도 하지 않는다(clampPointToBox가 null을 준다).
 * animate가 true면 panTo로 부드럽게 되돌린다 — 사용자가 드래그로 끌고 나간 경우다. false면
 * setCenter로 즉시 옮긴다 — 우리가 프로그램적으로 화면을 맞추는 중이라 애니메이션이 불필요하다.
 */
function clampMapCenterIntoKorea(kakao: KakaoNamespace, map: KakaoMap, animate: boolean): void {
  const current = map.getCenter();
  const clamped = clampPointToBox(
    { lat: current.getLat(), lng: current.getLng() },
    KOREA_PAN_BOUNDS,
  );
  if (!clamped) {
    return;
  }
  const target = new kakao.maps.LatLng(clamped.lat, clamped.lng);
  if (animate) {
    map.panTo(target);
  } else {
    map.setCenter(target);
  }
}

/**
 * bounds에 맞춰 지도를 이동시키고, 그래도 화면 밖에 남은 Record 수를 돌려준다.
 *
 * 최대 축소 상한은 여기서 계산하지 않는다 — Map 생성 옵션 maxLevel로 SDK에 맡겼고, setBounds에도
 * 그대로 적용된다(실측 확인). 대신 상한 때문에 담기지 못한 기록이 생기므로, 실제 뷰포트를 읽어
 * 밖에 남은 개수를 세는 방식으로 바꿨다. 상한에 걸리지 않았다면 fitBounds가 전부 담았으므로 0이다.
 *
 * setBounds가 상한에 걸리면 중심이 유효 범위 밖(실측: 위도 140N)으로 튀기도 해서, 개수를 세기
 * 전에 중심을 한반도 범위 안으로 되돌린다.
 *
 * recenterOnMedian은 그 다음 중심을 어디에 둘지만 정한다. true면 기록이 몰린 쪽(중앙값)으로
 * 옮긴다 — fitBounds가 잡아준 중심은 기록이 하나도 없는 지역일 수 있어서다(getMedianPoint 주석).
 * false면 그대로 둬 "전체를 최대한 담는" 화면이 된다 — 안내 배지의 "전체 보기"가 이 경로를 쓴다.
 * 근거: Jira S15P11A705-307 후속 요구사항.
 */
function fitMapToRecords(
  kakao: KakaoNamespace,
  map: KakaoMap,
  bounds: RecordMapBbox,
  items: readonly RecordMapItem[],
  recenterOnMedian: boolean,
  insets: MapViewInsets,
): number {
  const sw = new kakao.maps.LatLng(bounds.swLat, bounds.swLng);
  const ne = new kakao.maps.LatLng(bounds.neLat, bounds.neLng);
  const padding = getFitPadding(FIT_BOUNDS_PADDING, insets);
  map.setBounds(
    new kakao.maps.LatLngBounds(sw, ne),
    padding.top,
    padding.right,
    padding.bottom,
    padding.left,
  );
  clampMapCenterIntoKorea(kakao, map, false);

  if (countPointsOutsideViewport(items, readVisibleViewport(map, insets)) === 0) {
    return 0;
  }
  if (recenterOnMedian) {
    const center = getMedianPoint(items);
    if (center) {
      centerOnVisibleArea(kakao, map, center, insets, false);
    }
  }
  return countPointsOutsideViewport(items, readVisibleViewport(map, insets));
}

// SDK 스크립트 로드 상태. "지도 인스턴스가 준비됐다"와는 다른 사실이며, 오직 오버레이 문구와
// 컨트롤 버튼 표시 여부(아래 isKakaoMapsSdkReady 주석)만 결정한다. 지도를 실제로 조작하는
// effect·핸들러는 이 값이 아니라 map 인스턴스 state를 본다 — 둘을 섞으면 "SDK는 ready인데
// 인스턴스는 아직 null"인 구간에서 effect가 early return한 뒤 다시 돌 기회를 잃는다.
// 근거: Jira S15P11A705-346.
type SdkStatus = 'loading' | 'ready' | 'error';

// loadKakaoMaps()는 SDK를 1회만 로드하는 module-level 싱글턴이라, "SDK는 이미 로드돼 있는데
// RecordMapView가 (StrictMode든 다른 원인이든) 다시 mount"되는 경우 sdkStatus를 'loading'부터 다시
// 시작하면 이미 로드된 지도를 다시 그릴 필요가 없는데도 줌/내 주변 버튼이 잠깐 사라졌다 나타나는
// 결과로 이어진다. 아래 useState 초기값에서 이 상태를 확인해 그 구간 자체를 없앤다.
function isKakaoMapsSdkReady(): boolean {
  return typeof window !== 'undefined' && !!window.kakao?.maps;
}

interface RecordMapViewProps {
  /**
   * 마커 클릭 시 동작을 오버라이드한다. 전달하지 않으면 기본값으로 /records/$recordId로 이동한다.
   * HomePage(166)는 이 prop으로 RecordDetailOverlay를 여는 동작을 주입한다.
   */
  onMarkerClick?: (recordId: number) => void;
  /**
   * 컨테이너 상단이 다른 레이어에 가려지는 높이(px). 홈은 히어로 오버레이가 배경 지도의 위쪽을
   * 덮으므로 그 높이를 넘긴다(HomePage). 기본값 0이면 컨테이너 전체가 보이는 것으로 계산해
   * 오버레이가 없는 화면은 기존 동작 그대로다. 근거: Jira S15P11A705-325.
   */
  topObstructionPx?: number;
  /**
   * 마커 목록이 이 Record를 담게 되는 즉시 해당 좌표로 지도를 옮긴다. Record를 새로 저장한 직후
   * 방금 만든 핀을 사용자가 직접 찾지 않아도 되게 하는 용도다. 이동을 마치면
   * onFocusRecordHandled로 알려, 호출부가 값을 비워 같은 요청이 반복되지 않게 한다.
   */
  focusRecordId?: number | null;
  onFocusRecordHandled?: () => void;
}

/** 내 Record를 지도 마커로 조회하는 화면. 근거: docs/reference/08_API_명세.md 4.2. */
export function RecordMapView({
  onMarkerClick,
  topObstructionPx = 0,
  focusRecordId = null,
  onFocusRecordHandled,
}: RecordMapViewProps = {}) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const createdMapRef = useRef<KakaoMap | null>(null);
  const markersRef = useRef<KakaoCustomOverlay[]>([]);
  const hasFitInitialBoundsRef = useRef(false);

  /**
   * 계산 시점의 컨테이너 크기를 함께 읽는다. 높이는 렌더 후에야 정해지고 창 크기에 따라 변해서
   * state로 들고 있기보다 쓰는 순간 실측하는 편이 어긋날 여지가 없다.
   */
  const readInsets = useCallback(
    (): MapViewInsets => ({
      topObstructionPx,
      containerHeightPx: containerRef.current?.clientHeight ?? 0,
    }),
    [topObstructionPx],
  );

  const [sdkStatus, setSdkStatus] = useState<SdkStatus>(() =>
    isKakaoMapsSdkReady() ? 'ready' : 'loading',
  );
  /**
   * 생성된 kakao.maps.Map 인스턴스. ref가 아니라 state로 들어야 한다 — 지도 생성은 비동기라
   * 인스턴스가 생기는 시점이 렌더 밖이고, ref에 담으면 그 사실이 리렌더를 일으키지 못해 마커·이동·
   * 리스너 effect가 다시 돌 기회를 잃는다. 실제로 홈 → 탐색 → 홈 재마운트에서, 인스턴스를 ref에
   * 담던 이전 구조는 sdkStatus 초기값이 곧바로 'ready'(SDK가 이미 로드돼 있으므로)인데 ref는 새로
   * 만들어져 null이라 마커 effect가 가드에 걸려 early return했고, 이후 setSdkStatus('ready')가 같은
   * 값이라 리렌더도 없고 data는 캐시에서 즉시 와 deps도 안 바뀌어 마커가 영영 그려지지 않았다.
   * 근거: Jira S15P11A705-346(GitHub front#128).
   */
  const [map, setMap] = useState<KakaoMap | null>(null);
  // "내 주변" 클릭 → 응답 대기 중에만 true. 실패해도 별도 에러 상태 없이 조용히 false로 돌아간다.
  const [locating, setLocating] = useState(false);
  // 최대 축소 상한에 걸려 화면 밖으로 밀려난 Record 수. 0이면 안내 배지를 띄우지 않는다.
  const [offscreenRecordCount, setOffscreenRecordCount] = useState(0);

  const { data, isLoading, isFetching, isError } = useRecordMapMarkersQuery();

  useEffect(() => {
    // React StrictMode(dev)는 mount 시 이 effect를 setup→cleanup→setup 순으로 두 번 호출한다.
    // 아래 cancelled 플래그만으로는 "SDK가 이미 로드돼 있어 loadKakaoMaps()가 즉시 resolve되는" 경우를
    // 못 막는다 — 두 번째 setup의 .then()도 cancelled=false로 정상 진입해, 가드가 없으면 같은
    // containerRef에 kakao.maps.Map을 두 개 만들어 리스너가 겹치고 줌/내 주변 버튼이 잠깐 나타났다
    // 사라지는 현상으로 이어졌다(마운트마다 다시 그려지는 지도와 새 Map 인스턴스가 서로 덮어씀).
    // 근거: Jira S15P11A705-307.
    //
    // 이 가드만은 map state가 아니라 ref로 남긴다 — 두 setup 사이에는 렌더가 끼지 않아 첫 .then()의
    // setMap()이 아직 반영되기 전에 두 번째 .then()이 실행되므로, state를 읽으면 여전히 null이라
    // 중복 생성을 막지 못한다. 이 ref는 "이미 만들었다"는 생성 래치일 뿐이고 지도를 다루는 쪽은
    // 어디서도 읽지 않는다(읽는 순간 다시 두 개의 진실이 된다). 근거: Jira S15P11A705-346.
    if (createdMapRef.current) {
      return;
    }
    let cancelled = false;
    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !containerRef.current || createdMapRef.current) {
          return;
        }
        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
          level: INITIAL_ZOOM_LEVEL,
          // 최대 축소 제한은 SDK에 맡긴다. 우리가 zoom_changed에서 되돌리던 방식은 우리 핸들러를
          // 거치는 경로(줌 버튼)만 확실히 막았고 트랙패드 핀치줌은 그대로 빠져나갔다. maxLevel은
          // 줌 버튼·휠·핀치·setLevel·setBounds 어느 경로든 SDK 안에서 강제된다(실측 확인).
          maxLevel: MAX_ZOOM_OUT_LEVEL,
        });
        createdMapRef.current = map;
        setMap(map);
        setSdkStatus('ready');
      })
      .catch(() => {
        if (!cancelled) {
          setSdkStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const kakao = window.kakao;
    if (!map || !kakao || !data) {
      return;
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = data.items.map((item) => {
      const element = createRecordMarkerElement(
        getRecordMarkerAsset(item.latestCollectionId ?? null),
        item.name,
      );
      element.addEventListener('click', () => {
        if (onMarkerClick) {
          onMarkerClick(item.recordId);
        } else {
          navigate({ to: '/records/$recordId', params: { recordId: item.recordId } });
        }
      });
      return new kakao.maps.CustomOverlay({
        map,
        position: new kakao.maps.LatLng(item.lat, item.lng),
        content: element,
        // yAnchor는 1(엘리먼트 맨 아래)이 아니다 — asset 아래쪽 여백은 내장 그림자 자리라
        // 핀의 실제 뾰족한 끝 비율(RECORD_MARKER_TIP_Y_RATIO)에 맞춰야 좌표와 어긋나지 않는다.
        xAnchor: 0.5,
        yAnchor: RECORD_MARKER_TIP_Y_RATIO,
      });
    });
  }, [data, map, navigate, onMarkerClick, readInsets]);

  /**
   * 최초 응답에만 bounds로 fitBounds 적용. 이후 재검색 결과에는 사용자가 이미 맞춰둔 화면을 유지한다.
   * 마커 effect와 한 몸이었으나 별도 effect로 분리했다 — 마커를 그리는 일(외부 시스템 동기화)과
   * 화면을 맞춘 결과를 배지 상태로 되돌리는 일(setState)은 서로 다른 관심사고, 한 effect 안에서
   * 섞으면 react-hooks/set-state-in-effect가 걸린다. 실행 순서는 그대로다(선언 순서대로 마커가 먼저).
   * 근거: Jira S15P11A705-346.
   */
  useEffect(() => {
    const kakao = window.kakao;
    if (!map || !kakao || !data || hasFitInitialBoundsRef.current) {
      return;
    }
    // bounds가 null(저장된 기록 없음)이어도 가드는 세우고 배지는 0으로 둔다 — 분리 전과 같이
    // "최초 응답 1회"라는 의미를 유지하기 위해서다. 여기서 세우지 않으면 이후 재검색 결과에
    // bounds가 생기는 순간 사용자가 맞춰둔 화면(과 저장 직후 focusRecordId panTo)을 밀어내고
    // fitBounds가 다시 걸린다. 0은 마운트 초기값과 같아 이 경우 화면상 변화가 없다.
    hasFitInitialBoundsRef.current = true;
    setOffscreenRecordCount(
      data.bounds ? fitMapToRecords(kakao, map, data.bounds, data.items, true, readInsets()) : 0,
    );
  }, [data, map, readInsets]);

  /**
   * 새로 저장한 Record로 이동. 최초 진입 fitBounds(hasFitInitialBoundsRef)와 섞이지 않게 별도
   * effect로 둔다 — 저장은 이미 지도를 한 번 맞춘 뒤에 일어나고, 그 가드를 건드리면 이후 재검색
   * 결과에서 사용자가 맞춰둔 화면이 초기화된다.
   *
   * 마커 목록에 아직 그 Record가 없으면(캐시 무효화 후 재조회 전) 아무것도 하지 않고 다음 data를
   * 기다린다. 저장 직후에는 좌표를 이미 알고 있지만 굳이 함께 넘기지 않는 이유는, 마커가 그려지기
   * 전에 먼저 이동하면 빈 지도만 보이기 때문이다.
   */
  useEffect(() => {
    const kakao = window.kakao;
    if (!map || !kakao || focusRecordId === null || !data) {
      return;
    }
    const target = data.items.find((item) => item.recordId === focusRecordId);
    if (!target) {
      return;
    }
    // 배지(offscreenRecordCount)는 건드리지 않는다. panTo는 애니메이션이라 직후에 뷰포트를 읽으면
    // 이동 전 값이 나오고, 애초에 이 배지는 최초 fitBounds와 "전체 보기"에서만 갱신하는 값이다
    // (사용자가 지도를 끌고 다닌 뒤에도 그대로인 기존 동작).
    centerOnVisibleArea(kakao, map, target, readInsets(), true);
    onFocusRecordHandled?.();
  }, [data, map, focusRecordId, onFocusRecordHandled, readInsets]);

  // 지도 이동 범위 제한. 카카오 SDK에는 이동 가능 영역을 막는 옵션이 없어(Map.prototype 조사:
  // setMaxLevel/setMinLevel은 있지만 bounds 제한 API는 없다) 직접 되돌린다.
  // dragend는 드래그(마우스·터치·트랙패드 두 손가락 스크롤)로 끌고 나간 경우를, zoom_changed는
  // 포인터 위치를 기준으로 확대/축소하면서 중심이 밀려나는 경우를 각각 잡는다. 두 이벤트 모두
  // 조작이 끝난 뒤에 불려서 진행 중인 제스처와 다투지 않는다. panTo가 만드는 이동은 되돌린
  // 지점이 이미 범위 안이라 다시 걸리지 않는다.
  useEffect(() => {
    const kakao = window.kakao;
    if (!map || !kakao) {
      return;
    }
    const clampCenter = () => clampMapCenterIntoKorea(kakao, map, true);
    kakao.maps.event.addListener(map, 'dragend', clampCenter);
    kakao.maps.event.addListener(map, 'zoom_changed', clampCenter);
    return () => {
      kakao.maps.event.removeListener(map, 'dragend', clampCenter);
      kakao.maps.event.removeListener(map, 'zoom_changed', clampCenter);
    };
  }, [map]);

  // 카카오맵 레벨은 숫자가 작을수록 확대된 상태다. SDK 기본 ZoomControl 대신 브랜드 톤 커스텀
  // 버튼 두 개로 map.setLevel()을 직접 호출한다(kakaoMaps.ts에 ZoomControl 타입 없음).
  function handleZoomIn() {
    if (!map) {
      return;
    }
    map.setLevel(map.getLevel() - 1);
  }

  function handleZoomOut() {
    if (!map) {
      return;
    }
    // 상한을 넘는 값을 넘겨도 SDK(maxLevel)가 알아서 막는다 — 여기서 따로 clamp하지 않는다.
    map.setLevel(map.getLevel() + 1);
  }

  // 안내 배지 클릭 → "전체 보기". 상한(MAX_ZOOM_OUT_LEVEL)을 해제하는 것이 아니라, 상한 안에서
  // 갈 수 있는 가장 축소된 화면으로 이동한다 — 중앙값 재중심 없이 전체 bounds 중심을 그대로 써서
  // 최대한 많은 기록이 한 화면에 들어오게 한다. 저장되는 장소는 국내로 한정돼 있어(비즈니스 규칙)
  // 전체 bounds 중심이 빈 지역이 될 일이 없고, 상한 레벨 13이 한반도 전체를 덮으므로 이 화면이
  // 실질적인 "전체"다. 그래서 클릭 후에는 배지를 숨긴다.
  function handleShowAllRecords() {
    const kakao = window.kakao;
    if (!map || !kakao || !data?.bounds) {
      return;
    }
    fitMapToRecords(kakao, map, data.bounds, data.items, false, readInsets());
    setOffscreenRecordCount(0);
  }

  // 권한 거부·조회 실패 시 에러를 던지지 않고 DEFAULT_CENTER 폴백을 유지한 채 조용히 무시한다.
  // 별도 토스트/모달 없이 버튼 텍스트를 잠깐 바꾸는 정도로만 피드백한다.
  function handleLocateMe() {
    if (!map || !navigator.geolocation) {
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const kakao = window.kakao;
        if (!kakao) {
          return;
        }
        map.setCenter(new kakao.maps.LatLng(position.coords.latitude, position.coords.longitude));
      },
      () => {
        setLocating(false);
      },
    );
  }

  let apiStatusMessage: string | null = null;
  if (isLoading) {
    apiStatusMessage = '기록을 불러오는 중입니다…';
  } else if (isError) {
    apiStatusMessage = '기록을 불러오지 못했습니다.';
  } else if (data && data.items.length === 0) {
    // items: []는 오류가 아니라 정상 응답이다(AGENTS.md 절대 금지 4 — keywords: []와 동일한 취급 원칙).
    apiStatusMessage = '저장된 기록이 없습니다.';
  }

  return (
    <div className="relative h-full w-full">
      {/* isolate(= isolation: isolate)가 반드시 있어야 한다. 카카오 지도 SDK는 이 컨테이너 안에
          position:absolute + z-index:1~2인 내부 레이어(타일·오버레이 등 실측 7개)를 직접 만든다.
          컨테이너가 stacking context가 아니면 그 z-index들이 문서 최상위 stacking context로
          그대로 새어 나가, z-index를 지정하지 않은(=auto) 형제 요소보다 위에 그려진다. 그 결과
          ① 아래 줌·"내 주변" 버튼과 로딩/에러 오버레이가 지도 타일에 덮여 보이지 않고(지도가
          그려지는 순간 사라지는 "깜빡임"으로 관측됐다), ② HomePage가 이 컴포넌트 위에 얹는
          그라데이션+블러 오버레이도 지도에 덮여 전혀 나타나지 않았다. isolate로 SDK 내부
          z-index를 이 컨테이너 안에 가둬 두 증상을 함께 없앤다. 근거: Jira S15P11A705-307. */}
      <div ref={containerRef} className="isolate h-full w-full" />

      {sdkStatus === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-paper-white/90 text-sm text-ink-gray">
          지도를 불러오는 중입니다…
        </div>
      )}
      {sdkStatus === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-paper-white/90 text-sm text-ink-gray">
          카카오 지도를 불러오지 못했습니다.
        </div>
      )}

      {sdkStatus === 'ready' && apiStatusMessage && (
        <div className="absolute left-4 top-4 rounded-lg border border-line-card bg-snow-white px-4 py-2 text-xs font-semibold text-pin-navy shadow">
          {apiStatusMessage}
        </div>
      )}
      {sdkStatus === 'ready' && isFetching && !isLoading && (
        <div className="absolute right-4 top-4 rounded-lg border border-line-card bg-snow-white px-4 py-2 text-xs font-semibold text-pin-navy shadow">
          다시 불러오는 중입니다…
        </div>
      )}

      {/* 최대 축소 캡 때문에 화면에 안 들어온 기록이 있을 때만 뜨는 안내 배지. "내 주변" 버튼
          (bottom-10, 높이 44px)의 바로 위 bottom-24에 둬 서로 겹치지 않는다. 누르면 캡을 버리고
          전체 fitBounds로 돌아가며, 그 시점부터 화면 밖 기록이 없으므로 배지 자체가 사라진다. */}
      {sdkStatus === 'ready' && offscreenRecordCount > 0 && (
        <button
          type="button"
          onClick={handleShowAllRecords}
          className="absolute bottom-24 left-8 rounded-full border border-line-card bg-snow-white px-4 py-2 text-xs font-bold text-pin-navy shadow-lg transition-colors hover:border-log-mint hover:text-log-mint"
        >
          화면 밖 장소 {offscreenRecordCount}개
        </button>
      )}

      {sdkStatus === 'ready' && (
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locating}
          className="absolute bottom-10 left-8 rounded-full border border-line-card bg-snow-white px-5 py-3 text-sm font-bold text-pin-navy shadow-lg transition-colors enabled:hover:border-log-mint enabled:hover:text-log-mint disabled:cursor-not-allowed"
        >
          {locating ? '위치 찾는 중…' : '내 주변'}
        </button>
      )}

      {sdkStatus === 'ready' && (
        <div className="absolute bottom-10 right-8 flex flex-col overflow-hidden rounded-2xl border border-line-card bg-snow-white shadow-lg">
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label="지도 확대"
            className="flex h-11 w-11 items-center justify-center text-xl font-bold text-pin-navy transition-colors hover:bg-log-mint/10 hover:text-log-mint"
          >
            +
          </button>
          <div className="h-px w-full bg-line-card" />
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="지도 축소"
            className="flex h-11 w-11 items-center justify-center text-xl font-bold text-pin-navy transition-colors hover:bg-log-mint/10 hover:text-log-mint"
          >
            −
          </button>
        </div>
      )}
    </div>
  );
}
