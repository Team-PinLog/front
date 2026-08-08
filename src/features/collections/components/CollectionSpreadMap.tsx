import { useEffect, useRef, useState } from 'react';
import {
  getRecordMarkerAsset,
  RECORD_MARKER_ASSET_HEIGHT,
  RECORD_MARKER_ASSET_WIDTH,
  RECORD_MARKER_TIP_Y_RATIO,
} from '@/shared/lib/getRecordMarkerAsset';
import { loadKakaoMaps, type KakaoCustomOverlay, type KakaoMap } from '@/shared/lib/kakaoMaps';
import {
  applyRecordMarkerPinState,
  createRecordMarkerImage,
} from '@/shared/lib/recordMarkerElement';

// 332 디자인 피드백: 카카오 기본 마커(빨간 핀) 대신 홈 지도와 같은 핀 SVG를 쓴다.
// 색은 이 Collection의 배정색 하나로 통일한다 — 이 지도에 찍히는 핀은 전부 같은 Collection의
// 기록이라 색으로 나눌 것이 없고, 오히려 "이 책의 장소들"이라는 한 덩어리로 읽혀야 한다.
// 지금 보고 있는 record만 크기·불투명도로 앞세우고, 나머지는 같은 색을 옅게 깔아 배경으로 물린다
// (사용자 지시: "메인 record는 조금 더 포인트 있는 색, 나머지는 덜 포인트 있는 동일한 색").
const ACTIVE_MARKER_WIDTH = RECORD_MARKER_ASSET_WIDTH / 2;
const ACTIVE_MARKER_HEIGHT = RECORD_MARKER_ASSET_HEIGHT / 2;
// 비활성 핀은 "배경으로 물러나 있되 또렷하게 읽히는" 정도다 — 처음 값(0.75 / 0.45)은 너무 흐려
// 핀이 지워진 것처럼 보였고, 두 번의 피드백을 거쳐 여기까지 올렸다. 활성과의 대비는 크기로도
// 주고 있어서 불투명도를 이 이상 올려도 구분은 유지된다.
const IDLE_MARKER_SCALE = 0.9;
const IDLE_MARKER_OPACITY = 0.85;

/**
 * CustomOverlay에 올릴 핀 엘리먼트.
 *
 * 417: 핀 <img>를 만드는 일은 shared/lib/recordMarkerElement가 맡는다 — 예전에는 이 함수가
 * RecordMapView의 것을 손으로 베껴 왔고(그쪽 함수가 export되지 않아서), 그 과정에서 Tailwind
 * preflight 함정 같은 것이 한 번 더 재현된 이력이 있다. 호버 반응도 여기에만 있었다(불투명도
 * 100%). 이제 커서·호버·포커스는 공유 규칙(.record-map-pin)이 정하고, 이 함수에 남은 것은 이
 * 화면 고유의 크기·불투명도 결정뿐이다.
 */
function createSpreadMarkerElement(
  assetUrl: string,
  title: string,
  isActive: boolean,
  onSelect: (() => void) | null,
) {
  const scale = isActive ? 1 : IDLE_MARKER_SCALE;
  const image = createRecordMarkerImage({
    assetUrl,
    title,
    widthPx: Math.round(ACTIVE_MARKER_WIDTH * scale),
    heightPx: Math.round(ACTIVE_MARKER_HEIGHT * scale),
    onSelect: onSelect ?? undefined,
  });
  // 비활성 핀은 평소 옅게 깔려 배경으로 물러난다. 호버·포커스에서 1로 올라오는 것은 공유 규칙이
  // 담당한다 — 눌러 갈 수 있는 핀이라는 신호다.
  applyRecordMarkerPinState(image, {
    opacity: isActive ? 1 : IDLE_MARKER_OPACITY,
  });
  return image;
}

