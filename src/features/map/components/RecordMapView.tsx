import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { loadKakaoMaps, type KakaoCustomOverlay, type KakaoMap } from '@/shared/lib/kakaoMaps';
import { getRecordMarkerColor } from '@/shared/lib/getRecordMarkerColor';
import { useRecordMapMarkersQuery } from '../hooks/useRecordMapMarkersQuery';

// 마커 SVG 크기(px). 손그림풍 물방울 핀 — 외부 아이콘 라이브러리 없이 직접 그린다. 근거: Jira
// S15P11A705-307. xAnchor 0.5·yAnchor 1(아래 CustomOverlay 생성부)로 핀 뾰족한 끝이 좌표를
// 가리키게 맞춘다.
const MARKER_WIDTH = 28;
const MARKER_HEIGHT = 36;

/**
 * 카카오 기본 Marker(빨간 핀) 대신 CustomOverlay에 올릴 SVG 핀 엘리먼트를 만든다.
 * 채워지는 색은 getRecordMarkerColor(recordId 해시)로 결정한다. 외곽선은 지도 배경(line-subtle)
 * 위에서도 또렷하도록 paper-white 고정.
 */
function createRecordMarkerElement(color: string, title: string): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.title = title;
  wrapper.style.cursor = 'pointer';
  wrapper.style.filter = 'drop-shadow(0 2px 2px rgba(4, 33, 66, 0.25))';
  wrapper.innerHTML = `
    <svg width="${MARKER_WIDTH}" height="${MARKER_HEIGHT}" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 34C14 34 24.8 21.3 25.2 13.9C25.5 7.8 20.4 2.2 14.2 2C7.9 1.8 2.4 7 2.1 13.3C1.8 20.4 14 34 14 34Z" fill="${color}" stroke="#FAF7F6" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="14.1" cy="13.6" r="4.4" fill="#FAF7F6" />
    </svg>
  `;
  return wrapper;
}

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
}

/** 내 Record를 지도 마커로 조회하는 화면. 근거: docs/reference/08_API_명세.md 4.2. */
export function RecordMapView({ onMarkerClick }: RecordMapViewProps = {}) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markersRef = useRef<KakaoCustomOverlay[]>([]);
  const hasFitInitialBoundsRef = useRef(false);

  const [sdkStatus, setSdkStatus] = useState<SdkStatus>(() =>
    isKakaoMapsSdkReady() ? 'ready' : 'loading',
  );
  // "내 주변" 클릭 → 응답 대기 중에만 true. 실패해도 별도 에러 상태 없이 조용히 false로 돌아간다.
  const [locating, setLocating] = useState(false);

  const { data, isLoading, isFetching, isError } = useRecordMapMarkersQuery();

  useEffect(() => {
    // React StrictMode(dev)는 mount 시 이 effect를 setup→cleanup→setup 순으로 두 번 호출한다.
    // 아래 cancelled 플래그만으로는 "SDK가 이미 로드돼 있어 loadKakaoMaps()가 즉시 resolve되는" 경우를
    // 못 막는다 — 두 번째 setup의 .then()도 cancelled=false로 정상 진입해, 가드가 없으면 같은
    // containerRef에 kakao.maps.Map을 두 개 만들어 리스너가 겹치고 줌/내 주변 버튼이 잠깐 나타났다
    // 사라지는 현상으로 이어졌다(마운트마다 다시 그려지는 지도와 새 Map 인스턴스가 서로 덮어씀).
    // mapRef.current 존재 여부로 이미 생성된 Map을 재사용하도록 막는다. 근거: Jira S15P11A705-307.
    if (mapRef.current) {
      return;
    }
    let cancelled = false;
    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !containerRef.current || mapRef.current) {
          return;
        }
        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
          level: INITIAL_ZOOM_LEVEL,
        });
        mapRef.current = map;
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
      const element = createRecordMarkerElement(
        getRecordMarkerColor(item.collectionId ?? null),
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
        xAnchor: 0.5,
        yAnchor: 1,
      });
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

  // 카카오맵 레벨은 숫자가 작을수록 확대된 상태다. SDK 기본 ZoomControl 대신 브랜드 톤 커스텀
  // 버튼 두 개로 map.setLevel()을 직접 호출한다(kakaoMaps.ts에 ZoomControl 타입 없음).
  function handleZoomIn() {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    map.setLevel(map.getLevel() - 1);
  }

  function handleZoomOut() {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    map.setLevel(map.getLevel() + 1);
  }

  // 권한 거부·조회 실패 시 에러를 던지지 않고 DEFAULT_CENTER 폴백을 유지한 채 조용히 무시한다.
  // 별도 토스트/모달 없이 버튼 텍스트를 잠깐 바꾸는 정도로만 피드백한다.
  function handleLocateMe() {
    const map = mapRef.current;
    if (!map || !navigator.geolocation) {
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const kakao = window.kakao;
        if (!kakao || !mapRef.current) {
          return;
        }
        mapRef.current.setCenter(
          new kakao.maps.LatLng(position.coords.latitude, position.coords.longitude),
        );
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

      {sdkStatus === 'ready' && (
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locating}
          className="absolute bottom-6 left-4 rounded-full bg-paper-white px-4 py-2 text-xs font-bold text-pin-navy shadow-md disabled:opacity-60"
        >
          {locating ? '위치 찾는 중…' : '내 주변'}
        </button>
      )}

      {sdkStatus === 'ready' && (
        <div className="absolute bottom-6 right-4 flex flex-col overflow-hidden rounded-xl border border-line-card bg-paper-white shadow-md">
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label="지도 확대"
            className="flex h-9 w-9 items-center justify-center text-lg font-bold text-pin-navy hover:bg-line-subtle"
          >
            +
          </button>
          <div className="h-px w-full bg-line-card" />
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="지도 축소"
            className="flex h-9 w-9 items-center justify-center text-lg font-bold text-pin-navy hover:bg-line-subtle"
          >
            −
          </button>
        </div>
      )}
    </div>
  );
}
