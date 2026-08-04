// 287-10: getCollectionAccentColor(Feed 카드 표지)·getSpineColor(Library 책등)가 공유하는 정수 해시.
// 이전엔 둘 다 `id % 팔레트길이`(단순 나머지)를 썼다 — collectionId는 대개 생성 순서로 연속 정수라,
// 나머지 연산은 팔레트 길이 주기로 정확히 되풀이되는 색 순서를 만든다(예: 팔레트 5개면 id 1..5가
// 항상 색[1,2,3,4,0] 순서, id 6..10도 똑같은 순서 반복 — 육안으로 뚜렷한 규칙으로 보인다).
// 이 함수는 곱셈+xor-shift로 비트를 섞는 정수 해시(MurmurHash3 finalizer 계열, "triple32")를 먼저
// 거친 뒤에 나머지를 취한다 — 연속된 id라도 해시 결과가 서로 멀리 흩어져(avalanche 성질), 나머지
// 연산 후에도 순서상 인접한 id들이 육안으로 알아볼 패턴을 만들지 않는다. id 자체를 그대로 쓰므로
// 같은 id는 항상 같은 결과를 낸다(Math.random() 없음 — 리렌더링/새로고침에도 색이 유지된다).
// 307: collectionId가 string인 곳(지도 마커 색상)도 이 해시를 재사용할 수 있도록 문자열 입력을
// 받는 경로를 추가했다 — 문자열은 먼저 정수 해시(31 곱 누적, 자바 String.hashCode와 동일 방식)로
// 축약한 뒤 아래의 동일한 정수 해시 파이프라인을 그대로 탄다. 숫자 입력 경로(기존 호출부 전부)는
// 그대로다.
export function hashPaletteIndex(id: number | string, paletteSize: number): number {
  let h: number;
  if (typeof id === 'string') {
    h = 0;
    for (let i = 0; i < id.length; i += 1) {
      h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
    }
  } else {
    h = id | 0;
  }
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = h ^ (h >>> 16);
  return Math.abs(h) % paletteSize;
}
