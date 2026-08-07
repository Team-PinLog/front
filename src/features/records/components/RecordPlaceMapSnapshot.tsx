import { useEffect, useRef, useState } from 'react';
import { loadKakaoMaps, type KakaoMap, type KakaoCustomOverlay } from '@/shared/lib/kakaoMaps';
import {
  getRecordMarkerAsset,
  RECORD_MARKER_ASSET_HEIGHT,
  RECORD_MARKER_ASSET_WIDTH,
  RECORD_MARKER_TIP_Y_RATIO,
} from '@/shared/lib/getRecordMarkerAsset';

// 폴라로이드 한 장 안에 담기는 지도라 "이 장소 하나"만 읽히면 된다. 4는 KakaoPlaceMap이 선택된
// 장소를 보여줄 때 쓰는 것과 같은 레벨(축척 100m)이다.
const MAP_LEVEL = 4;
// SDK 로드 직후 인스턴스를 만드는 순간의 임시 중심(서울시청). 바로 아래 effect가 실제 좌표로
// 덮어쓴다 — KakaoPlaceMap·CollectionSpreadMap과 같은 처리다(생성 effect가 좌표에 의존하지 않게 해
// 좌표가 바뀌어도 지도를 새로 만들지 않는다).
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };

type MapStatus = 'loading' | 'ready' | 'error';

/* ---------------------------------------------------------------------- *
 * 415-13: 이 지도의 핀을 **앱의 지도 마커 자산**으로 통일한다.
 *
 * 이전에는 `new kakao.maps.Marker(...)`(카카오 기본 빨간 핀)를 썼다. 홈 지도(RecordMapView)와
 * 컬렉션 펼침 지도(CollectionSpreadMap)는 둘 다 `assets/color-markers/*.svg` 20색 자산을
 * CustomOverlay에 올려 쓰고 있어서, 상세 화면만 다른 핀이 찍혀 있었다.
 *
 * 값·문법은 RecordMapView에서 그대로 가져왔다(그 파일은 features/map 소유라 수정하지 않고
 * 읽기만 했다):
 * - 표시 크기는 원본(64x76)의 정확히 1/2 — 비율이 어긋나지 않는다.
 * - `<img src>`로 넣는다. asset 20개가 모두 같은 `<filter id="shadow">`를 갖고 있어 인라인
 *   SVG로 심으면 문서 전체에서 id가 충돌한다(그림자도 asset에 내장돼 있다).
 * - Tailwind preflight의 `img { max-width:100% }` 때문에 폭 0인 오버레이 래퍼 안에서 마커가
 *   0x0으로 찌그러진다 — max-width를 풀고 크기를 인라인으로 못박아야 그려진다.
 * - yAnchor는 1이 아니라 RECORD_MARKER_TIP_Y_RATIO다(asset 아래 여백은 그림자 자리라 바닥을
 *   기준으로 잡으면 핀 끝이 좌표에서 밀린다).
 *
 * 색: `getRecordMarkerAsset(null)` = 미분류 slate. RecordDetail DTO에는 `latestCollectionId`가
 * 없어(11.1 — recordId·place·contexts·keywords·createdAt) 홈 지도처럼 컬렉션 색을 고를 근거가
 * 없다. 없는 값을 지어내지 않고 미분류 자산을 쓴다.
 *
 * 강조: 이 지도에는 핀이 하나뿐이고 그게 "지금 보고 있는 장소"라 홈의 **선택 핀** 상태로 그린다.
 * scale 1.35 + 원점 = 핀 끝, 그리고 선택 시 그림자. 두 값 모두 RecordMapView 안의 모듈 상수라
 * import할 수 없어 같은 값을 여기 적는다(출처: RecordMapView.tsx MARKER_HIGHLIGHT_SCALE/ORIGIN,
 * applyMarkerVisualState).
 * ---------------------------------------------------------------------- */
const MARKER_WIDTH = RECORD_MARKER_ASSET_WIDTH / 2;
const MARKER_HEIGHT = RECORD_MARKER_ASSET_HEIGHT / 2;
const MARKER_HIGHLIGHT_SCALE = 1.35;
const MARKER_HIGHLIGHT_ORIGIN = `50% ${RECORD_MARKER_TIP_Y_RATIO * 100}%`;
const MARKER_HIGHLIGHT_SHADOW = 'drop-shadow(0 6px 10px rgba(4,33,66,0.45))';

