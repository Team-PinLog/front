import { useEffect, useRef, type ReactNode } from 'react';
import { FOCUSABLE_SELECTOR } from '@/shared/lib/focusableSelector';

interface CollectionOverlayShellProps {
  /** 돌아갈 앱 내 지점이 있을 때만 넘어온다. 없으면 ESC로 닫을 곳도 없다(직접 URL·공유 링크 진입). */
  onClose?: () => void;
  children: ReactNode;
}

/**
 * Collection 상세를 **책 펼침면 모달**로 띄우는 셸. 근거: Jira S15P11A705-207, 332 디자인 피드백,
 * 418 코멘트 2의 3번.
 *
 * ## 418에서 바뀐 것
 *
 * - **라우트 이동이 아니라 모달이다.** 컬렉션을 열면 원래 보던 화면 위에 책이 펼쳐진다.
 *   별도 딤·블러 배경은 두지 않아 새 페이지처럼 화면 전체를 다시 칠하지 않는다.
 *   **URL은 그대로 둔다**(사용자 확정 (a)안) — 라우트가 이 모달을 렌더하는
 *   형태라 뒤로가기·새로고침·공유·Feed CLICK 파라미터(`feedRequestId`/`feedPosition`) 흐름이
 *   그대로 살아 있다.
 * - **ESC·포커스 트랩·포커스 복귀**를 385 설정 모달·ConfirmDialog와 같은 규칙으로 건다. 332 시절
 *   이 셸은 그냥 블러 배경일 뿐이라 Tab이 뒤 화면으로 새어 나갔다.
 *
 * ⚠️ **배경 클릭으로 닫지 않는다**(사용자 확정: "x 버튼을 누를 때만 닫히는 건 좋아"). 읽는 중에
 * 배경을 잘못 눌러 책이 닫히는 사고를 막는 편을 택한 것이다. 닫는 길은 펼침면 우상단 ✕와 ESC다.
 *
 * z-40인 이유는 Collection 삭제/제목수정 확인 다이얼로그가 z-50에 렌더되기 때문 — 항상 이 위에 떠야 한다.
 */
export function CollectionOverlayShell({ onClose, children }: CollectionOverlayShellProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // 모달 최초 포커스 + 복귀: 셸 자체에 포커스를 주어 직접 URL에서도 aria-modal 의미가 실제
  // 키보드 동작과 일치하게 한다. 내부 진입은 닫힐 때 책장의 그 책/Feed 카드로 되돌린다.
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      if (
        onClose &&
        previouslyFocused instanceof HTMLElement &&
        document.contains(previouslyFocused)
      ) {
        previouslyFocused.focus();
      }
    };
  }, [onClose]);

  // ESC 닫기 + 포커스 트랩. 직접 URL은 돌아갈 지점이 없어 ESC만 비활성이고, Tab containment는
  // 항상 유지한다 — aria-modal은 보조기술에만 알릴 뿐 실제 Tab 순서를 막아주지 않는다.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onClose) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || panelRef.current === null) {
        return;
      }
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusables.length === 0) {
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      const isInside = panelRef.current.contains(active);

      if (active === panelRef.current) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey && (active === first || !isInside)) {
        event.preventDefault();
        last.focus();
        return;
      }
      if (!event.shiftKey && (active === last || !isInside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    // overflow-y-auto는 마지막 안전장치다 — 펼침면은 뷰포트 높이에 맞춰져 있어(CollectionSpreadPage)
    // PC 폭에서는 돌지 않는다. md 미만에서 두 면이 위아래로 쌓일 때만 쓰인다.
    <div className="fixed inset-0 z-40 overflow-y-auto overscroll-contain">
      {/* 332는 세로 중앙 정렬을 금지했다 — 장마다 높이가 달라 콘텐츠 전체가 위아래로 흔들리며
          "번쩍임"으로 보였기 때문이다. 418에서 펼침면 높이가 `min(760px, 100dvh-88px)`로 **고정**
          되면서 그 전제가 사라져(장을 넘겨도 높이가 변하지 않는다) 다시 중앙에 세운다 — 1080p에서
          위로 붙어 있으면 아래가 통째로 비어 책이 떠 있지 않고 매달린 것처럼 보였다(실렌더 확인).
          md 미만에서는 두 면이 위아래로 쌓여 뷰포트보다 커질 수 있어 그때만 위에서부터 쌓는다
          (중앙 정렬은 넘치는 콘텐츠의 윗부분을 스크롤로도 닿지 못하게 잘라낸다). */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="컬렉션 펼침면"
        className="flex min-h-full w-full items-start justify-center py-4 outline-none md:items-center"
      >
        {children}
      </div>
    </div>
  );
}
