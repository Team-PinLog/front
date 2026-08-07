import type { ReactNode } from 'react';

interface RecordNotebookPageProps {
  /** 넘기면 우상단에 ✕ 닫기 버튼이 생긴다(홈 오버레이 전용 — 딥링크 페이지는 닫을 대상이 없다). */
  onClose?: () => void;
  children: ReactNode;
}

/**
 * 373 시안(핀 상세 화면.dc.html)의 "노트 페이지" 껍데기.
 * 뒤에 종이 2겹(오프셋 7px/14px) + 흰 페이지 + 미세 도트 그리드 + radius 14px.
 *
 * 값(색·오프셋·그림자·도트 4px)은 같은 계열 시안인 장소 기록 팝업(S15P11A705-323/366,
 * PlaceRecordSheet.tsx 593~603줄)이 이미 그대로 구현해 둔 것을 따른다 — 두 화면은 같은 "노트"
 * 연출이라 값이 어긋나면 안 되고, 이 색들은 브랜드 팔레트가 아니라 시안 전용이라 tailwind.config
 * 토큰으로 올리지 않는다(그 파일은 공유 파일이라 수정 전 보고 대상이기도 하다).
 *
 * 시안의 aspect-ratio 3/4은 폭 1080px 기준 높이 1440px이라 모달·1080p 화면에 들어가지 않는다.
 * 대신 뷰포트에 맞춰 높이를 제한하고 안쪽에서 스크롤한다(장소 기록 팝업과 같은 처리).
 */
export function RecordNotebookPage({ onClose, children }: RecordNotebookPageProps) {
  return (
    <div className="relative w-full">
      {/* page stack behind — 시안의 "노트 뒤에 쌓인 종이" 연출 */}
      <div className="pointer-events-none absolute inset-0 translate-x-[14px] translate-y-[14px] rounded-[14px] bg-[#f6f4f1] shadow-[0_24px_48px_-20px_rgba(60,54,48,0.28)]" />
      <div className="pointer-events-none absolute inset-0 translate-x-[7px] translate-y-[7px] rounded-[14px] bg-[#fbfaf8] shadow-[0_18px_36px_-18px_rgba(60,54,48,0.22)]" />

      <div
        className="relative z-10 flex h-[min(880px,calc(100dvh-96px))] min-h-[560px] flex-col rounded-[14px] bg-white px-6 pb-8 pt-9 shadow-[0_30px_60px_-24px_rgba(60,54,48,0.35)] sm:px-[52px] sm:pb-10 sm:pt-11"
        style={{
          backgroundImage: 'radial-gradient(rgba(120,110,100,0.025) 1px, transparent 1px)',
          backgroundSize: '4px 4px',
        }}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute right-6 top-6 z-20 grid h-11 w-11 place-items-center rounded-full bg-[#efece8] text-lg text-[#6f6a63] transition-colors hover:bg-[#e2ddd6] sm:right-[26px] sm:top-[26px]"
          >
            ✕
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
