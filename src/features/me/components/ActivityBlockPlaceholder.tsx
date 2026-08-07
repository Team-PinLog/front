import type { ReactNode } from 'react';

/**
 * 기록 0건일 때도 **2×2 격자와 카드 4장은 그대로 둔다**(docs 이슈 #55 빈 상태 규칙 — 카드가 자리를
 * 지키면 안이 비지 않는다. 섹션을 숨기면 오히려 화면이 무너진다). 카드 안만 이 문구로 채운다.
 *
 * 높이를 막대 영역과 같게 잡아(h-40 / xl:h-52) 빈 상태와 채워진 상태의 카드 높이가 같다 — 첫
 * 기록을 남긴 순간 격자가 출렁이지 않는다.
 */
export function ActivityBlockPlaceholder({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-line-card text-sm text-ink-gray-light xl:h-52">
      {children}
    </div>
  );
}
