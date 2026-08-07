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
      // ⚠️ 380에서 본문 서체가 잘난고딕 → 제주고딕으로 또 바뀌었다. 아래 보정은 잘난고딕 기준으로
      // 잡은 값이고, 서체가 바뀌면 시각 크기도 달라진다 — 값 조정은 눈으로 판단할 일이라 그
      // 티켓에서는 스케일을 그대로 뒀다(index.css의 body letter-spacing도 같은 이유로 유지).
      // 364: 본문 타이포를 한 단계 키운다. 357에서 본문 서체가 Pretendard → 잘난고딕으로 바뀌면서
      // 같은 px에서도 글자가 작아 보인다는 피드백이 나왔다(서체마다 대문자 높이·글자 폭이 달라
      // 시각 크기가 다르다). 페이지마다 클래스를 고치면 다른 레인 파일을 전부 건드려야 하므로
      // **스케일 자체를 재정의**해 한 번에 보정한다 — 기존 text-sm/base/... 사용처는 그대로 두고
      // 값만 커진다.
      //
      // 폭은 5~10%다. 그 이상 키우면 Feed 카드·책장 칸처럼 세로 예산이 빡빡한 화면에서 줄바꿈이
      // 늘어난다. 1px 단위(0.0625rem)로 떨어지게 잡아 반올림으로 흐려지지 않게 했다.
      // line-height도 함께 올린다 — 글자만 키우면 줄 간격이 상대적으로 좁아져 답답해진다.
      //
      // ⚠️ `text-[11px]`처럼 임의 px 값으로 쓴 자리(현재 52곳)는 이 표를 타지 않아 크기가 그대로다.
      // 반대로 표지 제목은 `text-[1em]`이라 부모 크기를 따라 함께 커진다. 책등(Shelf.tsx)은
      // `text-[10px]` 절대값이라 영향이 없다 — 책등 크기는 365에서 따로 다룬다.
      fontSize: {
        xs: ['0.8125rem', { lineHeight: '1.125rem' }], // 12 → 13px
        sm: ['0.9375rem', { lineHeight: '1.375rem' }], // 14 → 15px
        base: ['1.0625rem', { lineHeight: '1.625rem' }], // 16 → 17px
        lg: ['1.1875rem', { lineHeight: '1.8125rem' }], // 18 → 19px
        xl: ['1.375rem', { lineHeight: '1.875rem' }], // 20 → 22px
        '2xl': ['1.625rem', { lineHeight: '2.125rem' }], // 24 → 26px
        '3xl': ['2rem', { lineHeight: '2.375rem' }], // 30 → 32px
        '4xl': ['2.375rem', { lineHeight: '2.625rem' }], // 36 → 38px
      },
      // 357: 서체는 전부 public/fonts/의 로컬 서브셋 WOFF2다. @font-face는 src/index.css에
      // 있고, 외부 CDN(jsDelivr Pretendard·Google Fonts) 링크는 제거했다.
      // 폰트를 바꾸려면 여기와 index.css의 @font-face를 함께 고친다.
      //
      // 380: 본문·표제 서체를 제주 3종으로 교체했다(잘난체 2·잘난고딕 제거). 역할 배정의 근거:
      //   - sans = 제주고딕     : 새로 들어온 셋 중 유일한 본문용 고딕이다. 본문 기본값은 주소·
      //     Context 원문처럼 긴 글이 깔리는 자리라 장식 서체를 놓을 수 없다.
      //   - display = 제주한라산: 붓끝이 살아 있는 표제용 서체라 "브랜드로 읽혀야 하는 자리"인
      //     이 토큰의 성격(잘난체가 있던 자리)을 그대로 승계한다. 본문에 깔면 안 되는 것도 같다.
      //   - serif = 제주명조    : 380에서 신설. 셋 중 유일한 명조라 고딕(본문)·한라산(표제)과
      //     역할이 겹치지 않는다. 인용·서브 텍스트처럼 "본문이되 결이 다른" 자리를 위한 토큰이다.
      // ⚠️ display·serif는 아직 어느 컴포넌트도 쓰지 않는다(display는 357 신설 이래 계속 미사용).
      //    어디에 적용할지는 디자인 결정이라 이 티켓에서 임의로 화면에 얹지 않았다 — 토큰과
      //    @font-face만 준비해 두고, 적용은 별도 티켓에서 시안을 받아 한다.
      fontFamily: {
        // 본문 기본값. 제주고딕은 획이 고르고 자족이 단정해 긴 텍스트에서도 눈이 덜 피로하다.
        // 폴백은 시스템 폰트다 — 외부 의존을 없애는 것이 357의 목적이라 Pretendard CDN을
        // 되살리지 않는다. 사용자 기기에 Pretendard가 설치돼 있으면 그것이 먼저 쓰인다.
        sans: [
          'JejuGothic',
          'Pretendard Variable',
          'Pretendard',
          'system-ui',
          '-apple-system',
          'Apple SD Gothic Neo',
          'Malgun Gothic',
          'sans-serif',
        ],
        // "브랜드"로 읽혀야 하는 자리 — 페이지 제목·책 표지 제목·책등·컬렉션 이름을 상정한다.
        // ⚠️ 본문에 깔지 않는다. 표제용 서체라 긴 텍스트의 가독성이 떨어진다.
        // 폴백이 JejuGothic인 이유: 한라산이 아직 안 왔을 때 전혀 다른 계열로 튀지 않는다.
        display: ['JejuHallasan', 'JejuGothic', 'sans-serif'],
        // 380 신설. 인용·서브 텍스트용 명조. 폴백을 시스템 serif로 두어 계열을 유지한다.
        serif: ['JejuMyeongjo', 'Apple SD Gothic Neo', 'serif'],
        // 332: Collection 펼친 화면 시안의 포스트잇 손글씨. 본문 서체와 대비되는 "직접 적어
        // 붙인 메모"라는 인상이 시안에서 Context를 다른 정보(장소·주소·키워드)와 구분하는
        // 유일한 장치라 도입한다. ⚠️ 포스트잇(ContextStickyNote) 밖에서 쓰지 않는다.
        // 380: 교보 손글씨 2025로 교체하려 했으나 라이선스가 서브셋·포맷 변환·재배포를 금지해
        // 반입을 보류했다(public/fonts/LICENSE 하단 "반입 보류"). 금은보화(OFL)를 유지한다.
        hand: ['NanumGeumEunBoHwa', 'JejuGothic', 'cursive'],
      },

      // 377: 핀 모션 키프레임 4종. 값은 사용자 제공 "핀 목업 v2" 구현 참조 문서 원본 그대로다.
      // ⚠️ 여기 두는 것은 조율 세션의 사전 승인 사항이다(후속 티켓 378·379가 공유할 단일 출처가
      // 필요해서다). **색 토큰 변경은 여전히 금지**이고, 이 커밋은 keyframes/animation 추가만 한다.
      //
      // 모든 핀 애니메이션은 prefers-reduced-motion에서 생략한다 — 사용하는 쪽에서
      // `motion-reduce:animate-none`을 함께 붙인다(참조 문서 접근성 항목).
      keyframes: {
        // 꽂기 — 수직 낙하 후 두 번 튀김. **회전 없음**(목업 v1에서 "과함"으로 폐기됐다).
        // 쓰는 쪽은 transform-origin: 50% 90%(핀 끝)을 함께 줘야 커질 때 꽂힌 점이 흔들리지 않는다.
        'pin-stand': {
          '0%': { transform: 'translateY(-30px) scale(.86)', opacity: '0' },
          '50%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '66%': { transform: 'translateY(-7px) scale(1.03)' },
          '82%': { transform: 'translateY(0) scale(.99)' },
          '92%': { transform: 'translateY(-2px) scale(1)' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        // 물결 — 꽂힌 자리에서 퍼지는 원. 쓰는 쪽에서 2.5px 민트 테두리 원에 건다.
        'pin-ripple': {
          '0%': { transform: 'translate(-50%,-50%) scale(.22)', opacity: '.55' },
          '100%': { transform: 'translate(-50%,-50%) scale(2.7)', opacity: '0' },
        },
        // 로딩 루프 — 핀 3개를 delay 0/.17s/.34s로 스태거해 쓴다.
        'pin-loop': {
          '0%': { transform: 'translateY(-16px) scale(.85)', opacity: '0' },
          '35%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '50%': { transform: 'translateY(-4px) scale(1.02)' },
          '62%': { transform: 'translateY(0) scale(1)' },
          '85%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-16px) scale(.85)', opacity: '0' },
        },
        // 뽑기 — 저장 취소. 꽂기의 역재생이 아니라 위로 쑥 빠진다.
        'pin-pull': {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '30%': { transform: 'translateY(3px) scale(.97)' },
          '100%': { transform: 'translateY(-26px) scale(.9)', opacity: '0' },
        },
        // 377-F: 지역을 누르면 장소들이 방사형으로 "또로록" 떠오르는 팝. 목업 키프레임 4종에는
        // 없고 이번 상호작용(flower-menu)을 위해 더한 것이라, 위 넷과 구분해 맨 뒤에 둔다.
        'pin-pop-in': {
          '0%': { transform: 'translate(-50%,-50%) scale(.4)', opacity: '0' },
          '70%': { transform: 'translate(-50%,-50%) scale(1.06)', opacity: '1' },
          '100%': { transform: 'translate(-50%,-50%) scale(1)', opacity: '1' },
        },
      },
      animation: {
        'pin-stand': 'pin-stand .62s cubic-bezier(.22,1.2,.36,1) both',
        'pin-ripple': 'pin-ripple .8s ease-out forwards',
        'pin-loop': 'pin-loop 1.3s cubic-bezier(.3,1.05,.4,1) infinite',
        'pin-pull': 'pin-pull .38s ease-in both',
        'pin-pop-in': 'pin-pop-in .34s cubic-bezier(.22,1.2,.36,1) both',
      },
    },
  },
  plugins: [],
};
