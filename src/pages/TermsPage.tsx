import { useNavigate } from '@tanstack/react-router';

const SECTIONS: { heading: string; body: string | string[] }[] = [
  {
    heading: '제1조 목적',
    body: '이 약관은 PinLog가 제공하는 장소 기록, 저장, 추천 및 관련 서비스의 이용 조건과 절차, 이용자와 서비스 간 권리와 의무를 정합니다.',
  },
  {
    heading: '제2조 서비스 이용',
    body: [
      '이용자는 SNS 계정 로그인 등 PinLog가 제공하는 방식으로 서비스를 이용할 수 있습니다.',
      '서비스 화면, 기능, 콘텐츠 구성은 운영 상황에 따라 변경될 수 있습니다.',
      '이용자는 타인의 권리를 침해하거나 서비스 운영을 방해하는 방식으로 서비스를 이용할 수 없습니다.',
    ],
  },
  {
    heading: '제3조 기록 콘텐츠',
    body: '이용자가 작성한 장소, 메모, 컬렉션 등의 콘텐츠에 대한 책임은 작성자에게 있습니다. PinLog는 서비스 제공과 화면 표시를 위해 필요한 범위에서 해당 콘텐츠를 처리할 수 있습니다.',
  },
  {
    heading: '제4조 서비스 중단 및 변경',
    body: '시스템 점검, 장애 대응, 기능 개선 등 필요한 경우 서비스의 전부 또는 일부가 일시적으로 제한될 수 있습니다.',
  },
  {
    heading: '제5조 문의',
    body: '약관 관련 문의는 서비스 내 고객지원 또는 운영자가 지정한 연락 채널을 통해 접수할 수 있습니다.',
  },
];

export function TermsPage() {
  const navigate = useNavigate();

  function closeToLogin() {
    navigate({ to: '/login' });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-pin-navy/60 px-4 py-8"
      onClick={closeToLogin}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="이용약관"
        className="relative flex max-h-full w-full max-w-2xl flex-col rounded-lg border border-line-card bg-paper-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="닫기"
          onClick={closeToLogin}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-ink-gray transition hover:bg-line-subtle hover:text-pin-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-log-mint"
        >
          <span aria-hidden="true" className="text-xl leading-none">
            ×
          </span>
        </button>
        <div className="overflow-y-auto px-8 py-10">
          <h1 className="mb-2 text-2xl font-bold text-pin-navy">이용약관</h1>
          <p className="mb-6 text-xs text-ink-gray">시행일: 2026년 7월 26일</p>
          {SECTIONS.map((section) => (
            <section
              key={section.heading}
              className="border-t border-line-subtle py-5 first:border-t-0"
            >
              <h2 className="mb-2 text-base font-bold text-pin-navy">{section.heading}</h2>
              {Array.isArray(section.body) ? (
                <ul className="list-disc space-y-1 pl-5">
                  {section.body.map((item) => (
                    <li key={item} className="text-sm leading-relaxed text-ink-gray">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-relaxed text-ink-gray">{section.body}</p>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
