import { useEffect, useRef, type ReactNode } from 'react';
import { useLayoutMetrics } from '@/shared/lib/LayoutMetricsContext';

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
// 295 추가 수정(요구사항 2.2): xl(≥1280)은 기존 40px(h-10)을 유지하고, sm·mdlg(<1280)는 32px(h-8)로
// 줄인다 — 고정 UI(타이틀 영역)가 차지하는 비중을 줄인다.
// 330 주의: 여기서 xl:은 "사이드바가 있는 구간"이 아니라 큰 화면의 타이포 위계다(사이드바는 md부터
// 있다). 경계를 md로 내리면 mdlg 세로 예산이 8px 줄어들어 그대로 뒀다.
// 295 추가 수정(이슈 1.1): 이 고정 height는 여전히 "두 페이지 타이틀 슬롯을 똑같이 맞추는" 용도로
// 남겨두되, 실제 렌더링된 높이를 ref+ResizeObserver로 측정해 LayoutMetricsContext에 보고한다 —
// FeedList의 캐비닛 세로 예산 계산이 32/40 같은 하드코딩 상수 대신 이 실측값을 쓴다.
// 313: 제목 아래 한 줄 설명(description)을 받는다. 핵심은 ResizeObserver 대상을 h1에서 "제목+설명"
// 래퍼로 옮긴 것이다 — 설명을 PageTitle 바깥(<main>의 형제)에 두면 측정에서 빠져 titleHeightPx가
// 실제보다 작게 보고되고, getPageContentBudgetPx가 그만큼 세로 예산을 과대 계상해 sm·mdlg에서 책장
// 마지막 행이 잘린다. LayoutMetricsContext가 고정하는 것은 값이 아니라 "누가 무엇을 실측해 보고하는가"
// 라는 책임이므로, 타이틀 영역이 커지면 보고 대상도 그 영역 전체가 되어야 한다.
// 설명은 truncate하지 않는다 — 래퍼를 재기 때문에 좁은 폭에서 2줄이 돼도 예산에 정확히 반영된다.
// h1의 고정 height + truncate는 그대로 둔다(위 287-9의 "두 페이지 제목 슬롯 높이 일치" 목적 유지).
interface PageTitleProps {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
}

export function PageTitle({ children, className = '', description }: PageTitleProps) {
  const { reportTitleHeightPx } = useLayoutMetrics();
  const blockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = blockRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        reportTitleHeightPx(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [reportTitleHeightPx]);

  // description이 없으면 gap-1은 효과가 없고 래퍼 높이 = h1 높이라, 기존 호출부의 렌더 결과가 그대로다.
  return (
    <div ref={blockRef} className="flex flex-none flex-col gap-1">
      <h1 className={`flex h-8 flex-none items-center truncate xl:h-10 ${className}`}>
        {children}
      </h1>
      {description ? <p className="text-sm text-ink-gray">{description}</p> : null}
    </div>
  );
}
