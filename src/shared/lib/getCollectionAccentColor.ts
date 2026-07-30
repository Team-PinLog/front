// tailwind.config.js의 브랜드 토큰(log-mint)과 어울리는 보조 색상 팔레트.
// Feed API에는 Collection 이미지 필드가 없어, collectionId를 해시해 이 팔레트 중 하나를
// 결정론적으로 골라 카드 배경(일러스트 대체)으로 쓴다. 저장하지 않고 매번 계산한다.
// 근거: Jira S15P11A705-170. 171(Collection 상세)에서도 재사용 가능하도록 공용 위치에 둔다.
const ACCENT_COLORS = [
  '#3BB7A2', // log-mint
  '#F2A65A',
  '#7C9CBF',
  '#D97B6C',
  '#8FAE7B',
];

export function getCollectionAccentColor(collectionId: number): string {
  return ACCENT_COLORS[Math.abs(collectionId) % ACCENT_COLORS.length];
}