// 마커가 없을 때(최초 SDK 로드 등) 지도 기본 중심(서울시청). KakaoPlaceMap.tsx와 동일 기본값.
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
// 지도 최초 생성 시의 레벨. 마커가 아직 없을 때(SDK 로드 직후) 잠깐 보이는 값이라, 그 뒤에는 아래
// 두 규칙 중 하나가 항상 덮어쓴다.
const INITIAL_LEVEL = 6;
// record 장의 확대 레벨. 근거: Jira S15P11A705-332 디자인 피드백 — 원래는 "Collection 전체를 둘러보기
// 좋은 고정 레벨(6, 축척 500m)"을 유지한 채 setCenter만 했는데(171 논의), 그 레벨에서는 장소가
// 동네 단위로만 보여 "이 장소의 기록"이라는 페이지 성격과 맞지 않았다. 이제 record 장에서는 훨씬
// 가깝게 당긴다(3 = 축척 50m, 거리 수준). Collection 전체 조망은 목차 장의 fitBounds가 전담한다(245)
// — 두 역할을 한 레벨로 겸하던 것을 장(page)별로 나눈 것이다.
const ACTIVE_RECORD_LEVEL = 3;
// 목차(fitAllBounds=true) 장에서는 위 레벨 대신 전체 좌표 fitBounds를 적용한다(245).
// 목차 페이지 fitBounds 여유(px). RecordMapView.tsx의 FIT_BOUNDS_PADDING과 동일한 근거
// (docs/reference/08_API_명세.md 4.2) — 다른 화면이지만 "여백 포함 fitBounds" 의미가 같아 같은 값을 쓴다.
const FIT_BOUNDS_PADDING = 48;

type SdkStatus = 'loading' | 'ready' | 'error';

export interface CollectionSpreadMapPlace {
  recordId: number;
  name: string;
  lat: number;
  lng: number;
}

interface CollectionSpreadMapProps {
  // 핀 색을 고르는 데 쓴다 — 이 Collection에 배정된 색 하나로 모든 핀을 칠한다(getRecordMarkerAsset).
  collectionId: number;
  places: CollectionSpreadMapPlace[];
  activeRecordId: number | null;
  // 호출부(CollectionDetailView)가 Collection의 모든 record를 자동으로 전부 로드하는 동안 true다.
  // 이 동안 places는 항상 빈 배열로 전달돼(핀이 하나씩 느는 방식을 피하려는 의도) "장소 없음"과
  // "아직 불러오는 중"을 구분해서 안내해야 한다.
  isLoadingAll: boolean;
  // true면 활성 record 중심의 고정 레벨 대신 places 전체 좌표를 감싸는 fitBounds를 적용한다.
  // 목차(CollectionToc) 페이지 전용 모드다. 근거: Jira S15P11A705-245.
  fitAllBounds: boolean;
  // 핀 클릭 시 그 record 장으로 넘긴다. 넘기지 않으면 핀은 클릭·호버 반응이 없는 표시 전용이 된다.
  onSelectPlace?: (recordId: number) => void;
}

/**
 * Collection 상세(플립북)의 왼쪽 페이지 지도. 근거: Jira S15P11A705-171, S15P11A705-245.
 * KakaoPlaceMap.tsx(단일 마커 전용)를 재사용하지 않고 새로 만든다 — 이 화면은 로드된 모든 record 위치를
 * 고정 마커로 유지한 채, 현재 오른쪽 페이지의 record만 강조 마커(CustomOverlay)로 구분해야 해서
 * 다중 마커 렌더링이 필요하다(마커 배열 관리는 features/map/components/RecordMapView.tsx 패턴 참고,
 * 단 이 화면은 클릭 인터랙션이 없다). 목차 페이지(fitAllBounds)에서는 같은 마커 위에 fitBounds만
 * RecordMapView.tsx의 setBounds+padding 패턴을 그대로 적용한다.
 */
