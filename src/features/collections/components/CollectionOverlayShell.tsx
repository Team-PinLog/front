import type { ReactNode } from 'react';

interface CollectionOverlayShellProps {
  onClose: () => void;
  children: ReactNode;
}

/**
 * Feed·내 책장·팔로우한 책장 등 내부 진입 시 Collection 상세를 dimmed backdrop + 중앙 카드로 감싼다.
 * 근거: Jira S15P11A705-207. RecordDetailOverlay.tsx(165)와 동일한 구조지만, Collection 상세는
 * 라우트 자체가 바뀌어야 해서(공유 가능한 URL 유지) 로컬 state가 아니라 CollectionDetailPage가
 * location.state(collectionOverlay)를 보고 이 셸로 감쌀지 판단한다. z-40으로 둔 이유는 Collection
 * 삭제/제목수정 확인 다이얼로그(CollectionDeleteConfirmDialog·EditCollectionTitleDialog)가 형제로
 * z-50에 렌더되기 때문 — 이 셸보다 항상 위에 떠야 한다.
 */
export function CollectionOverlayShell({ onClose, children }: CollectionOverlayShellProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-pin-navy/25 p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative max-h-[calc(100dvh-48px)] w-[min(960px,calc(100vw-48px))] overflow-y-auto rounded-3xl bg-paper-white shadow-[0_40px_90px_-30px_rgba(4,33,66,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* 332 시안: 닫기 버튼도 헤더 버튼과 같은 "흰 면 + 라이트 아웃라인" 톤으로 맞춘다. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-line-card bg-snow-white text-lg text-ink-gray shadow-sm transition-colors hover:text-pin-navy"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

interface CollectionFullscreenCloseButtonProps {
  onClose: () => void;
}

/**
 * state.collectionOverlay는 있지만 방금 클릭해서 들어온 게 아닌 경우(새로고침으로 재진입, 207 후속)를
 * 위한 처리 — dimmed backdrop·중앙 카드 없이 풀스크린 그대로 두고 우측 상단에 닫기(X) 버튼만 얹는다.
 * "뒤로 가면 Feed/책장으로 돌아갈 수 있다"는 걸 알려주는 용도. 클릭 시 CollectionOverlayShell과 동일하게
 * history back으로 돌아간다.
 */
export function CollectionFullscreenCloseButton({ onClose }: CollectionFullscreenCloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="닫기"
      className="fixed right-5 top-5 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-line-card bg-snow-white text-lg text-ink-gray shadow-md transition-colors hover:text-pin-navy"
    >
      ×
    </button>
  );
}
