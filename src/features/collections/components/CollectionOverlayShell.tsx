import type { ReactNode } from 'react';

/**
 * Collection 상세를 내부 진입(Feed·내 책장·팔로우한 책장)으로 열었을 때, 원래 보던 화면을 **흐리게**
 * 깔고 그 위에 책과 책장만 띄우는 셸. 근거: Jira S15P11A705-207, S15P11A705-332 디자인 피드백.
 *
 * 332의 변천: ① 처음에는 dimmed backdrop + 중앙 흰 카드였고, ② "책이 그냥 떠 있으면 좋겠다"는
 * 피드백으로 둘 다 걷어냈더니 뒤 화면이 통째로 사라진 풀스크린이 됐고, ③ 다시 "기존 페이지가
 * 블러되고 그 위에 책과 책장만"으로 확정됐다. 그래서 지금은 **카드는 없고 블러 배경만** 있다 —
 * 책·책장이 자기 그림자만으로 배경에서 떠 보이고, 뒤 화면의 형태는 흐릿하게 남는다.
 *
 * ⚠️ 배경 클릭으로 닫지 않는다(사용자 확정: "x 버튼을 누를 때만 닫히는 건 좋아"). 그래서 이 요소에는
 * onClick이 없고, 닫기 진입점은 책 우상단의 CollectionOverlayCloseButton 하나뿐이다. 읽는 중에
 * 배경을 잘못 눌러 책이 닫히는 사고를 막는 편을 택한 것이다.
 *
 * 직접 URL·공유 링크 진입은 이 셸로 감싸지 않는다 — 뒤에 흐리게 깔 화면도, history.back()으로 돌아갈
 * 앱 내 지점도 없기 때문이다. 그 판단은 호출부(CollectionDetailPage)가 location.state로 한다.
 * z-40인 이유는 Collection 삭제/제목수정 확인 다이얼로그가 z-50에 렌더되기 때문 — 항상 이 위에 떠야 한다.
 */
export function CollectionOverlayShell({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-pin-navy/20 backdrop-blur-md">
      {/* ⚠️ items-center(세로 중앙)로 두면 안 된다 — 안쪽 높이가 조금만 달라져도 콘텐츠 전체가
          위아래로 움직여 "번쩍임"으로 보인다(332 피드백). 실제로 목차 장과 record 장은 하단 표시 줄·
          모바일 페이지 높이가 서로 달랐고, 그 차이가 중앙 정렬 때문에 화면 전체의 흔들림으로
          증폭됐다. 위에서부터 쌓아 두면 높이 변화가 아래쪽으로만 흡수된다. */}
      <div className="flex min-h-full w-full items-start justify-center py-2">{children}</div>
    </div>
  );
}

interface CollectionOverlayCloseButtonProps {
  onClose: () => void;
}

/**
 * 책 우상단에 얹는 닫기(X) 버튼. 화면 모서리에 고정하지 않고 책에 붙여 두는 이유는, 블러 배경 위에서
 * "지금 닫히는 대상이 이 책"이라는 게 위치로 드러나야 하기 때문이다(사용자 지시).
 * 위치 지정은 이 버튼을 쓰는 쪽(CollectionDetailView의 책 래퍼)이 absolute로 한다.
 */
export function CollectionOverlayCloseButton({ onClose }: CollectionOverlayCloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="닫기"
      className="absolute -right-3 -top-3 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-line-card bg-snow-white text-lg text-ink-gray shadow-md transition-colors hover:text-pin-navy"
    >
      ×
    </button>
  );
}
