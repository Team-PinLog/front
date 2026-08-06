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
        // 319: Feed(314)와 Library가 같은 선반 판(shared/ui/Shelf.tsx ShelfPlank)을 공유하게 되면서
        // Library ShelfBoard의 하드코딩 hex(#e0b77d/#b9854f)를 지웠다 — 이제 두 화면 모두 이 토큰만 쓴다.
        'shelf-wood-light': '#FBF6EF', // 판 윗면(빛 받는 면)
        'shelf-wood': '#F0E5D6', // 판 몸통
        'shelf-wood-dark': '#DFCDB4', // 판 앞면 아래 모서리
        // 319: 시안(나의 책장 아이보리 캐비닛)에서 뽑은 가구 색이다. shelf-wood*와 같은 성격의
        // 토큰 — 출처가 브랜드 가이드가 아니라 시안이고, 소비처가 책장 가구 한 곳으로 한정된다.
        // Feed(314)는 캐비닛 자체를 벗은 "오픈 책장"이라 이 3색을 쓰지 않는다 — Library 전용이다.
        'shelf-frame': '#F0EAE0', // 캐비닛 프레임·칸 사이 기둥(따뜻한 아이보리)
        'shelf-frame-edge': '#E3D9C9', // 프레임 바깥 윤곽선(paper-white 배경과 경계를 만든다)
        'shelf-cell': '#F5F7F5', // 칸 안쪽 면(프레임보다 한 단계 차갑고 밝은 오프화이트)
        // 316: 시안(북디자인 표지)의 금박 액센트. brand-resource의 4색에는 없는 색이지만, 시안에서
        // "책 표지"라는 인상을 만드는 것은 사실상 이 얇은 금색 괘선과 프레임이다(제목 아래 56px
        // 짧은 선, 표지 가장자리 1px 프레임, 제목 위아래 괘선). shelf-wood*와 같은 성격의 토큰이다
        // — 출처가 브랜드 가이드가 아니라 시안이고, 소비처가 한 곳(Feed 표지)으로 한정된다.
        // ⚠️ 표지 밖(본문 UI)에서 쓰지 않는다. 브랜드 색이 아니다.
        'cover-gold': '#B68235', // 괘선·표제 라벨 (시안 rgba(182,130,53))
        'cover-gold-soft': '#DCC7A0', // 옅은 프레임 (시안 --color-accent-200)
      },
      // 357: 세 서체 모두 public/fonts/의 로컬 서브셋 WOFF2다. @font-face는 src/index.css에
      // 있고, 외부 CDN(jsDelivr Pretendard·Google Fonts) 링크는 제거했다.
      // 폰트를 바꾸려면 여기와 index.css의 @font-face를 함께 고친다.
      fontFamily: {
        // 본문 기본값. 잘난고딕은 잘난체와 같은 뼈대를 가진 본문용 고딕이라, 제목(잘난체)과
        // 한 가족으로 읽히면서도 주소·Context 원문 같은 긴 텍스트의 가독성을 유지한다.
        // 폴백은 시스템 폰트다 — 외부 의존을 없애는 것이 이 티켓의 목적이라 Pretendard CDN을
        // 되살리지 않는다. 사용자 기기에 Pretendard가 설치돼 있으면 그것이 먼저 쓰인다.
        sans: [
          'JalnanGothic',
          'Pretendard Variable',
          'Pretendard',
          'system-ui',
          '-apple-system',
          'Apple SD Gothic Neo',
          'Malgun Gothic',
          'sans-serif',
        ],
        // 357 신설. "브랜드"로 읽혀야 하는 자리 — 페이지 제목·책 표지 제목·책등·컬렉션 이름.
        // ⚠️ 본문에 깔지 않는다. 굵은 제목용 서체라 긴 텍스트의 가독성이 떨어진다.
        // 폴백이 JalnanGothic인 이유: 잘난체가 아직 안 왔을 때 전혀 다른 계열로 튀지 않는다.
        display: ['Jalnan2', 'JalnanGothic', 'sans-serif'],
        // 332: Collection 펼친 화면 시안의 포스트잇 손글씨. 본문 서체와 대비되는 "직접 적어
        // 붙인 메모"라는 인상이 시안에서 Context를 다른 정보(장소·주소·키워드)와 구분하는
        // 유일한 장치라 도입한다. ⚠️ 포스트잇(ContextStickyNote) 밖에서 쓰지 않는다.
        // 357: Google Fonts의 나눔펜에서 로컬 번들한 나눔손글씨 금은보화로 교체했다.
        hand: ['NanumGeumEunBoHwa', 'JalnanGothic', 'cursive'],
      },
    },
  },
  plugins: [],
};
