import { useEffect, useRef, useState } from 'react';
import { loadKakaoMaps, type KakaoMap, type KakaoMarker } from '@/shared/lib/kakaoMaps';

// 폴라로이드 한 장 안에 담기는 지도라 "이 장소 하나"만 읽히면 된다. 4는 KakaoPlaceMap이 선택된
// 장소를 보여줄 때 쓰는 것과 같은 레벨(축척 100m)이다.
const MAP_LEVEL = 4;
// SDK 로드 직후 인스턴스를 만드는 순간의 임시 중심(서울시청). 바로 아래 effect가 실제 좌표로
// 덮어쓴다 — KakaoPlaceMap·CollectionSpreadMap과 같은 처리다(생성 effect가 좌표에 의존하지 않게 해
// 좌표가 바뀌어도 지도를 새로 만들지 않는다).
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };

type MapStatus = 'loading' | 'ready' | 'error';

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
    markerRef.current = new kakao.maps.Marker({ map, position, title: name });
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
