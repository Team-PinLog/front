import type { ReactNode } from 'react';

interface ErrorStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** 공용 에러 상태 표시. 브랜드 토큰(paper-white·ink-gray·pin-navy)만 쓴다. */
export function ErrorState({ icon, title, description, action }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg bg-paper-white p-8 text-center">
      {icon}
      <p className="text-base font-bold text-pin-navy">{title}</p>
      {description && <p className="text-sm text-ink-gray">{description}</p>}
      {action}
    </div>
  );
}
