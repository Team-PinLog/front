import { KAKAO_JS_KEY } from '@/config/constants';

/**
 * 카카오 지도 JS SDK가 window.kakao에 노출하는 타입 중 이 프로젝트가 실제로 쓰는 부분만 선언한다.
 * 근거: docs/api-contract.md Place·지도·검색 — 지도 렌더링은 프론트가 JS SDK를 직접 로드한다.
 */
export interface KakaoLatLng {
  getLat(): number;
  getLng(): number;
}

export interface KakaoMarker {
  setMap(map: KakaoMap | null): void;
}

export interface KakaoCustomOverlay {
  setMap(map: KakaoMap | null): void;
  setPosition(position: KakaoLatLng): void;
}

export interface KakaoBounds {
  getSouthWest(): KakaoLatLng;
  getNorthEast(): KakaoLatLng;
}

export interface KakaoMap {
  setCenter(latlng: KakaoLatLng): void;
  getCenter(): KakaoLatLng;
  /** setCenter와 달리 부드럽게 이동한다. 지도 이동 범위를 되돌릴 때 쓴다(RecordMapView). */
  panTo(latlng: KakaoLatLng): void;
  setLevel(level: number): void;
  getLevel(): number;
  relayout(): void;
  getBounds(): KakaoBounds;
  setBounds(
    bounds: KakaoBounds,
    paddingTop?: number,
    paddingRight?: number,
    paddingBottom?: number,
    paddingLeft?: number,
  ): void;
}

export interface KakaoEventNamespace {
  addListener(target: KakaoMap | KakaoMarker, type: string, handler: () => void): void;
  // 언마운트 시 리스너를 떼려면 addListener에 넘긴 것과 같은 함수 참조를 그대로 줘야 한다
  // (RecordMapView의 zoom_changed 상한 clamp).
  removeListener(target: KakaoMap | KakaoMarker, type: string, handler: () => void): void;
}

export interface KakaoMapsNamespace {
  load(callback: () => void): void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  LatLngBounds: new (sw: KakaoLatLng, ne: KakaoLatLng) => KakaoBounds;
  Map: new (
    container: HTMLElement,
    // maxLevel: SDK가 직접 강제하는 최대 축소 레벨. 버튼·휠·트랙패드 핀치·setLevel·setBounds 등
    // 모든 경로에 예외 없이 적용된다(실측 확인). RecordMapView가 MAX_ZOOM_OUT_LEVEL을 넘긴다.
    options: { center: KakaoLatLng; level?: number; maxLevel?: number },
  ) => KakaoMap;
  Marker: new (options: { map?: KakaoMap; position: KakaoLatLng; title?: string }) => KakaoMarker;
  CustomOverlay: new (options: {
    map?: KakaoMap;
    position: KakaoLatLng;
    content: HTMLElement | string;
    xAnchor?: number;
    yAnchor?: number;
    zIndex?: number;
  }) => KakaoCustomOverlay;
  event: KakaoEventNamespace;
}

export interface KakaoNamespace {
  maps: KakaoMapsNamespace;
}

declare global {
  interface Window {
    kakao?: KakaoNamespace;
  }
}

const SCRIPT_MARKER_ATTR = 'data-pinlog-kakao-maps';

let kakaoLoaderPromise: Promise<KakaoNamespace> | null = null;

/**
 * 카카오 지도 JS SDK를 1회만 로드한다(single-flight). 이미 로드됐으면 즉시 resolve.
 * 실패 시 다음 호출에서 재시도할 수 있도록 캐시된 Promise를 비운다.
 */
export function loadKakaoMaps(): Promise<KakaoNamespace> {
  if (window.kakao?.maps) {
    return Promise.resolve(window.kakao);
  }
  if (kakaoLoaderPromise) {
    return kakaoLoaderPromise;
  }
  if (!KAKAO_JS_KEY) {
    return Promise.reject(new Error('KAKAO_JS_KEY_MISSING'));
  }

  kakaoLoaderPromise = new Promise<KakaoNamespace>((resolve, reject) => {
    const handleLoaded = () => {
      const kakao = window.kakao;
      if (!kakao?.maps) {
        reject(new Error('KAKAO_SDK_INVALID'));
        return;
      }
      kakao.maps.load(() => resolve(kakao));
    };

    const existing = document.querySelector<HTMLScriptElement>(`script[${SCRIPT_MARKER_ATTR}]`);
    if (existing) {
      existing.addEventListener('load', handleLoaded, { once: true });
      existing.addEventListener('error', () => reject(new Error('KAKAO_SDK_LOAD_FAILED')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.setAttribute(SCRIPT_MARKER_ATTR, 'true');
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=${encodeURIComponent(KAKAO_JS_KEY)}`;
    script.addEventListener('load', handleLoaded, { once: true });
    script.addEventListener('error', () => reject(new Error('KAKAO_SDK_LOAD_FAILED')), {
      once: true,
    });
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    kakaoLoaderPromise = null;
    throw error;
  });

  return kakaoLoaderPromise;
}
