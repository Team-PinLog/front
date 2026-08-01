import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { loadKakaoMaps, type KakaoMap, type KakaoMarker } from '@/shared/lib/kakaoMaps';
import { useRecordMapMarkersQuery } from '../hooks/useRecordMapMarkersQuery';
import type { RecordMapBbox } from '../api/getRecordMapMarkers';

// 마커가 없을 때(최초 SDK 로드 등) 지도 기본 중심(서울시청). KakaoPlaceMap.tsx와 동일 기본값.
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };

// 최초 진입 fitBounds 여유(px). 근거: docs/reference/08_API_명세.md 4.2
// "fitBounds(bounds, padding)으로 모든 마커가 한눈에 보이는 최소 화면(여유 포함)을 만든다."
// 경계에 걸친 마커 아이콘이 뷰포트 가장자리에서 잘리지 않도록 사방에 동일하게 적용한다.
const FIT_BOUNDS_PADDING = 48;

// 지도 생성 직후(fitBounds 적용 전)와 bounds가 null(저장된 기록 없음)일 때 유지되는 고정 줌 레벨.
// 카카오맵 레벨 6 ≈ 반경 500m. 근거: Jira S15P11A705-237 — 기존 레벨 7(약 1km 반경)이 초기
// 진입 시 지나치게 넓게 보인다는 리포트에 따라 축소. bounds가 있는 경우는 docs/api-contract.md
// "Place · 지도 · 검색"에 fitBounds 사용이 확정돼 있어 이 값과 무관하게 fitBounds가 우선 적용된다.
const INITIAL_ZOOM_LEVEL = 6;

type SdkStatus = 'loading' | 'ready' | 'error';

interface RecordMapViewProps {
  /**
   * 마커 클릭 시 동작을 오버라이드한다. 전달하지 않으면 기본값으로 /records/$recordId로 이동한다.
   * HomePage(166)는 이 prop으로 RecordDetailOverlay를 여는 동작을 주입한다.
   */
  onMarkerClick?: (recordId: number) => void;
}

/** 내 Record를 지도 마커로 조회하는 화면. 근거: docs/reference/08_API_명세.md 4.2. */
export function RecordMapView({ onMarkerClick }: RecordMapViewProps = {}) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markersRef = useRef<KakaoMarker[]>([]);
  const hasFitInitialBoundsRef = useRef(false);

  const [sdkStatus, setSdkStatus] = useState<SdkStatus>('loading');
  // 드래그/줌으로 지도 범위가 바뀌었는지만 상태로 들고, 버튼 노출 여부는 렌더 시점에 파생한다.
  const [dragged, setDragged] = useState(false);

  const { data, isLoading, isFetching, isError, refetchWithBbox } = useRecordMapMarkersQuery();

  useEffect(() => {
    let cancelled = false;
    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !containerRef.current) {
          return;
        }
        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
          level: INITIAL_ZOOM_LEVEL,
        });
        mapRef.current = map;
        // 지도 이동/줌 변경은 즉시 재조회하지 않고 "이 지역에서 재검색" 버튼만 노출한다.
        kakao.maps.event.addListener(map, 'dragend', () => setDragged(true));
        kakao.maps.event.addListener(map, 'zoom_changed', () => setDragged(true));
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
    const map = mapRef.current;
    const kakao = window.kakao;
    if (sdkStatus !== 'ready' || !map || !kakao || !data) {
      return;
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = data.items.map((item) => {
      const marker = new kakao.maps.Marker({
        map,
        position: new kakao.maps.LatLng(item.lat, item.lng),
        title: item.name,
      });
      kakao.maps.event.addListener(marker, 'click', () => {
        if (onMarkerClick) {
          onMarkerClick(item.recordId);
        } else {
          navigate({ to: '/records/$recordId', params: { recordId: item.recordId } });
        }
      });
      return marker;
    });

    // 최초 응답에만 bounds로 fitBounds 적용. 이후 재검색 결과에는 사용자가 이미 맞춰둔 화면을 유지한다.
    if (!hasFitInitialBoundsRef.current) {
      if (data.bounds) {
        const sw = new kakao.maps.LatLng(data.bounds.swLat, data.bounds.swLng);
        const ne = new kakao.maps.LatLng(data.bounds.neLat, data.bounds.neLng);
        map.setBounds(
          new kakao.maps.LatLngBounds(sw, ne),
          FIT_BOUNDS_PADDING,
          FIT_BOUNDS_PADDING,
          FIT_BOUNDS_PADDING,
          FIT_BOUNDS_PADDING,
        );
      }
      hasFitInitialBoundsRef.current = true;
    }
  }, [data, sdkStatus, navigate, onMarkerClick]);

  function handleResearch() {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const bbox: RecordMapBbox = {
      swLat: sw.getLat(),
      swLng: sw.getLng(),
      neLat: ne.getLat(),
      neLng: ne.getLng(),
    };
    setDragged(false);
    void refetchWithBbox(bbox);
  }

  // 드래그/줌으로 범위가 바뀌었거나 직전 조회가 실패했으면 재검색 버튼을 보여준다.
  // 실패 시에는 dragged를 false로 리셋하지 않으므로 isError만으로도 계속 노출된다.
  const showResearchButton = dragged || isError;

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
      <div ref={containerRef} className="h-full w-full" />

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
        <div className="absolute left-4 top-4 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-ink-gray shadow">
          {apiStatusMessage}
        </div>
      )}
      {sdkStatus === 'ready' && isFetching && !isLoading && (
        <div className="absolute right-4 top-4 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-ink-gray shadow">
          다시 불러오는 중입니다…
        </div>
      )}

      {sdkStatus === 'ready' && showResearchButton && (
        <button
          type="button"
          onClick={handleResearch}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-pin-navy px-5 py-2.5 text-sm font-bold text-white shadow-lg"
        >
          이 지역에서 재검색
        </button>
      )}
    </div>
  );
}
