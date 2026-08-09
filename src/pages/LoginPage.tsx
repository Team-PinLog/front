import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { PaperStage } from '@/features/paper/components/PaperStage';
import {
  CoverFrame,
  CoverLabelBetweenRules,
  CoverPaper,
  CoverRule,
  CoverTitle,
} from '@/features/feed/components/covers/coverParts';
import { savePreLoginPath } from '@/features/auth/lib/preLoginPath';
import {
  redirectToProviderLogin,
  type SocialProvider,
} from '@/features/auth/lib/redirectToProviderLogin';

/**
 * S15P11A705-420 — "표지를 여는" 로그인(A안, 사용자 승인).
 *
 * 종이 무대(PaperStage) 위에 PinLog 자체를 표지 한 권으로 앉힌다. 표지 부품은
 * features/feed/components/covers/coverParts.tsx를 그대로 가져다 쓴다 — 새로 그리지 않는 이유는
 * 그 파일 상단 주석이 말하는 "판형은 배치만 결정하고 글자·괘선의 생김새는 전부 거기서 온다"는
 * 규칙을 로그인 화면에서도 지키기 위해서다. CoverFooter(레코드 수·생성일)처럼 컬렉션 전용 슬롯만
 * 가져오지 않았다.
 *
 * 진입 시퀀스: 압정이 먼저 꽂히고(핀 낙하는 tailwind.config.js의 pin-stand를 재사용 — 새 낙하
 * 모션을 또 만들 이유가 없다), 표지가 뒤이어 떠오르며 자리를 잡고(login-cover-in,
 * src/index.css), 소셜 버튼이 순서대로 스태거 등장한다(login-item-in). prefers-reduced-motion에서는
 * index.css의 media 쿼리가 세 애니메이션을 모두 지우고 최종 배치를 즉시 보여준다.
 *
 * ⚠️ 인증 흐름(핸들러 호출·aria-label·리다이렉트)은 이전 템플릿에서 그대로 가져왔다 — 바꾼 것은
 * 생김새뿐이다.
 */

function handleProviderClick(provider: SocialProvider) {
  savePreLoginPath();
  redirectToProviderLogin(provider);
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function NaverIcon() {
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center text-sm font-extrabold"
      aria-hidden="true"
    >
      N
    </span>
  );
}

function KakaoIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#3C1E1E"
        d="M12 3C6.99 3 3 6.19 3 10.13c0 2.52 1.68 4.73 4.21 5.99-.14.5-.9 3.1-.93 3.3 0 0-.02.16.08.22.1.06.23.01.23.01.3-.04 3.44-2.25 3.98-2.63.46.06.94.1 1.43.1 5.01 0 9-3.19 9-7.13S17.01 3 12 3z"
      />
    </svg>
  );
}

const PROVIDERS: {
  id: SocialProvider;
  label: string;
  ariaLabel: string;
  className: string;
  icon: ReactNode;
}[] = [
  {
    id: 'google',
    label: 'Google로 계속하기',
    ariaLabel: 'Google 계정으로 로그인',
    className: 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50',
    icon: <GoogleIcon />,
  },
  {
    id: 'naver',
    label: '네이버로 계속하기',
    ariaLabel: '네이버 계정으로 로그인',
    className: 'border border-[#03C75A] bg-[#03C75A] text-white hover:bg-[#02b352]',
    icon: <NaverIcon />,
  },
  {
    id: 'kakao',
    label: '카카오로 계속하기',
    ariaLabel: '카카오 계정으로 로그인',
    className: 'border border-[#FEE500] bg-[#FEE500] text-[#3C1E1E] hover:bg-[#f2d900]',
    icon: <KakaoIcon />,
  },
];

