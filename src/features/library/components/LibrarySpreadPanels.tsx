import { Link } from '@tanstack/react-router';
import { PaperCoverFace } from '@/features/home/components/HomeSheetPanels';
import { useMyCollectionsQuery } from '@/features/collections/hooks/useMyCollectionsQuery';
import { useRecentlyOpenedCount } from '@/features/feed/hooks/useRecentlyOpenedCount';
import { useFollowsQuery } from '@/features/follows/hooks/useFollowsQuery';
import { useMeSummaryQuery } from '@/features/me/hooks/useMeSummaryQuery';
import { PaperCornerNav } from '@/shared/ui/PaperCornerNav';
import { PaperNoteParts, PaperNoteTally } from '@/shared/ui/PaperNoteParts';

/**
 * 상단 조판 — 탐색(ExploreSpreadPanels)과 **같은 부품·같은 값**이다. 라벨 → 대형 제목 → 괘선.
 *
 * 문구는 개편 전 PageTitle이 쓰던 것을 그대로 옮겼다("나의 책장" / "저장한 장소를 책처럼
 * 꺼내보고…"). 이번 변경은 조판이지 문안이 아니다.
 *
 * 407: "나의 활동 기록"(/me/activity) 진입점이 여기 괘선 줄에 산다. 개편 전에는 PageTitle의
 * description 안에 있었는데, 그 PageTitle 자체가 411에서 이 조판으로 대체됐다 — 링크가 사라지지
 * 않도록 같은 줄(제목 아래 한 줄 설명)로 옮겨 왔다. 오른쪽 어깨의 PaperCornerNav와는 하는 일이
 * 다르다: 저쪽은 "다른 화면으로 나가는 길", 이쪽은 "이 책장에 대해 더 읽을 것"이라 둘 다 남는다.
 *
 * 노출 조건은 407이 정한 그대로다. docs 이슈 #55는 **기록 0건이면 책장에서 이 진입점을 숨기자**고
 * 제안한다 — 전부 0인 화면을 첫 사용자에게 주는 것은 그 페이지의 목적과 어긋나기 때문이다.
 * 판정에 GET /me/activity가 아니라 3.5(마이페이지 요약)의 recordCount를 쓰는 이유: 집계 응답은
 * 그 화면에 들어가야 받는 것이 맞고(진입 시 1회 호출이 계약이다), 요약 쪽은 설정 패널이 이미 같은
 * 쿼리 키(['me','summary'])로 쓰고 있어 캐시를 그대로 나눠 쓴다. 책장에 새 요청이 늘지 않는다.
 * 로딩 중(data === undefined)에는 숨긴다 — 없다가 생기는 편이, 있다가 사라지는 것보다 낫다.
 *
 * ⚠️ 이 줄에 무엇을 더 얹든 **높이는 그대로여야 한다**. 조판 머리(--pe-head)가 곁열·선반의 위
 * 경계를 정하고, 캐비닛은 그 아래 남은 상자를 실측해 행을 잡는다 — 한 줄이 두 줄로 접히면
 * 선반 마지막 행이 잘린다. 링크를 nowrap으로 두는 이유가 그것이다.
 */
export function LibraryHeadType() {
  const meSummaryQuery = useMeSummaryQuery();
  const hasAnyRecord = (meSummaryQuery.data?.recordCount ?? 0) > 0;

  return (
    <>
      <p className="pe-eyebrow">책장</p>
      <h1 className="pl-display pe-title">
        나의 <em>책장</em>
      </h1>
      <p className="pe-headrule">
        <span>저장한 장소를 책처럼 꺼내보고 컬렉션으로 정리해 보세요</span>
        {hasAnyRecord && (
          <Link to="/me/activity" className="pe-headlink">
            나의 활동 기록
          </Link>
        )}
      </p>
    </>
  );
}

interface LibraryLeftTypeProps {
  /** 지금 펼친 쪽(1부터). 캐비닛의 좌우 페이지 이동과 같은 값이다. */
  pageNumber: number | null;
}

/**
 * 좌측 메모지 두 장 — 위는 **이 책장의 장부**, 아래는 지금 펼친 쪽.
 *
 * 29번(사용자 지시): 탐색의 메모지를 그대로 쓰지 않는다. 두 화면이 같은 종이 문법(제목 · 한 줄
 * 설명 · 점선 리더 장부)을 쓰되 **적는 사실은 달라야** 그 자리에 있을 이유가 생긴다. 탐색은
 * 남의 책장을 구경하는 화면이라 셀 것이 "내가 펼쳐본 책" 하나뿐이지만, 여기는 내 서가라
 * "내 것이 얼마나 있는가"가 그 자리에서 알고 싶은 값이다.
 *
 * ⚠️ 두 수 모두 **"지금까지 받아온 만큼"**이지 전체가 아니다. 컬렉션·팔로우 목록은 둘 다 필요할
 * 때만 더 받아오는 무한 쿼리라(useMyCollectionsQuery / useFollowsQuery) 이 화면은 총계를 알지
 * 못한다 — 더 있을 수 있으면 "+"를 붙여 그 사실을 드러낸다. 캐비닛 아래 페이지 숫자가 같은
 * 이유로 "+"를 붙이는 것과 같은 규칙이다. 총계를 아는 척하면 메모가 거짓말을 한다.
 * ⚠️ 여기서 훅을 다시 부르지만 요청이 늘지 않는다 — 캐비닛이 쓰는 것과 **같은 쿼리 키**라
 * 캐시를 그대로 읽는다. 값을 prop으로 끌어내리지 않는 이유는 이 메모지가 캐비닛의 자식이
 * 아니라 지면 곁열에 있어서, 넘기려면 페이지를 통째로 관통해야 하기 때문이다.
 *
 * 「펼쳐본 책」만 탐색과 **같은 기록·같은 문구**다(382의 recentlyOpenedCollections). 사용자가
 * 책을 어디서 펼쳤든 "내가 펼쳐본 책"은 하나의 사실이라 두 화면이 같은 수를 말하는 것이 맞다.
 */
