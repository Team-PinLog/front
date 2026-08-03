import type { ReactNode } from 'react';

// 287-9: Feed("새로운 장소를 발견해 보세요", text-2xl — Tailwind 스케일 유틸이라 line-height 2rem이
// 함께 고정된다)와 Library("나의 책장", text-[27px] — 임의값이라 line-height가 브라우저 기본값
// "normal"로 폰트 지표에 맡겨진다)가 서로 다른 h1 스타일을 쓰면서, 두 페이지의 실제 타이틀 렌더링
// 높이가 미세하게 달라졌다. 캐비닛이 flex-1로 "남는 세로 공간"을 채우는 구조라(FeedPage/
// LibraryPage), 타이틀 높이가 페이지마다 다르면 캐비닛 높이도 따라 달라져 페이지 전환 시 화면이
// "이동하는" 것처럼 보였다 — 게다가 Feed 쪽 문구가 훨씬 길어(13자 vs 5자), 좁은 뷰포트에서 Feed만
// 2줄로 줄바꿈될 위험도 있어 그 구간에서는 차이가 더 벌어질 수 있었다.
// 각 페이지의 폰트 크기·굵기(디자인 의도)는 className으로 그대로 넘겨 유지하되, 바깥 박스 높이는
// 이 컴포넌트가 고정 height + truncate(항상 1줄)로 강제한다 — 텍스트 길이나 줄바꿈 여부와 무관하게
// 두 페이지의 타이틀 슬롯이 항상 정확히 같은 높이를 차지한다. 여기서 딱 한 번만 정의하므로, 두
// 페이지가 각자 비슷한 값을 추정해 어긋날 여지가 없다.
const TITLE_HEIGHT_PX = 40;

interface PageTitleProps {
  children: ReactNode;
  className?: string;
}

export function PageTitle({ children, className = '' }: PageTitleProps) {
  return (
    <h1
      style={{ height: TITLE_HEIGHT_PX }}
      className={`flex flex-none items-center truncate ${className}`}
    >
      {children}
    </h1>
  );
}
