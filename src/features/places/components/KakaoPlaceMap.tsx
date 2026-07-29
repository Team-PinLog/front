import { useEffect, useRef, useState } from 'react';
import { loadKakaoMaps, type KakaoMap, type KakaoMarker } from '@/shared/lib/kakaoMaps';
import type { KakaoPlace } from '../api/searchKakaoPlaces';

// 검색 결과가 없을 때 지도 기본 중심(서울시청).
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };

type MapStatus = 'loading' | 'ready' | 'error';

interface KakaoPlaceMapProps {
  place: KakaoPlace | null;
}

/** 선택된 장소 하나를 마커로 표시하는 지도. 근거: docs/api-contract.md Place·지도·검색(JS SDK 직접 로드). */
export function KakaoPlaceMap({ place }: KakaoPlaceMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markerRef = useRef<KakaoMarker | null>(null);
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
          level: 8,
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
    if (status !== 'ready' || !mapRef.current) {
      return;
    }
    const kakao = window.kakao;
    if (!kakao) {
      return;
    }

    markerRef.current?.setMap(null);
    markerRef.current = null;

    if (place) {
      const position = new kakao.maps.LatLng(place.lat, place.lng);
      mapRef.current.setCenter(position);
      mapRef.current.setLevel(4);
      markerRef.current = new kakao.maps.Marker({
        map: mapRef.current,
        position,
        title: place.name,
      });
    }
    mapRef.current.relayout();
  }, [place, status]);

  const overlayMessage =
    status === 'error'
      ? '카카오 지도를 불러오지 못했습니다.'
      : status === 'loading'
        ? '지도를 불러오는 중입니다…'
        : !place
          ? '검색 결과에서 장소를 선택하면 지도에 표시됩니다.'
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