export function LibraryLeftType({ pageNumber }: LibraryLeftTypeProps) {
  const openedCount = useRecentlyOpenedCount();

  const myCollectionsQuery = useMyCollectionsQuery();
  const collectionPages = myCollectionsQuery.data?.pages ?? [];
  const collectionCount = collectionPages.flatMap((page) => page.items).length;
  const hasMoreCollections = collectionPages[collectionPages.length - 1]?.hasNext ?? false;

  const followsQuery = useFollowsQuery();
  const followPages = followsQuery.data?.pages ?? [];
  const followCount = followPages.flatMap((page) => page.items).length;
  const hasMoreFollows = followPages[followPages.length - 1]?.hasNext ?? false;

  return (
    <>
      <div className="pl-note pl-note-list">
        <PaperNoteParts />
        <div className="pl-note-h">이 책장은</div>
        <p className="pe-note-body">
          내가 엮은 컬렉션과 팔로우한 사람의 책장이 한 칸씩 놓여 있습니다. 책등을 누르면 그 안에
          담긴 장소를 펼쳐 봅니다.
        </p>
        {/* 아직 받아오는 중이면 숫자 대신 자리만 지킨다 — 0을 먼저 적었다가 값이 들어오는 것은
            "없다"고 말했다가 번복하는 것이라, 세는 물건에는 쓰지 않는다. */}
        <PaperNoteTally
          label="내 컬렉션"
          value={
            myCollectionsQuery.isPending
              ? '—'
              : `${collectionCount}${hasMoreCollections ? '+' : ''}권`
          }
        />
        <PaperNoteTally
          label="팔로우한 책장"
          value={followsQuery.isPending ? '—' : `${followCount}${hasMoreFollows ? '+' : ''}곳`}
        />
        {/* 문구·빈 상태 판단은 탐색과 같다(ExploreSpreadPanels 주석). */}
        <PaperNoteTally label="펼쳐본 책" value={openedCount === 0 ? '아직' : `${openedCount}권`} />
      </div>

      <div className="pl-note pe-note-folio">
        <PaperNoteParts />
        <span>지금 펼친 쪽</span>
        {/* 측정 전에는 자리만 잡아 둔다 — 숫자가 들어오면서 메모지 높이가 바뀌면 곁열이 한 번
            출렁인다(탐색과 같은 이유). */}
        <b>{pageNumber === null ? '—' : pageNumber}</b>
      </div>
    </>
  );
}

/**
 * 우측 표지 두 권 — 책장에서 다른 화면으로 나가는 진입점.
 *
 * 홈·탐색의 두 권에서 **지금 보고 있는 책장을 빼고** 나머지 둘(홈·탐색)을 세운 구성이다 —
 * 자기 자신으로 가는 표지를 세우면 눌러도 아무 일이 없다.
 * 색 배정도 세 화면이 같다: 위에 놓인 권이 민트, 아래 깔린 권이 네이비.
 */
export function LibraryRightType() {
  return (
    <nav className="pl-pile" aria-label="다른 화면으로 이동">
      {/* DOM 순서가 곧 쌓임 순서다 — 아래 깔리는 책을 먼저 둔다. */}
      <Link to="/feed" className="pl-pile-book pl-pile-under">
        <PaperCoverFace title="탐색" />
      </Link>
      <Link to="/" className="pl-pile-book pl-pile-over">
        <PaperCoverFace title="홈" />
      </Link>
    </nav>
  );
}

/**
 * 지면 오른쪽 어깨의 조판 링크. 설정 진입점(항상)이자, 곁열이 사라지는 폭에서는 화면 이동
 * 수단이다 — 홈·탐색과 완전히 같은 부품·같은 자리·같은 접힘 규칙(.paper-corner-nav--rails)이다.
 */
export function LibraryCornerNav() {
  return (
    <PaperCornerNav
      className="pe-cornernav paper-corner-nav--rails"
      items={[
        { to: '/', label: '홈' },
        { to: '/feed', label: '탐색' },
      ]}
    />
  );
}
