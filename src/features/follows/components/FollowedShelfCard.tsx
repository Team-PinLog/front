import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { handleShelfScrollFetchNext } from '@/shared/lib/handleShelfScrollFetchNext';
import {
  chunkIntoShelfRows,
  getEmptyTierPadding,
  SHELF_SCROLL_SIDE_PADDING_PX,
  SHELF_SCROLL_BOTTOM_PADDING_PX,
  SHELF_SCROLL_TOP_PADDING_PX,
} from '@/shared/lib/shelfSpine';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import {
  ShelfBookSpine,
  ShelfColumnSkeleton,
  ShelfColumnStatus,
  ShelfIconButton,
  ShelfLabel,
  ShelfTier,
} from '@/shared/ui/Shelf';
import { PendingLabel } from '@/shared/ui/PendingLabel';
import { useFollowShelfCollectionsQuery } from '../hooks/useFollowShelfCollectionsQuery';
import { useUpdateFollowAliasMutation } from '../hooks/useUpdateFollowAliasMutation';
import { useUnfollowMutation } from '../hooks/useUnfollowMutation';

// 08_API_명세.md 8.3 "최대 20자". input의 maxLength와 남은 글자 수 표시가 같은 값을 공유한다.
const ALIAS_MAX_LENGTH = 20;

// 329: 남은 글자 수를 "항상" 띄우지 않는 이유는 폭이다. 이 편집 행이 놓이는 열은 좁다 — mdlg 2열에서
// 열 안쪽 폭이 약 274px이고(768 - 레일 72 - 페이지 padding 48 - 캐비닛 40 - 열 gap 20 → /2 → 열
// padding 20), 저장·취소 아이콘 버튼(28×2)과 gap을 빼면 입력칸에 206px이 남는다. 여기에 "20/20"
// 카운터(약 30px + gap 6)를 상시로 두면 176px로 줄어, 텍스트 버튼을 아이콘으로 바꿔 벌어놓은 폭을
// 도로 반납하게 된다(이 티켓의 목적이 입력칸 폭 확보다).
// 그래서 카운터가 실제로 필요한 순간에만 띄운다 — maxLength가 입력을 막기 시작해 "왜 더 안 써지지?"가
// 되는 구간이다. 그 전까지는 입력칸이 최대 폭을 쓴다.
const ALIAS_COUNT_VISIBLE_REMAINING = 5;

// 287-16: 행별 권수(getRowCapacity) seed의 열 구분용 salt — MyShelfList.tsx의 MY_SHELF_SEED_SALT와
// 절대 겹치지 않는 범위를 쓴다. columnSlot(2열=0, 3열=1)마다 다른 구간을 배정해, 팔로우한 책장을
// 다음 페이지로 넘겨 다른 followId가 같은 열에 들어와도, 그리고 2열과 3열끼리도 seed 공간이 겹치지
// 않게 한다(followId 자체가 달라 이미 대부분 다른 값이 나오지만, 열 구분을 명시적으로 보장한다).
const FOLLOWED_SHELF_SEED_SALT_BASE = 100_000;
const FOLLOWED_SHELF_SEED_SALT_PER_SLOT = 400_000;

interface FollowedShelfCardProps {
  followId: number;
  alias: string | null;
  columnSlot: number;
  visibleRowCount: number;
}

/**
 * 팔로우한 책장 하나를, 목업의 책장(cabinet-shell) 캐비닛 "한 칸"으로 렌더링한다 — 캐비닛 테두리는 이제
 * LibraryPage(250)가 "나의 책장·팔로우한 책장" 3열 캐비닛 레벨에서 공유하므로 여기서는 그리지 않는다.
 * 선반(ShelfBoard)도 캐비닛 레벨에서 한 번만 두지 않고, 컬렉션을 행 단위(권수는 행마다 다름 —
 * 287-14)로 끊어 ShelfTier로 감싸 행마다 반복해서 깐다.
 * 근거: Jira S15P11A705-144/169/250, docs/reference/08_API_명세.md 9.3/8.3/8.4.
 * 이 카드가 쓰는 Collection 목록 커서는 이 followId 전용이다(useFollowShelfCollectionsQuery) — 다른
 * 카드나 팔로우 목록(useFollowsQuery) 커서와 절대 혼용하지 않는다.
 * Library 컨텍스트의 언팔로우이므로 useUnfollowMutation에 sourceCollectionId를 넘기지 않는다.
 * 헤더 연필 아이콘은 목업의 shelf-edit-button/shelf-column-menu를 옮긴 것으로, 기존 별칭 수정·언팔로우
 * 로직을 여는 진입점 역할만 한다 — 두 mutation 자체는 그대로다.
 */
