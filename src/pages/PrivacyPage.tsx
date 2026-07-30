import { useNavigate } from '@tanstack/react-router';

const SECTIONS: { heading: string; body: string | string[] }[] = [
  {
    heading: '수집하는 개인정보',
    body: 'PinLog는 로그인 및 서비스 제공을 위해 SNS 계정 식별 정보, 프로필 이름, 서비스 이용 기록, 이용자가 직접 입력한 장소와 메모 정보를 처리할 수 있습니다.',
  },
  {
    heading: '개인정보 이용 목적',
    body: [
      '회원 식별 및 로그인 상태 유지',
      '장소 기록, 저장, 컬렉션 등 핵심 기능 제공',
      '서비스 품질 개선, 오류 확인 및 고객지원',
    ],
  },
  {
    heading: '보관 및 파기',
    body: '개인정보는 서비스 제공에 필요한 기간 동안 보관되며, 목적 달성 또는 이용자의 삭제 요청 시 관련 법령에 따라 지체 없이 파기됩니다.',
  },
  {
    heading: '제3자 제공 및 처리 위탁',
    body: 'PinLog는 법령에 근거가 있거나 이용자의 동의가 있는 경우를 제외하고 개인정보를 외부에 제공하지 않습니다. 외부 서비스 연동이 필요한 경우 필요한 범위와 목적을 안내합니다.',
  },
  {
    heading: '이용자의 권리',
    body: '이용자는 자신의 개인정보 열람, 수정, 삭제, 처리 정지를 요청할 수 있습니다. 요청은 서비스 내 고객지원 또는 운영자가 지정한 연락 채널을 통해 접수할 수 있습니다.',
  },
];

export function PrivacyPage() {
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
        aria-label="개인정보 처리방침"
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
          <h1 className="mb-2 text-2xl font-bold text-pin-navy">개인정보 처리방침</h1>
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
