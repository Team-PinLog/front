import { useEffect } from 'react';

/**
 * 381(382에 병합): 목록 응답이 도착하면 그 페이지의 표지 이미지를 **일괄 워밍**한다.
 *
 * 문제: 카드가 먼저 그려지고 표지 <img>는 그때부터 받기 시작해서, 폴백 그라디언트가 잠깐 보였다가
 * 사진으로 바뀌는 깜빡임이 페이지마다 났다. 목록 응답에는 표지 URL이 이미 다 들어 있으므로, 카드가
 * 렌더되기를 기다릴 이유가 없다.
 *
 * 방법은 `new Image().src` 하나다. 이건 요청을 브라우저 HTTP 캐시에 채워 넣을 뿐이고, 실제 표시는
 * 여전히 각 카드의 <img>가 한다 — 그 <img>가 렌더될 때는 이미 캐시에 있어 첫 프레임부터 사진이
 * 그려진다. 상태를 하나도 만들지 않으므로 리렌더도, 실패 처리 분기도 늘지 않는다(실패하면 카드가
 * 원래 갖고 있던 폴백 경로가 그대로 받는다 — CoverArtwork의 onError).
 *
 * ⚠️ **다음 페이지 프리페치는 하지 않는다.** 381이 검토 항목으로 올린 것이고 넘김이 즉시가 되는
 * 이점은 분명하지만, Feed 목록은 **서버가 응답을 만들 때 IMPRESSION을 자동 기록한다**(08_API_명세
 * 10.1, AGENTS.md). 사용자가 넘기지도 않은 페이지를 미리 받으면 보지 않은 항목에 노출 기록이 쌓여
 * 추천 지표가 오염된다. 렌더 성능을 위해 데이터의 의미를 망가뜨리는 거래라 하지 않는다.
 *
 * 데이터·이벤트 로직은 건드리지 않는다 — 이 훅은 아무것도 반환하지 않고 쿼리 캐시도 만지지 않는다.
 */
export function useFeedCoverPreload(coverImageUrls: (string | null | undefined)[]): void {
  // 배열은 매 렌더 새 참조라 의존성에 그대로 넣으면 effect가 매번 돈다. URL을 이어 붙인 문자열
  // 하나로 비교하면 "같은 페이지를 다시 그린 것"과 "다른 페이지가 온 것"이 정확히 구분된다.
  const key = coverImageUrls.filter((url): url is string => typeof url === 'string').join('\n');

  useEffect(() => {
    if (key === '') {
      return;
    }
    for (const url of key.split('\n')) {
      const image = new Image();
      image.src = url;
    }
  }, [key]);
}