export function FollowedShelfCard({
  followId,
  alias,
  columnSlot,
  visibleRowCount,
}: FollowedShelfCardProps) {
  const navigate = useNavigate();
  const collectionsQuery = useFollowShelfCollectionsQuery(followId);
  const updateAliasMutation = useUpdateFollowAliasMutation();
  const unfollowMutation = useUnfollowMutation();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // 348: 팔로우 해제 확인. Context+Provider(기존 세 다이얼로그의 패턴)를 쓰지 않는다 — 이 동작은
  // 이 카드 안에서 시작해서 끝나고, 다른 화면이 이 상태를 읽을 일이 없다. 전역 상태를 늘리는
  // 비용만 남는다.
  const [isUnfollowConfirmOpen, setIsUnfollowConfirmOpen] = useState(false);
  const [isEditingAlias, setIsEditingAlias] = useState(false);
  const [aliasInput, setAliasInput] = useState(alias ?? '');
  const collections = collectionsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const statusMessage = updateAliasMutation.isError
    ? updateAliasMutation.error.message
    : collectionsQuery.isPending
      ? '불러오는 중…'
      : collectionsQuery.isError
        ? '책장을 불러오지 못했어요.'
        : collections.length === 0
          ? '공개된 컬렉션이 없습니다'
          : null;
  const statusTone = updateAliasMutation.isError || collectionsQuery.isError ? 'error' : 'muted';

  const handleStartEdit = () => {
    setAliasInput(alias ?? '');
    setIsEditingAlias(true);
    setIsMenuOpen(false);
  };

  const handleCancelEdit = () => {
    setIsEditingAlias(false);
  };

  // 329: 저장 경로가 <form onSubmit> 하나로 모였다 — 저장 버튼 클릭과 입력칸에서의 Enter가 같은
  // 경로를 탄다(이전에는 버튼 onClick뿐이라 Enter로는 아무 일도 일어나지 않았다).
  const handleSubmitAlias = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // 저장 버튼이 disabled면 브라우저의 암묵적 submit도 막히지만, 여기서 한 번 더 막는다 —
    // 이 가드는 버튼의 disabled 상태에 의존하지 않아야 중복 제출이 확실히 차단된다.
    if (updateAliasMutation.isPending) {
      return;
    }
    const trimmed = aliasInput.trim();
    // 공백 제거 후 빈 문자열은 alias: null로 보내 "제거"로 처리한다(08_API_명세.md 8.3, 기존 동작).
    updateAliasMutation.mutate(
      { followId, alias: trimmed === '' ? null : trimmed },
      { onSuccess: () => setIsEditingAlias(false) },
    );
  };

  // 329: ESC 취소. form은 Enter만 처리하므로 ESC는 직접 듣는다 — 저장 중에는 취소 버튼도 막혀
  // 있으므로 키보드 경로도 같이 막아 두 경로의 동작을 일치시킨다.
  const handleAliasKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && !updateAliasMutation.isPending) {
      event.preventDefault();
      handleCancelEdit();
    }
  };

  const showsAliasCount = ALIAS_MAX_LENGTH - aliasInput.length <= ALIAS_COUNT_VISIBLE_REMAINING;
  // 329 피드백 1: maxLength가 입력을 조용히 막기만 해서, 사용자는 "왜 안 써지는지" 알 수 없었다.
  // 상한에 닿은 상태 자체를 경고 조건으로 삼는다 — "넘기려고 시도한 순간"을 직접 잡는 방법(keydown
  // 감지)은 한글 IME 조합 중에는 event.key가 'Process'로 들어와 신뢰할 수 없다. 반면 길이가 상한과
  // 같으면 그 뒤 입력은 (한글이든 영문이든 붙여넣기든) 무조건 버려지므로, 이 조건이 곧 "더 이상
  // 입력되지 않는 상태"와 정확히 같다.
  const isAliasAtMaxLength = aliasInput.length >= ALIAS_MAX_LENGTH;

  // 348: 되돌리기 어려운 동작이라 확인을 한 겹 둔다. 재팔로우는 followId가 아니라 collectionId로만
  // 가능해서(08_API_명세 8.2), 실수로 해제하면 그 작성자의 컬렉션을 다시 찾아가야 복구된다.
  //
  // ⚠️ 여기서 메뉴를 닫지 않는다. 닫으면 방금 누른 "팔로우 해제" 버튼이 DOM에서 사라져,
  // 다이얼로그를 취소했을 때 포커스가 돌아갈 자리가 없어진다(ConfirmDialog의 복귀 대상은 열기
  // 직전에 포커스돼 있던 요소다). 메뉴는 다이얼로그 뒤에 그대로 열려 있다가, 해제가 성공하면
  // 카드와 함께 사라지고 취소하면 원래 자리로 돌아온다.
  const handleRequestUnfollow = () => {
    unfollowMutation.reset();
    setIsUnfollowConfirmOpen(true);
  };

  const handleCancelUnfollow = () => {
    setIsUnfollowConfirmOpen(false);
  };

  const handleConfirmUnfollow = () => {
    unfollowMutation.mutate(
      { followId },
      {
        onSuccess: () => {
          setIsUnfollowConfirmOpen(false);
          setIsMenuOpen(false);
        },
      },
    );
  };

  return (
    <>
      {isEditingAlias ? (
        // 295(요구사항 D): 편집 모드로 전환해도 상단 여백이 널뛰지 않도록 아래 비편집 상태와 동일한
        // h-7을 준다(295 추가 수정 이슈 4: py-1.5에서 h-7로 바뀐 이유는 아래 비편집 분기 주석 참고).
        // 329: <div>에서 <form>으로 바꿨다 — 입력칸에서 Enter를 누르면 저장되고(브라우저의 암묵적
        // submit), ESC로 취소된다(handleAliasKeyDown). 이전에는 input만 있어 Enter가 아무 일도 하지
        // 않았고, 사용자는 마우스로 저장 버튼까지 가야 했다.
        // 329: 자식들도 h-8(32px)에서 h-7(28px)로 낮춘다. h-8은 h-7 컨테이너를 위아래로 2px씩 넘치고
        // 있었다 — 행의 레이아웃 높이(28px)는 그대로여서 위 h-7이 지키는 세로 예산 계약은 어긋나지
        // 않았지만, 편집 모드에서만 입력칸이 헤더 밖으로 삐져나와 보였다.
        <form onSubmit={handleSubmitAlias} className="relative flex h-7 items-center gap-1.5">
          <label htmlFor={`follow-alias-${followId}`} className="sr-only">
            책장 별칭
          </label>
          <input
            id={`follow-alias-${followId}`}
            type="text"
            maxLength={ALIAS_MAX_LENGTH}
            value={aliasInput}
            onChange={(event) => setAliasInput(event.target.value)}
            onKeyDown={handleAliasKeyDown}
            disabled={updateAliasMutation.isPending}
            aria-describedby={showsAliasCount ? `follow-alias-count-${followId}` : undefined}
            // 메뉴에서 "별칭 수정"을 눌러 방금 열린 입력칸이라 포커스를 바로 준다 — Enter 저장이
            // 의미를 가지려면 손이 이미 키보드에 있어야 한다.
            autoFocus
            placeholder="별칭을 입력해 주세요"
            // 319: 이전엔 bg-white/10 + text-white + placeholder:text-white/40이라, 밝은 칸 배경에서
            // 입력 텍스트도 placeholder도 배경에 묻혀 사실상 보이지 않았다(편집 모드로 들어가야
            // 나타나는 UI라 화면 훑기로는 놓치기 쉬운 자리다). 흰 면 + 네이비 글자로 뒤집는다.
            className={`h-7 min-w-0 flex-1 rounded-lg border bg-snow-white px-2 text-xs text-pin-navy outline-none placeholder:text-ink-gray-light disabled:opacity-40 ${
              isAliasAtMaxLength
                ? 'border-red-400 focus:border-red-400'
                : 'border-line-card focus:border-log-mint'
            }`}
          />
          {/* 329: maxLength가 입력을 조용히 막아버려 "왜 더 안 써지는지" 알 수 없었다 — 상한 근처에서만
              남은 글자 수를 띄운다(ALIAS_COUNT_VISIBLE_REMAINING 주석에 폭 근거). tabular-nums는
              자릿수가 바뀔 때(9→10) 폭이 흔들려 입력칸이 밀리는 것을 막는다. */}
          {showsAliasCount && (
            <span
              id={`follow-alias-count-${followId}`}
              className={`flex-none text-[10px] tabular-nums ${
                isAliasAtMaxLength ? 'font-bold text-red-600' : 'text-ink-gray'
              }`}
            >
              {aliasInput.length}/{ALIAS_MAX_LENGTH}
            </span>
          )}

          {/* 329 피드백 1: 상한에 닿으면 이유를 문장으로 알린다. 이 행은 h-7이 계약이라(위 주석)
              문서 흐름에 문구를 넣으면 그만큼 아래 스크롤 박스가 줄어 선반이 밀린다 — absolute로
              띄워 레이아웃 높이를 전혀 차지하지 않게 한다. 덕분에 좁은 열에서도 한 줄 문장이 그대로
              들어간다(인라인 카운터 자리에는 "최대 20자" 정도밖에 못 넣는다).
              role="alert"로 스크린리더에도 즉시 전달한다. */}
          {isAliasAtMaxLength && (
            <p
              role="alert"
              className="absolute left-0 top-full z-10 mt-1 w-full rounded-md border border-red-200 bg-snow-white px-2 py-1 text-[10px] font-bold text-red-600 shadow-[0_4px_12px_rgba(4,33,66,.12)]"
            >
              별칭은 최대 {ALIAS_MAX_LENGTH}자까지 입력할 수 있어요
            </p>
          )}
          {/* 329: "저장"·"취소" 텍스트 버튼을 아이콘으로 줄였다. 좁은 열에서 텍스트 버튼 두 개가
              폭을 크게 먹어(각 약 40px) 입력칸이 별칭 20자를 담기에 좁았다 — 182px → 206px.
              규격은 이 헤더 행의 다른 아이콘 버튼(책장 관리)과 같은 ShelfIconButton이라 h-7이 자동으로
              지켜진다. 저장 중에는 둘 다 disabled여서 중복 제출·편집 이탈이 막힌다. */}
          <ShelfIconButton
            isSubmit
            label={updateAliasMutation.isPending ? '별칭 저장 중' : '별칭 저장'}
            disabled={updateAliasMutation.isPending}
          >
            <CheckIcon />
          </ShelfIconButton>
          <ShelfIconButton
            label="별칭 수정 취소"
            onClick={handleCancelEdit}
            disabled={updateAliasMutation.isPending}
          >
            <CloseIcon />
          </ShelfIconButton>
        </form>
      ) : (
        // 295 추가 수정: 별칭이 없을 때 "이름 없는 책장" 폴백 텍스트는 물론, 그 자리를 대신하던 점선
        // 박스도 DOM에 아예 렌더링하지 않는다 — 완전히 빈 공간 + 수정 버튼만 남는다. justify-between
        // 대신 버튼 쪽에 ml-auto를 줘서, 왼쪽 형제(h3)가 있든 없든(alias 유무) 버튼이 항상 오른쪽
        // 끝에 고정되게 한다(justify-between은 형제가 1개뿐이면 flex-start로 붙어버려 alias 유무에
        // 따라 버튼 위치가 널뛴다).
        // 295 반응형 재설계(요구사항 D): 캐비닛 상단과 이 헤더 행 사이 gap이 1열("내 컬렉션" pill이
        // 있는 MyShelfColumn)보다 좁아 보여, 처음엔 ShelfLabel(pill)의 py-1.5(6px)를 그대로 복사해
        // 붙였다(변경 전 0 → py-1.5=6px).
        // 295 추가 수정(이슈 4): 그런데 그 py-1.5가 이 행의 "총 높이"를 ShelfIconButton(h-7=28px)
        // 기준 28px+12px(패딩)=40px로 늘려버렸고, ShelfLabel의 원래 높이(패딩+11px 텍스트, 약 27px)
        // 보다 커져 두 열의 헤더 높이가 달라졌다 — ShelfColumn(flex flex-col)에서 헤더 다음에 오는
        // flex-1 스크롤 박스가 그 차이만큼 서로 다른 남는 높이를 갖게 돼, 내용(tier 수)이 같아도
        // "최하단 선반~캐비닛 바닥" 여백이 달라 보였다(이번 이슈 4의 실제 원인). py-1.5 대신 h-7
        // (28px, ShelfIconButton과 정확히 같은 높이이자 ShelfLabel도 이번에 h-7로 맞췄다)로 바꿔
        // 두 열의 헤더 높이를 픽셀 단위로 동일하게 만든다.
        <div className="flex h-7 items-center gap-2">
          {/* 329 피드백: 맨 텍스트 h3였던 별칭을 ShelfLabel(내 컬렉션 pill)로 바꾼다 — 같은 캐비닛
              안에서 1열은 pill, 나머지 열은 맨 텍스트라 두 열의 머리글이 다른 부품처럼 보였다.
              ShelfLabel도 h-7이라 이 행의 높이 계약이 그대로 지켜진다. */}
          {alias && <ShelfLabel>{alias}</ShelfLabel>}
          <div className="ml-auto flex flex-none items-center gap-1.5">
            {/* 329 피드백 2: 연필을 누르면 메뉴를 거치지 않고 바로 편집으로 들어간다. 이전에는
                연필 → 메뉴 → "별칭 수정"으로 클릭이 두 번이었는데, 이 헤더에서 압도적으로 잦은
                동작이 별칭 수정이라 자주 쓰는 쪽이 더 깊이 들어가 있었다. 되돌리기 어려운
                팔로우 해제만 메뉴 한 겹 안에 남긴다(오타 방지). */}
            <ShelfIconButton label="별칭 수정" onClick={handleStartEdit}>
              <PencilIcon />
            </ShelfIconButton>

            <div className="relative">
              <ShelfIconButton label="책장 관리" onClick={() => setIsMenuOpen((open) => !open)}>
                <MoreIcon />
              </ShelfIconButton>

              {isMenuOpen && (
                <div className="absolute right-0 top-9 z-10 w-36 rounded-lg border border-line-card bg-snow-white p-1.5 shadow-[0_12px_28px_rgba(4,33,66,.18)] ring-1 ring-pin-navy/5">
                  <button
                    type="button"
                    onClick={handleRequestUnfollow}
                    disabled={unfollowMutation.isPending}
                    aria-busy={unfollowMutation.isPending}
                    className="h-9 w-full rounded-md px-2.5 text-left text-xs font-bold text-pin-navy hover:bg-log-mint/10 disabled:opacity-40"
                  >
                    {/* 396: 라벨 교체 대신 스피너를 겹친다 — 메뉴 항목 글자가 흔들리지 않는다. */}
                    <PendingLabel pending={unfollowMutation.isPending}>팔로우 해제</PendingLabel>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ShelfColumnStatus message={statusMessage} tone={statusTone} />
      {/* 416: 로딩·오류에서도 선반은 그대로 깔린다(ShelfColumnSkeleton 주석). 문구만 띄우면
          목록이 도착할 때 선반이 통째로 나타나 "선반 수가 갑자기 바뀐다"로 보인다. */}
      {collectionsQuery.isPending ? (
        <ShelfColumnSkeleton rowCount={visibleRowCount} />
      ) : collectionsQuery.isError ? (
        <ShelfColumnSkeleton rowCount={visibleRowCount} />
      ) : (
        <FollowedShelfCollections
          followId={followId}
          columnSlot={columnSlot}
          visibleRowCount={visibleRowCount}
          collectionsQuery={collectionsQuery}
          onSelectCollection={(collectionId) => {
            void navigate({
              to: '/collections/$collectionId',
              params: { collectionId },
              state: { collectionOverlay: true },
            });
          }}
        />
      )}

      {/* 348: 문구에 별칭(없으면 일반 명칭)을 넣어 "어느 책장을 해제하는지"가 확인 화면에서
          보이게 한다 — 카드가 여러 열에 나란히 있어 어느 카드의 메뉴였는지 헷갈리기 쉽다. */}
      <ConfirmDialog
        isOpen={isUnfollowConfirmOpen}
        title={`'${alias ?? '이 책장'}' 팔로우를 해제할까요?`}
        description="해제하면 이 책장이 내 라이브러리에서 사라져요. 다시 팔로우하려면 그 작성자의 컬렉션을 찾아가야 해요."
        confirmLabel="해제"
        pendingLabel="해제 중…"
        tone="danger"
        isPending={unfollowMutation.isPending}
        errorMessage={unfollowMutation.isError ? unfollowMutation.error.message : null}
        onConfirm={handleConfirmUnfollow}
        onCancel={handleCancelUnfollow}
      />
    </>
  );
}

// 329: 헤더·편집 폼의 아이콘들. FeedList·LibraryPage의 화살표와 같은 규격(24x24 viewBox,
// currentColor stroke, h-3.5 w-3.5)이라 원형 버튼(ShelfIconButton) 안에서 크기가 맞는다.
// 연필은 원래 헤더에 인라인으로 박혀 있던 것을 아이콘이 넷으로 늘면서 함께 함수로 뺐다.
function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

// 가로 점 세 개. 연필(수정)과 뜻이 겹치지 않게 "그 밖의 관리"를 나타내는 일반적인 기호를 쓴다.
function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

interface FollowedShelfCollectionsProps {
  followId: number;
  columnSlot: number;
  visibleRowCount: number;
  collectionsQuery: ReturnType<typeof useFollowShelfCollectionsQuery>;
  onSelectCollection: (collectionId: number) => void;
}

function FollowedShelfCollections({
  followId,
  columnSlot,
  visibleRowCount,
  collectionsQuery,
  onSelectCollection,
}: FollowedShelfCollectionsProps) {
  const pages = collectionsQuery.data?.pages ?? [];
  const collections = pages.flatMap((page) => page.items);
  const hasNext = pages.length > 0 && pages[pages.length - 1].hasNext;

  // 287-14/287-16: seed로 followId를 쓴다 — 이 팔로우한 책장 하나를 안정적으로 식별하는 값이라,
  // 컬렉션 목록 순서가 바뀌어도 행별 권수(getRowCapacity) 패턴은 followId가 같은 한 그대로 유지된다.
  // columnSlot(2열=0, 3열=1)별로 다른 salt 구간을 더해, 다음 페이지에서 다른 followId가 들어와도(이미
  // followId 자체가 달라 대부분 다르지만) 그리고 2열·3열끼리도 seed 공간이 겹치지 않게 한다.
  const seedId =
    FOLLOWED_SHELF_SEED_SALT_BASE + columnSlot * FOLLOWED_SHELF_SEED_SALT_PER_SLOT + followId;
  const rows = chunkIntoShelfRows(collections, seedId);
  // 287-6: MyShelfColumn과 동일하게, 컬렉션이 적어 3행 미만이면 남는 행만큼 책 없는 빈 ShelfTier로
  // 채운다 — 선반 보드가 항상 고정 위치에 보이게 한다.
  // 295 추가 수정(이슈 4): collections.length===0일 때 예전엔 이 함수가 여기서 바로 <p>만 반환하고
  // 스크롤 박스·ShelfTier·ShelfBoard를 아예 그리지 않았다 — 팔로우한 책장이 0개인 열만 선반 보드
  // 자체가 안 보이는 원인이었다. MyShelfColumn(컬렉션 0개여도 추가 슬롯 tier + 빈 tier로 항상 3개
  // 선반을 그린다)과 똑같이, collections가 비어 있어도 rows=[]로 아래 스크롤 박스·ShelfTier 렌더링을
  // 그대로 통과시킨다 — getEmptyTierPadding(0)=3이라 빈 선반 3개가 그려진다. 안내 문구는 스크롤 박스
  // "위"의 별도 텍스트로만 남긴다(MyShelfColumn의 "아직 만든 컬렉션이 없어요."와 동일한 패턴).
  const emptyTierCount = getEmptyTierPadding(rows.length, visibleRowCount);

  return (
    <>
      {/* 287-8/319: MyShelfColumn과 동일하게 flex-1 min-h-0이다 — 팔로우한 책장의 책 수와
          무관하게, 부모(ShelfColumn)가 내어주는 세로 공간을 그대로 채운다(319에서 min-h-[360px]/
          max-h-[590px] 고정 캡을 없앤 이유는 MyShelfList.tsx 상단 주석 참고). paddingTop/
          paddingLeft/paddingRight는 MyShelfColumn과 동일 이유(호버 리프트·기울기 clip 방지)로 맞춘다 —
          자세한 근거는 shelfSpine.ts의 SHELF_SCROLL_TOP_PADDING_PX·SHELF_SCROLL_SIDE_PADDING_PX 주석
          참고. 타이어 사이 gap도 MyShelfColumn과 동일하게 gap-1.5로 맞춘다.
          287-18: "더보기" 버튼 대신 onScroll로 바닥 근처에 닿으면 다음 페이지를 자동으로 불러온다 —
          MyShelfColumn과 동일한 handleShelfScrollFetchNext를 공유한다. */}
      <div
        style={{
          // 416/22번: 행 높이 기준(ShelfTier 주석). 데이터가 아니라 visibleRowCount가 정한다.
          ['--shelf-rows' as string]: visibleRowCount,
          paddingTop: SHELF_SCROLL_TOP_PADDING_PX,
          paddingBottom: SHELF_SCROLL_BOTTOM_PADDING_PX,
          paddingLeft: SHELF_SCROLL_SIDE_PADDING_PX,
          paddingRight: SHELF_SCROLL_SIDE_PADDING_PX,
        }}
        onScroll={(event) =>
          handleShelfScrollFetchNext(event, {
            hasNext,
            isFetchingNextPage: collectionsQuery.isFetchingNextPage,
            fetchNextPage: () => void collectionsQuery.fetchNextPage(),
          })
        }
        className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto"
      >
        {rows.map((row, rowIndex) => (
          <ShelfTier key={rowIndex}>
            {row.items.map((collection, indexInRow) => (
              <ShelfBookSpine
                key={collection.collectionId}
                index={row.startIndex + indexInRow}
                collectionId={collection.collectionId}
                title={collection.title}
                recordCount={collection.recordCount}
                onClick={() => onSelectCollection(collection.collectionId)}
              />
            ))}
          </ShelfTier>
        ))}

        {Array.from({ length: emptyTierCount }, (_, emptyIndex) => (
          <ShelfTier key={`empty-${emptyIndex}`}>{null}</ShelfTier>
        ))}

        {collectionsQuery.isFetchingNextPage && (
          <p className="flex-none py-1 text-center text-xs text-ink-gray">불러오는 중…</p>
        )}
      </div>
    </>
  );
}
