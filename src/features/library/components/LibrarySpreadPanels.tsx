import { Link } from '@tanstack/react-router';
import { PaperCoverFace } from '@/features/home/components/HomeSheetPanels';
import { useMyCollectionsQuery } from '@/features/collections/hooks/useMyCollectionsQuery';
import { useRecentlyOpenedCount } from '@/features/feed/hooks/useRecentlyOpenedCount';
import { useFollowsQuery } from '@/features/follows/hooks/useFollowsQuery';
import { usePlaceRecordSheet } from '@/contexts/usePlaceRecordSheet';
import { PaperCornerNav } from '@/shared/ui/PaperCornerNav';
import { PaperNoteParts, PaperNoteTally } from '@/shared/ui/PaperNoteParts';

/**
 * 상단 조판 — 탐색(ExploreSpreadPanels)과 **같은 부품·같은 값**이다. 라벨 → 대형 제목 → 괘선.
 *
 * 문구는 개편 전 PageTitle이 쓰던 것을 그대로 옮겼다("나의 책장" / "저장한 장소를 책처럼
 * 꺼내보고…"). 이번 변경은 조판이지 문안이 아니다.
 *
 * S15P11A705-424: "나의 활동 기록"(/me/activity) 진입점을 이 괘선 줄에서 걷어냈다. 407 이후
 * 여기 살던 링크가 설정 모달(SettingsPanel)로 옮겨졌다 — 책장 지면이 아니라 계정 메뉴에 속하는
 * 진입점이라는 판단이다. `hasAnyRecord` 조건부 노출과 그에 딸린 useMeSummaryQuery 호출도 함께
 * 걷어냈다(그 판단은 SettingsPanel이 이어받는다).
 *
 * ⚠️ 이 줄에 무엇을 더 얹든 **높이는 그대로여야 한다**. 조판 머리(--pe-head)가 곁열·선반의 위
 * 경계를 정하고, 캐비닛은 그 아래 남은 상자를 실측해 행을 잡는다 — 한 줄이 두 줄로 접히면
 * 선반 마지막 행이 잘린다.
 */
export function LibraryHeadType() {
  return (
    <>
      <p className="pe-eyebrow">책장</p>
      <h1 className="pl-display pe-title">
        나의 <em>책장</em>
      </h1>
      <p className="pe-headrule">
        <span>저장한 장소를 책처럼 꺼내보고 컬렉션으로 정리해 보세요</span>
      </p>
    </>
  );
}

/**
 * 좌측 메모지 두 장 — 위는 **이 책장의 장부**, 아래는 장소 추가 진입점.
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
export function LibraryLeftType() {
  const openedCount = useRecentlyOpenedCount();
  const sheet = usePlaceRecordSheet();

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

      <button type="button" className="pl-note pl-note-add" onClick={sheet.open}>
        <PaperNoteParts />
        <b aria-hidden="true">+</b>
        <span>장소 추가하기</span>
      </button>
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