/** 선택 상태로 그린 기록 마커 엘리먼트. */
function createSelectedMarkerElement(title: string): HTMLImageElement {
  const image = document.createElement('img');
  image.src = getRecordMarkerAsset(null);
  image.alt = '';
  image.title = title;
  image.draggable = false;
  image.style.display = 'block';
  image.style.maxWidth = 'none';
  image.style.width = `${MARKER_WIDTH}px`;
  image.style.height = `${MARKER_HEIGHT}px`;
  image.style.transformOrigin = MARKER_HIGHLIGHT_ORIGIN;
  image.style.transform = `scale(${MARKER_HIGHLIGHT_SCALE})`;
  image.style.filter = MARKER_HIGHLIGHT_SHADOW;
  return image;
}

interface RecordPlaceMapSnapshotProps {
  lat: number;
  lng: number;
  name: string;
}

/**
 * 373 시안 우상단 폴라로이드에 들어가는 "지도 스냅샷".
 *
 * 정적 지도 이미지(스태틱 맵)가 아니라 JS SDK 지도 인스턴스를 쓴다. 근거:
 * - docs/api-contract.md Place·지도·검색에서 확정된 것은 "프론트가 카카오 JS SDK를 직접 로드"까지다.
 *   스태틱 이미지 API는 계약에 없고, 문서에 없는 엔드포인트를 추측해 붙이지 않는다(AGENTS.md 규칙).
 *   게다가 스태틱 이미지는 REST 키를 이미지 URL 쿼리에 노출하는 방식이라 키 정책도 별개 판단이 필요하다.
 * - 성능상으로도 SDK는 loadKakaoMaps()가 single-flight로 1회만 받아오고 앱 곳곳(홈 지도·컬렉션
 *   펼침 지도)에서 이미 로드돼 캐시된 상태다. 여기서 추가되는 비용은 작은 지도 인스턴스 하나뿐이다.
 *
 * 대신 "스냅샷"처럼 보이도록 상호작용을 막는다 — 드래그·줌은 pointer-events로 차단한다.
 * (SDK의 draggable/zoomable 옵션을 쓰려면 shared/lib/kakaoMaps.ts의 타입 선언을 넓혀야 하는데,
 *  그 파일은 공유 파일이라 수정 전 보고 대상이다. CSS로 같은 결과를 얻을 수 있어 건드리지 않았다.)
 */
export function RecordPlaceMapSnapshot({ lat, lng, name }: RecordPlaceMapSnapshotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markerRef = useRef<KakaoCustomOverlay | null>(null);
  const [status, setStatus] = useState<MapStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !containerRef.current) {
          return;
        }
        mapRef.current = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
          level: MAP_LEVEL,
        });
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const kakao = window.kakao;
    if (status !== 'ready' || !map || !kakao) {
      return;
    }
    const position = new kakao.maps.LatLng(lat, lng);
    // 컨테이너 크기를 먼저 확정하고 중앙을 잡는다 — 순서를 뒤집으면 옛 크기 기준으로 중앙이
    // 계산돼 핀이 밀린다(S15P11A705-356에서 확인된 카카오 지도 동작).
    map.relayout();
    map.setLevel(MAP_LEVEL);
    map.setCenter(position);

    markerRef.current?.setMap(null);
    markerRef.current = new kakao.maps.CustomOverlay({
      map,
      position,
      content: createSelectedMarkerElement(name),
      xAnchor: 0.5,
      yAnchor: RECORD_MARKER_TIP_Y_RATIO,
    });
  }, [lat, lng, name, status]);

  return (
    <div className="relative h-full w-full bg-[#eae6e0]">
      {/* pointer-events 차단으로 드래그·휠 줌이 지도에 닿지 않는다 = 스냅샷처럼 보인다. */}
      <div ref={containerRef} className="pointer-events-none h-full w-full" aria-hidden="true" />
      {status !== 'ready' && (
        <div className="absolute inset-0 grid place-items-center px-3 text-center text-xs leading-relaxed text-[#8a857e]">
          {status === 'error' ? '지도를 불러오지 못했어요' : '지도를 불러오는 중…'}
        </div>
      )}
    </div>
  );
}