export function CollectionSpreadMap({
  collectionId,
  places,
  activeRecordId,
  isLoadingAll,
  fitAllBounds,
  onSelectPlace,
}: CollectionSpreadMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  // 332: 활성/비활성이 모두 같은 종류(CustomOverlay + 핀 <img>)가 되면서 목록 하나로 합쳤다 —
  // 예전에는 비활성만 kakao.maps.Marker, 활성만 CustomOverlay라 ref를 둘로 나눠 관리했다.
  const markersRef = useRef<KakaoCustomOverlay[]>([]);
  const [status, setStatus] = useState<SdkStatus>('loading');
  // 핀은 React 트리 밖 DOM에 이벤트를 직접 붙이므로, 콜백을 effect 의존성에 넣으면 부모가 매 렌더
  // 새 함수를 넘길 때마다 마커 전체가 다시 생성된다. 최신 콜백만 ref로 들고 클릭 시점에 읽는다.
  const onSelectPlaceRef = useRef(onSelectPlace);
  useEffect(() => {
    onSelectPlaceRef.current = onSelectPlace;
  });
  // 356: "지금 이 장에서 지도를 어떻게 맞춰야 하는가"(크기 재계산 + 중앙 정렬)를 담아두는 ref.
  // 아래 마커 effect가 매번 최신 규칙으로 갱신하고, 컨테이너 리사이즈 감시가 그것을 다시 부른다.
  const applyViewportRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !containerRef.current) {
          return;
        }
        mapRef.current = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
          level: INITIAL_LEVEL,
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

    markersRef.current.forEach((marker) => marker.setMap(null));
    const markerAsset = getRecordMarkerAsset(collectionId);
    // 활성 핀을 마지막에 만들어 같은 자리에서 다른 핀 위에 오도록 한다(CustomOverlay는 생성 순서대로 쌓인다).
    const orderedPlaces = [
      ...places.filter((place) => place.recordId !== activeRecordId),
      ...places.filter((place) => place.recordId === activeRecordId),
    ];
    markersRef.current = orderedPlaces.map((place) => {
      // 418: 강조를 뷰포트 규칙(fitAllBounds)에서 **떼어냈다**. 목차 장이 사라지고 좌측 포스터가
      // 늘 "이 컬렉션의 장소들 전체"를 담게 되면서, 전체를 보여주면서도 지금 펼친 장을 앞세워야
      // 하는 상태가 기본이 됐다 — 두 규칙을 한 플래그로 겸하던 것을 나눈다.
      const isActive = place.recordId === activeRecordId;
      return new kakao.maps.CustomOverlay({
        map,
        position: new kakao.maps.LatLng(place.lat, place.lng),
        content: createSpreadMarkerElement(markerAsset, place.name, isActive, () =>
          onSelectPlaceRef.current?.(place.recordId),
        ),
        // yAnchor가 1(엘리먼트 맨 아래)이 아닌 이유는 asset 아래쪽 여백이 내장 그림자 자리이기
        // 때문이다 — 핀의 실제 뾰족한 끝 비율에 맞춰야 좌표와 어긋나지 않는다(홈 지도와 동일).
        xAnchor: 0.5,
        yAnchor: RECORD_MARKER_TIP_Y_RATIO,
      });
    });

    const activePlace = places.find((place) => place.recordId === activeRecordId) ?? null;

    // 356: 이 화면의 지도 컨테이너는 장(page)마다 크기가 달라진다 — 목차 장에서는 속표지 아래
    // 작은 액자(min-h-[180px] + flex-1 + p-1.5)이고 record 장에서는 페이지 전체 높이(h-full)다
    // (CollectionDetailView). 카카오 지도는 컨테이너 크기를 내부에 캐시해 두고 relayout()에서만
    // 다시 읽는데, 이전 구현은 setCenter/setBounds를 **먼저** 하고 relayout()을 마지막에 불렀다.
    // 그래서 중앙 정렬은 옛 크기 기준으로 계산되고, 그 뒤 relayout()이 새 크기를 반영하면서
    // 늘어난 만큼 핀이 중앙에서 밀렸다. 순서를 뒤집어 **크기를 먼저 확정하고 그 다음 중앙을
    // 잡는다** — 카카오 공식 샘플이 relayout() 뒤에 setCenter를 다시 부르는 것과 같은 이유다.
    const applyViewport = () => {
      map.relayout();

      // 목차 페이지: 활성 record 중심이 아니라 places 전체를 감싸는 최소 사각형으로 fitBounds한다.
      // 1개면 sw=ne인 점 사각형이 되는데, 이는 08_API_명세.md 4.2가 문서화한 "1개면 점 사각형" 규칙과
      // 같은 모양이라 RecordMapView.tsx와 동일하게 별도 분기 없이 setBounds에 그대로 넘긴다.
      if (fitAllBounds && places.length > 0) {
        const lats = places.map((place) => place.lat);
        const lngs = places.map((place) => place.lng);
        const sw = new kakao.maps.LatLng(Math.min(...lats), Math.min(...lngs));
        const ne = new kakao.maps.LatLng(Math.max(...lats), Math.max(...lngs));
        map.setBounds(
          new kakao.maps.LatLngBounds(sw, ne),
          FIT_BOUNDS_PADDING,
          FIT_BOUNDS_PADDING,
          FIT_BOUNDS_PADDING,
          FIT_BOUNDS_PADDING,
        );
      } else if (activePlace) {
        // 레벨을 매번 명시적으로 되돌린다 — 목차 장의 fitBounds가 레벨을 바꿔 놓기 때문에, setCenter만
        // 하면 목차를 한 번 거친 뒤부터는 전체 bounds 레벨 그대로 남는다.
        map.setLevel(ACTIVE_RECORD_LEVEL);
        map.setCenter(new kakao.maps.LatLng(activePlace.lat, activePlace.lng));
      }
    };

    applyViewport();
    // 컨테이너 크기가 바뀌는 순간(창 리사이즈 등)에 다시 실행할 수 있도록 최신 규칙을 남겨둔다.
    applyViewportRef.current = applyViewport;
  }, [places, activeRecordId, status, fitAllBounds, collectionId]);

  // 356: 위 effect는 장을 넘기거나 데이터가 바뀔 때만 돈다 — 창 폭을 바꿔 지도 컨테이너만 커지거나
  // 작아지는 경우에는 아무도 relayout()을 부르지 않아, 지도가 옛 크기를 기준으로 그려진 채 남고
  // 핀이 중앙에서 밀린 상태가 유지됐다(티켓 확인 절차 4번). 컨테이너 자체를 관찰해 크기가 바뀔
  // 때마다 같은 규칙(크기 확정 → 중앙 정렬)을 다시 적용한다. window resize 리스너가 아니라
  // ResizeObserver인 이유는, 이 컨테이너가 창 크기와 무관하게 장별 클래스 변화로도 바뀌기 때문이다.
  useEffect(() => {
    const container = containerRef.current;
    if (status !== 'ready' || !container || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(() => applyViewportRef.current?.());
    observer.observe(container);
    return () => observer.disconnect();
  }, [status]);

  const overlayMessage =
    status === 'error'
      ? '카카오 지도를 불러오지 못했습니다.'
      : status === 'loading'
        ? '지도를 불러오는 중입니다…'
        : isLoadingAll
          ? '전체 장소를 불러오는 중입니다…'
          : places.length === 0
            ? '표시할 장소가 없어요.'
            : null;

  return (
    // 418: 테두리·라운드를 뺐다 — 이 지도는 이제 흰 매트 포스터(CollectionMapPoster) 안에 인쇄된
    // 그림이라, 자기 액자를 또 두르면 액자가 두 겹이 된다.
    <div className="relative h-full w-full overflow-hidden bg-[#eae6e0]">
      <div ref={containerRef} className="h-full w-full" />
      {overlayMessage && (
        <div className="absolute inset-0 flex items-center justify-center bg-paper-white/90 px-6 text-center text-xs leading-relaxed text-ink-gray">
          {overlayMessage}
        </div>
      )}
    </div>
  );
}