// 표지 카드의 뿌리 글자 크기 — coverParts는 "1em = 표지 폭의 8%"로 설계돼 있다(coverParts.tsx
// 상단 주석). 카드 폭이 min(92vw,640px)이므로 그 폭의 8%를 그대로 clamp로 옮긴다:
//   0.08 * min(92vw, 640px) = min(7.36vw, 51.2px)
// vw 계수를 카드 폭 비율과 다르게 잡으면(예: 낮은 계수) 좁은 화면에서 clamp가 하한에 눌려붙어
// 루트 글자가 실제 카드 폭보다 커지고, CoverLabelBetweenRules의 라벨(shrink-0)이 카드 밖으로
// 밀려 잘린다 — 375px 실렌더에서 실제로 "YOUR JOURNAL, PREVIEWED"가 뷰포트 밖으로 잘리는 것으로
// 확인했다. 상한 51.2px는 카드 폭이 640px로 잠기는 지점(640*0.08)과 정확히 맞물려 그 이상
// 뷰포트에서도 카드 폭 대비 비율이 어긋나지 않는다.
const COVER_ROOT_FONT_SIZE = 'clamp(1.5rem, 7.36vw, 3.2rem)';

export function LoginPage() {
  return (
    <div className="relative h-[100dvh] bg-paper-white">
      <PaperStage className="login-paper-stage">
        <div className="relative z-10 flex h-full items-center justify-center overflow-y-auto px-4 py-10">
          <div className="flex w-full flex-col items-center">
            {/* 압정 — 표지를 종이에 꽂아 두는 자리. pin-stand는 tailwind.config.js가 이미 갖고 있는
                낙하+튐 키프레임이라 새로 만들지 않는다. */}
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="relative z-10 -mb-4 h-9 w-9 origin-[50%_90%] animate-pin-stand motion-reduce:animate-none"
            >
              <path d="M12 13.5 L12 21.5" stroke="#042142" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="9" r="6.4" fill="#042142" />
              <circle cx="12" cy="9" r="2.3" fill="#3BB7A2" />
            </svg>

            {/* 표지 — PinLog 자체를 한 권으로 앉힌 자리. */}
            <div
              className="login-cover-in w-[min(92vw,640px)]"
              style={{ fontSize: COVER_ROOT_FONT_SIZE }}
            >
              <CoverPaper className="rounded-sm px-[1.15em] pb-[1.35em] pt-[1.55em] shadow-[0_22px_54px_-20px_rgba(4,33,66,0.32)]">
                <CoverFrame tone="gold" />
                <div className="flex flex-col items-center gap-[0.6em]">
                  <CoverLabelBetweenRules>기억이 머무는 자리</CoverLabelBetweenRules>
                  <CoverTitle size="md" align="center" tracking="tight" className="font-display">
                    핀로그
                  </CoverTitle>
                  <CoverRule width="short" />
                </div>
              </CoverPaper>
            </div>

            {/* 열린 표지 안쪽 — 소셜 로그인. */}
            <div className="mt-9 flex w-[min(92vw,400px)] flex-col items-center gap-6">
              <p
                className="login-item-in max-w-xs text-center text-sm text-ink-gray"
                style={{ animationDelay: '0.66s' }}
              >
                장소의 기억을 한 권의 책으로, 기록하고 모으고 새로운 이야기를 발견하세요
              </p>

              <div className="flex w-full flex-col gap-3">
                {PROVIDERS.map((provider, index) => (
                  <button
                    key={provider.id}
                    type="button"
                    aria-label={provider.ariaLabel}
                    onClick={() => handleProviderClick(provider.id)}
                    style={{ animationDelay: `${0.74 + index * 0.09}s` }}
                    className={`login-item-in flex h-14 w-full items-center gap-3 rounded-lg px-5 text-sm font-semibold shadow-[0_1px_2px_rgba(4,33,66,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_26px_-10px_rgba(4,33,66,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-log-mint motion-reduce:transition-none ${provider.className}`}
                  >
                    {provider.icon}
                    <span className="flex-1 text-left">{provider.label}</span>
                  </button>
                ))}
              </div>

              <p
                className="login-item-in text-center text-xs text-ink-gray"
                style={{ animationDelay: '1.01s' }}
              >
                계속 진행하면{' '}
                <Link
                  to="/terms"
                  className="font-semibold text-pin-navy underline underline-offset-2"
                >
                  이용약관
                </Link>{' '}
                및{' '}
                <Link
                  to="/privacy"
                  className="font-semibold text-pin-navy underline underline-offset-2"
                >
                  개인정보 처리방침
                </Link>
                에 동의하는 것으로 간주됩니다.
              </p>
            </div>
          </div>
        </div>
      </PaperStage>
    </div>
  );
}
