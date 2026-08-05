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
        // 출처: brand-resource가 아니라 시안(밝은 오픈 책장)에서 뽑은 선반 나무색이다.
        // 279에서는 shared/ui/Shelf.tsx ShelfBoard의 값(#e0b77d/#b9854f)을 그대로 토큰화했었는데,
        // 314에서 Feed가 짙은 남색 캐비닛을 벗고 밝은 배경 위로 나오면서 그 진한 나무색(탄색)이
        // 배경 대비 너무 무거워졌다. 시안의 선반은 "탄색 판"이 아니라 거의 흰 크림빛 나무이고,
        // 얇은 단색 줄이 아니라 두께가 보이는 판이다 — 위쪽은 빛 받는 윗면, 아래쪽은 앞面 그림자로
        // 3단 그라디언트를 만든다(ShelfPlank).
        // ⚠️ 이 토큰의 소비자는 현재 FeedList뿐이다(Library의 ShelfBoard는 아직 원본 hex
        // #e0b77d/#b9854f를 하드코딩하고 있다 — Shelf.tsx:64). 319에서 Library를 밝은 톤으로 옮길 때
        // 그쪽도 이 토큰을 쓰도록 합치고 하드코딩을 지운다.
        'shelf-wood-light': '#FBF6EF', // 판 윗면(빛 받는 면)
        'shelf-wood': '#F0E5D6', // 판 몸통
        'shelf-wood-dark': '#DFCDB4', // 판 앞면 아래 모서리
      },
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
