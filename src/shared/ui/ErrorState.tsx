import type { ReactNode } from 'react';

interface ErrorStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * 공용 에러 상태 표시. 브랜드 토큰(paper-white·line-card·ink-gray·pin-navy)만 쓴다.
 * 319: 면 색(bg-paper-white)이 페이지 배경과 같은 값이라, 밝은 화면에서는 박스 경계가 전혀 보이지
 * 않고 문구만 떠 있는 것처럼 보였다 — 테두리 한 겹을 둬서 "에러 상태 박스"임이 드러나게 한다.
 */
export function ErrorState({ icon, title, description, action }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-line-card bg-paper-white p-8 text-center">
      {icon}
      <p className="text-base font-bold text-pin-navy">{title}</p>
      {description && <p className="text-sm text-ink-gray">{description}</p>}
      {action}
    </div>
  );
}
