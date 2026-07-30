import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import heroIllustration from '@/assets/hero.png';
import { savePreLoginPath } from '@/features/auth/lib/preLoginPath';
import {
  redirectToProviderLogin,
  type SocialProvider,
} from '@/features/auth/lib/redirectToProviderLogin';

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

export function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col md:flex-row" aria-label="핀로그 로그인">
      <section className="flex flex-col items-center justify-center gap-6 bg-pin-navy px-6 py-12 text-white md:flex-1 md:py-16">
        <p className="text-xs font-medium tracking-[0.3em] text-white/60">
          YOUR JOURNAL, PREVIEWED
        </p>
        <img src={heroIllustration} alt="" className="w-32 sm:w-40 md:w-48" />
        <p className="max-w-xs text-center text-sm text-white/80">
          당신의 발걸음이 추억이 되고, 이야기가 됩니다.
        </p>
      </section>
      <section className="flex flex-col items-center justify-center gap-8 bg-paper-white px-6 py-12 md:flex-1 md:py-16">
        <div className="flex w-full max-w-sm flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-xl font-bold tracking-tight text-pin-navy">PinLog</span>
            <h1 className="text-2xl font-bold text-pin-navy md:text-3xl">
              장소의 기억을 한 권의 책으로
            </h1>
            <p className="text-sm text-ink-gray">기록하고, 모으고, 새로운 이야기를 발견하세요</p>
          </div>
          <div className="flex w-full flex-col gap-3">
            {PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                type="button"
                aria-label={provider.ariaLabel}
                onClick={() => handleProviderClick(provider.id)}
                className={`flex h-14 w-full items-center gap-3 rounded-xl px-5 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-log-mint ${provider.className}`}
              >
                {provider.icon}
                <span className="flex-1 text-left">{provider.label}</span>
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-ink-gray">
            계속 진행하면{' '}
            <Link to="/terms" className="font-semibold text-pin-navy underline underline-offset-2">
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
      </section>
    </main>
  );
}
