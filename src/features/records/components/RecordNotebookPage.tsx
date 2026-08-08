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
 *
 * 415: 시안대로 페이지를 **줄였다**. 이전 1120x880은 "펼침면"이라기보다 문서 뷰어에 가까웠다 —
 * 좌우가 넓어 포스트잇 무리와 사진이 서로 멀어졌고, 다이어리 한 면이라는 인상이 나오지 않았다.
 * 최대 폭을 껍데기(오버레이 셸·딥링크 페이지)가 아니라 여기서 잡아 두 사용처가 한 번에 같은
 * 크기로 바뀐다.
 *
 * 415 실물 피드백: 880x700은 **너무 줄었다**. 좌측 콜라주는 포스트잇 세 장만 쌓여도 추가 자리가
 * 스크롤 밖으로 밀렸고, 우측 폴라로이드는 존재감이 나오지 않았다. 1120과 880 사이에서 1000x760으로
 * 잡는다 — 원래보다 폭 -120px/높이 -120px이라 "작게"는 지켜지고, 좌측 열에 ≈548px, 우측 열에
 * 340px이 남아 포스트잇 무리와 폴라로이드가 둘 다 숨 쉰다.
 */
export function RecordNotebookPage({ onClose, children }: RecordNotebookPageProps) {
  return (
    <div className="relative mx-auto w-full max-w-[1000px]">
      {/* page stack behind — 시안의 "노트 뒤에 쌓인 종이" 연출 */}
      <div className="pointer-events-none absolute inset-0 translate-x-[14px] translate-y-[14px] rounded-[18px] bg-[#f2ece5] shadow-[0_24px_48px_-20px_rgba(60,54,48,0.28)]" />
      <div className="pointer-events-none absolute inset-0 translate-x-[7px] translate-y-[7px] rounded-[18px] bg-[#faf7f6] shadow-[0_18px_36px_-18px_rgba(60,54,48,0.22)]" />

      <div
        // 17: 콘텐츠가 종이 가장자리에 붙어 있어 사방 여백을 키웠다(px 40→56, pt 36→48, pb 32→44).
        // 바깥 크기(1000px)는 그대로라 안쪽 콘텐츠 폭이 920→888px로 줄고, 그만큼 포스트잇 폭·배치를
        // 다시 맞췄다(contextNoteScatter). 닫기 ✕는 종이 모서리 기준이라 자리를 바꾸지 않는다.
        className="relative z-10 flex h-[min(760px,calc(100dvh-72px))] min-h-[520px] flex-col rounded-[18px] bg-white px-6 pb-9 pt-10 shadow-[0_30px_60px_-24px_rgba(60,54,48,0.35)] sm:px-14 sm:pb-11 sm:pt-12"
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
            className="absolute right-5 top-5 z-30 grid h-9 w-9 place-items-center rounded-full bg-[#f0ece7] text-[15px] text-[#6f6a63] transition-colors hover:bg-[#e2ddd6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4f9b78] sm:right-6 sm:top-6"
          >
            ✕
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
