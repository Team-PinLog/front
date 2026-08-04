/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // 출처: Team-PinLog/brand-resource (확정 브랜드 가이드)
      colors: {
        'pin-navy': '#042142',
        'log-mint': '#3BB7A2',
        'paper-white': '#FAF7F6',
        // 본문 배경(paper-white)보다 한 단계 흰 면. AppShell 좌측 사이드바처럼 본문 위에 얹히는
        // 패널이 미세하게 구분되도록 쓴다 — 순백(#FFF)이 아니라 paper-white와 같은 웜 계열을
        // 유지한 값이다. 근거: Jira S15P11A705-307 후속 디자인 피드백(사용자 승인).
        'snow-white': '#FDFDFD',
        'ink-gray': '#6D6663',
        'ink-gray-light': '#A39C99',
        'line-card': '#E8E2DF',
        'line-subtle': '#F0EBE8',
        // 출처: brand-resource가 아니라 shared/ui/Shelf.tsx의 ShelfBoard(선반 나무 그라디언트)에서
        // 이미 쓰이던 값을 그대로 토큰화했다 — 279 Feed 셸프에서 동일 나무색을 재사용하기 위함.
        'shelf-wood': '#e0b77d',
        'shelf-wood-dark': '#b9854f',
      },
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
