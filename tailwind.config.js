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
