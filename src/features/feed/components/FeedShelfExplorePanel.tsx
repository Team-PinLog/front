import { AuthorShelfPanel } from '@/features/collections/components/AuthorShelfPanel';

interface FeedShelfExplorePanelProps {
  collectionId: number;
  /** 좁은 화면의 서랍·오버레이에서 책을 고르면 그것을 닫기 위해 호출부가 넘긴다. */
  onSelectCollection?: () => void;
  /**
   * 한 행에 세울 책등 수. Feed 칸의 실제 폭이 배선 시점에 정해지므로, 그때 실측해 넘긴다
   * (기본값 3은 컬렉션 상세 좌측 패널 300px 기준 — AuthorShelfPanel 주석 참고).
   */
  spinesPerRow?: number;
  /** 한 쪽에 세울 선반 행 수. 기본값 2. */
  rowCount?: number;
}

/**
 * 422 — Feed에 놓는 "다른 컬렉션 탐색" 책장.
 *
 * ## 왜 새 컴포넌트를 새로 그리지 않았는가
 *
 * 조사 결과(CLAUDE.local.md 1·2라운드), Feed가 실제로 쓸 수 있는 "책장" 구현은 이미 두 벌이 아니라
 * `AuthorShelfPanel` 하나뿐이었다:
 * - `ShelfExploreSection`(같은 디렉터리, 보존만 함)은 무한 스크롤 캐비닛이라 418이 결함으로 지목한
 *   "항목이 늘면 세로로 자란다"가 그대로 남아 있다.
 * - `FollowedShelfCard`(LibraryPage 소비)는 `followId` 기반 자체 fetch라 데이터 계약이 다르고(팔로우
 *   전제 필요 vs 이 화면은 팔로우 여부 미정도 허용해야 함), 별칭 편집·언팔로우 메뉴 같은 책장 "관리"
 *   액션까지 딸려 온다 — 탐색 전용인 이 자리에는 과하다.
 * - `AuthorShelfPanel`은 동작(`useShelfExploreQuery` 기반 `collectionId` 탐색·단순 팔로우 토글·
 *   `shelfContext` 내비게이션)이 이 화면이 필요로 하는 것과 정확히 같고, 시각도 이미 LibraryPage와
 *   같은 공용 책장 프리미티브(`shared/ui/Shelf`)를 쓴다. 422에서 남은 하드코딩 hex를 브랜드 토큰으로
 *   옮기고 행/열 수를 props로 열어(`spinesPerRow`/`rowCount`) 폭 300px 전제를 없앴다(해당 파일 주석
 *   참고) — 그래서 이 컴포넌트는 그것을 감싸기만 한다.
 *
 * 이 얇은 래퍼를 따로 두는 이유는 "Feed가 다른 컬렉션 탐색에 쓰는 진입점"이 `features/feed/`
 * 안에서 바로 보이게 하기 위해서다(다른 소비처인 컬렉션 상세는 `AuthorShelfPanel`을 직접 쓴다) —
 * `features/collections/`의 내부 구현을 Feed 쪽 배선 코드가 몰라도 되게 분리한다.
 *
 * ## 배선 메모(L3용)
 *
 * `AuthorShelfPanel`은 `<section class="flex h-full min-h-0 flex-col gap-4">`라 부모가 명시적
 * 높이(또는 `flex-1 min-h-0`)를 내려줘야 2행 선반이 제 높이를 잡는다 — 컬렉션 상세 쪽 소비처
 * (`CollectionDetailView.tsx`의 `<aside class="w-[300px] ... lg:block">`)와 같은 조건이다. 폭은
 * 유연하다(내부에 폭 강제 CSS가 없다 — 300px는 컬렉션 상세의 바깥 `<aside>`가 거는 제약이었지 이
 * 컴포넌트 자체의 값이 아니었다). Feed 칸 폭이 300px에서 크게 벗어나면 `spinesPerRow`를 조정해
 * 넘긴다.
 */
export function FeedShelfExplorePanel({
  collectionId,
  onSelectCollection,
  spinesPerRow,
  rowCount,
}: FeedShelfExplorePanelProps) {
  return (
    <AuthorShelfPanel
      collectionId={collectionId}
      onSelectCollection={onSelectCollection}
      spinesPerRow={spinesPerRow}
      rowCount={rowCount}
    />
  );
}
