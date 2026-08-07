/**
 * 종이 표면을 만드는 SVG 필터 세 개. 출처: 디자인 시안 home-paper-aperture.html.
 *
 * design-ver2에서는 features/home 아래 있었지만 질감 세 겹(.pl-grain/.pl-emboss)이 이 id들을
 * 참조하므로 무대와 같은 자리(features/paper)로 옮겼다 — 홈뿐 아니라 종이 화면 전부가 쓴다.
 *
 * 문서에 딱 한 번만 마운트한다 — id로 참조되므로 여러 번 심으면 같은 id가 중복된다.
 * (마커 asset이 `<img>`로 불려 각자 독립 문서가 되는 것과 달리, 이건 같은 문서 안이라
 * 실제로 충돌한다. getRecordMarkerAsset.ts의 반대 사례다.)
 *
 * 시안 주석이 남긴 함정 셋을 그대로 지킨다.
 *  ① `color-interpolation-filters="sRGB"` — 없으면 linearRGB로 계산돼 결과가 뿌옇다.
 *  ② feTurbulence는 RGBA 네 채널이 전부 랜덤이라 saturate 0으로 탈색해야 한다.
 *  ③ 필터 영역: 결은 번질 일이 없어 100%로 조이고, 재단면은 변위가 밖으로 밀려 넓힌다.
 */
export function PaperFilterDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" className="absolute">
      <defs>
        {/* 종이 결.
            ⚠️ 핵심: 이 결은 soft-light로 합성된다(../paperStage.css). **multiply는 어둡게만 할 수
            있어서** 흰 종이에 얹는 순간 반드시 회색이 된다 — 알파를 낮추든 색을 웜톤으로 바꾸든
            방향이 한쪽뿐이라 밝기는 계속 깎인다. 두 번을 그렇게 고치다 결국 블렌드를 바꿨다.

            soft-light는 0.5를 기준으로 **위면 밝게, 아래면 어둡게** 간다. 그래서 노이즈를 0.5
            주변의 좁은 띠로 눌러 두면 평균 밝기는 종이색 그대로 유지되면서 요철만 생긴다.
            slope 0.68 / intercept 0.16 → 값 범위 0.16~0.84, **중심은 정확히 0.5**.
            결을 더/덜 나게 하려면 이 두 값만 만진다 — 단, 합(slope/2 + intercept)이 0.5를
            벗어나면 그 순간 다시 한쪽으로 편향돼 종이가 회색이거나 들뜬 흰색이 된다.
            알파는 1로 못박는다 — 알파로 세기를 조절하면 그게 다시 한쪽 방향 편향을 만든다.
            세기는 CSS 쪽 opacity로만 준다. */}
        <filter
          id="pl-grain"
          colorInterpolationFilters="sRGB"
          x="0"
          y="0"
          width="100%"
          height="100%"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.78"
            numOctaves={4}
            seed={11}
            result="n"
          />
          <feColorMatrix in="n" type="saturate" values="0" result="g" />
          <feComponentTransfer in="g">
            <feFuncR type="linear" slope="0.68" intercept="0.16" />
            <feFuncG type="linear" slope="0.68" intercept="0.16" />
            <feFuncB type="linear" slope="0.68" intercept="0.16" />
            <feFuncA type="linear" slope="0" intercept="1" />
          </feComponentTransfer>
        </filter>

        {/* 활판 눌린 자국. 평면 노이즈가 아니라 실제 요철이 생긴다 —
            "인쇄물처럼 보인다"와 "인쇄된 물건이다"를 가르는 게 이 라이팅이다.
            lightingColor가 순백(#fff)이면 요철의 음영이 중성 회색이라 종이에서 색을 뺀다.
            조명색을 **종이색 그대로**(#FAF7F6) 두면 눌린 자국은 남고 크림색은 유지된다 —
            종이에 비친 빛이 종이색을 띠는 게 물리적으로도 맞다(위 결과 같은 이유다). */}
        <filter id="pl-deboss" colorInterpolationFilters="sRGB">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="1.05"
            numOctaves={2}
            seed={7}
            result="n"
          />
          <feDiffuseLighting
            in="n"
            surfaceScale={1.1}
            diffuseConstant={1}
            lightingColor="#FAF7F6"
            result="l"
          >
            <feDistantLight azimuth={120} elevation={58} />
          </feDiffuseLighting>
          <feComposite
            in="l"
            in2="SourceGraphic"
            operator="arithmetic"
            k1={1}
            k2={0}
            k3={0}
            k4={0}
          />
        </filter>

        {/* 재단면 — **손으로 찢은 가장자리**.
            scale은 변위의 진폭(px)이다. 시안은 3.5로 억눌러 "손으로 자른 결"을 노렸는데(원 주석:
            8이면 찢어진 종이가 된다), 여기서는 찢어진 쪽을 택했고 이후 웨이브를 더 키워 18이다.

            큰 웨이브를 만들려면 진폭(scale)만이 아니라 **파장**도 함께 늘려야 한다 — baseFrequency의
            x값을 낮추면(0.055 → 0.022) 굴곡 하나가 길어져 "출렁이는 결"이 되고, 그대로 두고
            진폭만 키우면 잔털이 길어질 뿐이다. numOctaves 4는 그 큰 결 위에 잔섬유를 얹는 몫이라
            유지한다.
            ⚠️ 진폭을 키우면 변위가 요소 밖으로 더 밀리므로 필터 영역(y·height)도 함께 넓혀야
            한다. 안 그러면 가장 크게 튄 부분이 잘려 직선으로 남는다. */}
        <filter
          id="pl-deckle"
          colorInterpolationFilters="sRGB"
          x="-8%"
          y="-130%"
          width="116%"
          height="360%"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.022 0.2"
            numOctaves={4}
            seed={3}
            result="n"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="n"
            scale={18}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* 다이어리에서 뜯어낸 구멍. 재단면(pl-deckle)과 같은 원리지만 **훨씬 약하다** —
            지름 11px짜리 구멍에 그쪽 진폭(18)을 걸면 원이 형체 없이 뭉개진다. 원인 줄은 알아보되
            가장자리가 뜯긴 정도가 되도록 4.5로 억제하고, 주기는 촘촘하게 잡아 잔결을 만든다. */}
        <filter
          id="pl-tear"
          colorInterpolationFilters="sRGB"
          x="-25%"
          y="-8%"
          width="150%"
          height="116%"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.09 0.16"
            numOctaves={3}
            seed={5}
            result="n"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="n"
            scale={4.5}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
