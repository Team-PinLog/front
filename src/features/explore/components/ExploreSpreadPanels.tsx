import { Link } from '@tanstack/react-router';
import { usePlaceRecordSheet } from '@/contexts/usePlaceRecordSheet';
import { PaperCoverFace } from '@/features/home/components/HomeSheetPanels';
import { useRecentlyOpenedCount } from '@/features/feed/hooks/useRecentlyOpenedCount';
import { PaperCornerNav } from '@/shared/ui/PaperCornerNav';
import { PaperNoteParts, PaperNoteTally } from '@/shared/ui/PaperNoteParts';

/**
 * 상단 조판 — 자간을 벌린 작은 라벨 → 대형 제목 → 괘선 한 줄.
 *
 * 문구는 개편 전 PageTitle이 쓰던 것을 그대로 옮겼다("새로운 장소를 발견해 보세요"). 이번
 * 변경은 조판이지 문안이 아니다.
 *
 * <em>에 민트 밑줄이 깔린다(paperAperture.css .pl-display em). 민트는 종이 위 2.32:1이라
 * 글자색으로 못 쓰고 면으로만 쓴다는 규칙이 그대로 적용된 자리다 — 글자는 네이비로 남는다.
 */
export function ExploreHeadType() {
  return (
    <>
      <p className="pe-eyebrow">탐색</p>
      <h1 className="pl-display pe-title">
        새로운 장소를 <em>발견해 보세요</em>
      </h1>
      <p className="pe-headrule">익명의 사용자가 엮은 컬렉션을 한 권씩 꺼내 봅니다</p>
    </>
  );
}

/**
 * 좌측 메모지 두 장 — 위는 이 책장이 무엇인지, 아래는 장소 추가 진입점.
 *
 * 「펼쳐본 책」한 줄만 예외로 수를 적는데, 그것은 서버가 준 값이 아니라 **이 브라우저에 남은 내
 * 기록**이다(382의 recentlyOpenedCollections). 세는 범위와 상한은 useRecentlyOpenedCount 주석에
 * 있고, 문구를 "지금까지 본 책 전부"로 쓰지 않은 이유도 그것이다.
 */
export function ExploreLeftType() {
  const openedCount = useRecentlyOpenedCount();
  const placeRecordSheet = usePlaceRecordSheet();

  return (
    <>
      <div className="pl-note pl-note-list">
        <PaperNoteParts />
        <div className="pl-note-h">이 책장은</div>
        <p className="pe-note-body">
          다른 사람이 엮어 둔 컬렉션이 한 권씩 꽂혀 있습니다. 표지를 누르면 그 안에 담긴 장소를 펼쳐
          봅니다.
        </p>
        {/* 아직 한 권도 안 펼쳤을 때는 0을 적지 않는다 — 0권은 세어 본 결과처럼 읽히지만 실제로는
            "아직 시작하지 않았다"는 상태다. 다이어리에 0을 적는 사람은 없다. */}
        <PaperNoteTally label="펼쳐본 책" value={openedCount === 0 ? '아직' : `${openedCount}권`} />
      </div>

      <button type="button" className="pl-note pl-note-add" onClick={placeRecordSheet.open}>
        <PaperNoteParts />
        <b aria-hidden="true">+</b>
        <span>장소 추가하기</span>
      </button>
    </>
  );
}

/**
 * 우측 표지 두 권 — 탐색에서 다른 화면으로 나가는 진입점.
 *
 * 네비게이션 바를 지운 뒤로 이동 수단은 전부 화면 안에 있다. 홈의 두 권(책장·탐색)에서
 * **지금 보고 있는 탐색을 홈으로 갈아끼운** 구성이다 — 자기 자신으로 가는 표지를 세우면 눌러도
 * 아무 일이 없다.
 *
 * 색 배정도 홈과 같은 규칙이다: 위에 놓인 권이 민트, 아래 깔린 권이 네이비.
 */
export function ExploreRightType() {
  return (
    <nav className="pl-pile" aria-label="다른 화면으로 이동">
      {/* DOM 순서가 곧 쌓임 순서다 — 아래 깔리는 책을 먼저 둔다. */}
      <Link to="/library" className="pl-pile-book pl-pile-under">
        <PaperCoverFace title="책장" />
      </Link>
      <Link to="/" className="pl-pile-book pl-pile-over">
        <PaperCoverFace title="홈" />
      </Link>
    </nav>
  );
}

/**
 * 지면 오른쪽 어깨의 조판 링크. 두 가지를 겸한다.
 *
 * ① **설정**(계정 정보·로그아웃·탈퇴) — 네비게이션 바를 지운 뒤로 이것이 유일한 경로라 폭과
 *    무관하게 항상 보인다.
 * ② **화면 이동** — 곁열이 살아 있는 넓은 폭에서는 우측 표지 두 권이 맡으므로 링크는 감추고
 *    (index.css의 .paper-corner-nav--rails), 곁열이 사라지는 폭에서만 드러난다. 홈이 쓰는
 *    변형을 그대로 쓴다 — 두 화면에서 같은 경계로 접혀야 한다.
 *
 * 표지를 그대로 줄여 쓰지 않는 이유: 표제(.pl-pile-title)가 표지 폭의 11%라, 좁은 폭에서
 * 성립하는 크기까지 줄이면 글자가 7~8px이 되어 안 읽힌다. 홈 CSS 머리말이 말하는 "축소가 아니라
 * 제본 방식이 바뀐다"를 따라 아예 다른 조판으로 갈아탄다.
 */
export function ExploreCornerNav() {
  return (
    <PaperCornerNav
      className="pe-cornernav paper-corner-nav--rails"
      items={[
        { to: '/', label: '홈' },
        { to: '/library', label: '책장' },
      ]}
    />
  );
}
