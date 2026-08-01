import { useEffect, useRef, useState } from 'react';
import {
  loadKakaoMaps,
  type KakaoCustomOverlay,
  type KakaoMap,
  type KakaoMarker,
} from '@/shared/lib/kakaoMaps';

// 마커가 없을 때(최초 SDK 로드 등) 지도 기본 중심(서울시청). KakaoPlaceMap.tsx와 동일 기본값.
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
// 스프레드 전환마다 확대 레벨을 바꾸지 않고 고정한다 — 강조 마커로 이동(setCenter)만 하고, 레벨은
// Collection 전체를 둘러보기 좋은 고정값으로 유지한다(구현 단순성 우선. 근거: Jira S15P11A705-171 논의).
// 목차(fitAllBounds=true) 페이지에서는 이 고정 레벨 대신 전체 좌표 fitBounds를 우선 적용한다(245).
const FIXED_LEVEL = 6;
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
  places: CollectionSpreadMapPlace[];
  activeRecordId: number | null;
  // 호출부(CollectionDetailView)가 Collection의 모든 record를 자동으로 전부 로드하는 동안 true다.
  // 이 동안 places는 항상 빈 배열로 전달돼(핀이 하나씩 느는 방식을 피하려는 의도) "장소 없음"과
  // "아직 불러오는 중"을 구분해서 안내해야 한다.
  isLoadingAll: boolean;
  // true면 활성 record 중심의 고정 레벨 대신 places 전체 좌표를 감싸는 fitBounds를 적용한다.
  // 목차(CollectionToc) 페이지 전용 모드다. 근거: Jira S15P11A705-245.
  fitAllBounds: boolean;
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
  places,
  activeRecordId,
  isLoadingAll,
  fitAllBounds,
}: CollectionSpreadMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markersRef = useRef<KakaoMarker[]>([]);
  const activeOverlayRef = useRef<KakaoCustomOverlay | null>(null);
  const [status, setStatus] = useState<SdkStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !containerRef.current) {
          return;
        }
        mapRef.current = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
          level: FIXED_LEVEL,
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
    // 강조 마커(CustomOverlay)와 겹치지 않도록 활성 record는 일반 마커 목록에서 제외한다.
    markersRef.current = places
      .filter((place) => place.recordId !== activeRecordId)
      .map(
        (place) =>
          new kakao.maps.Marker({
            map,
            position: new kakao.maps.LatLng(place.lat, place.lng),
            title: place.name,
          }),
      );

    activeOverlayRef.current?.setMap(null);
    activeOverlayRef.current = null;

    const activePlace = places.find((place) => place.recordId === activeRecordId) ?? null;
    if (activePlace) {
      const position = new kakao.maps.LatLng(activePlace.lat, activePlace.lng);
      const pin = document.createElement('div');
      pin.className =
        'flex h-8 w-8 items-center justify-center rounded-full border-2 border-paper-white bg-log-mint text-sm font-bold text-pin-navy shadow-md';
      pin.textContent = '●';
      activeOverlayRef.current = new kakao.maps.CustomOverlay({
        map,
        position,
        content: pin,
        xAnchor: 0.5,
        yAnchor: 0.5,
      });
    }

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
      map.setCenter(new kakao.maps.LatLng(activePlace.lat, activePlace.lng));
    }
    map.relayout();
  }, [places, activeRecordId, status, fitAllBounds]);

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
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-line-card bg-line-subtle">
      <div ref={containerRef} className="h-full w-full" />
      {overlayMessage && (
        <div className="absolute inset-0 flex items-center justify-center bg-paper-white/90 px-6 text-center text-xs leading-relaxed text-ink-gray">
          {overlayMessage}
        </div>
      )}
    </div>
  );
}
