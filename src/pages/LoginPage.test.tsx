import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

const { savePreLoginPathMock, redirectToProviderLoginMock } = vi.hoisted(() => ({
  savePreLoginPathMock: vi.fn(),
  redirectToProviderLoginMock: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="#">{children}</a>,
}));

vi.mock('@/features/auth/lib/preLoginPath', () => ({
  savePreLoginPath: savePreLoginPathMock,
}));

vi.mock('@/features/auth/lib/redirectToProviderLogin', () => ({
  redirectToProviderLogin: redirectToProviderLoginMock,
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true }) as MediaQueryList),
  );
  savePreLoginPathMock.mockClear();
  redirectToProviderLoginMock.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('LoginPage', () => {
  it('공식 핀로그 로고와 줄 단위로 고정된 소개 문구를 표시한다', () => {
    act(() => root.render(<LoginPage />));

    const logo = container.querySelector<HTMLImageElement>('img[alt="핀로그"]');
    expect(logo?.getAttribute('src')).toContain('logo-full.png');
    expect(logo?.width).toBe(1447);
    expect(logo?.height).toBe(1087);

    const firstLine = Array.from(container.querySelectorAll('span')).find(
      (element) => element.textContent === '장소의 기억을 한 권의 책으로,',
    );
    const secondLine = Array.from(container.querySelectorAll('span')).find(
      (element) => element.textContent === '기록하고 모으고 새로운 이야기를 발견하세요',
    );

    expect(firstLine?.classList.contains('block')).toBe(true);
    expect(secondLine?.classList.contains('block')).toBe(true);
    expect(firstLine?.parentElement?.classList.contains('break-keep')).toBe(true);
    expect(container.querySelectorAll('button[aria-label$="계정으로 로그인"]')).toHaveLength(3);
  });

  it('로그인 버튼의 기존 인증 진입 흐름을 유지한다', () => {
    act(() => root.render(<LoginPage />));

    const googleButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Google 계정으로 로그인"]',
    );
    act(() => googleButton?.click());

    expect(savePreLoginPathMock).toHaveBeenCalledOnce();
    expect(redirectToProviderLoginMock).toHaveBeenCalledExactlyOnceWith('google');
  });
});
