/**
 * 카카오맵 브랜드 톤 마스크. 근거: Jira S15P11A705-374.
 *
 * 카카오맵은 타일 스타일 API가 없어 서버가 주는 이미지를 그대로 받는다 — 그래서 색을 바꾸는 방법은
 * "받은 그림 위에 CSS로 손대는 것"뿐이다. 세 겹으로 나눠 각각 다른 일을 맡긴다:
 *   ① 필터   — 타일 자체의 채도·색온도를 낮춘다(쨍한 초록·파랑을 죽인다)
 *   ② 워시   — 크림색 반투명 막을 soft-light로 얹어 페이지의 종이 톤과 같은 계열로 끌어온다
 *   ③ 질감   — 아주 옅은 노이즈로 "인쇄된 종이" 느낌을 준다
 *
 * ⚠️ 아래 MAP_TONE_* 상수는 전부 **취향 조정 지점**이다. 화면을 보면서 값만 바꾸면 되고, 바꿔도
 * 마커 색 보정(getMarkerToneCompensationMatrix)이 같은 값에서 자동으로 다시 계산되므로 다른 곳을
 * 함께 고칠 필요가 없다. 조정할 때 참고할 감각은 각 상수 주석에 적어 뒀다.
 */

/**
 * ① 타일 필터. 값이 곧 지도의 첫인상이다.
 * - saturate: 낮출수록 색이 빠진다. 0.5 아래로 가면 지도가 거의 흑백이 되어 길·물 구분이 어려워진다.
 * - sepia: 올릴수록 누렇게(따뜻하게) 간다. 0.3을 넘으면 "오래된 지도" 쪽으로 확 기운다.
 * - brightness: 1보다 크면 밝아진다. 워시를 얹으면 살짝 어두워 보여서 미리 조금 올려 둔다.
 * - contrast: 채도를 낮추면 흐릿해 보여 아주 약간만 올린다. 1.1을 넘기면 도로가 딱딱해진다.
 */
export const MAP_TONE_FILTER = {
  saturate: 0.68,
  sepia: 0.18,
  brightness: 1.04,
  contrast: 1.02,
} as const;

/**
 * ② 컬러 워시. 지도 위에 덮는 반투명 막이다.
 * - color: 페이지 배경(paper-white) 계열의 크림색. 여기서 톤의 방향이 정해진다.
 * - alpha: 0.05~0.2 사이가 실용 구간이다. 0.3을 넘으면 지도가 뿌예져 글씨가 읽히지 않는다.
 * - blendMode: soft-light는 밝기를 유지한 채 색만 입힌다. 더 진하게 깔고 싶으면 'multiply'로 바꾸되,
 *   multiply는 전체가 어두워지므로 위 brightness를 함께 올려야 한다.
 */
export const MAP_TONE_WASH = {
  color: '#f6efe3',
  alpha: 0.14,
  blendMode: 'soft-light',
} as const;

/**
 * ③ 종이 질감.
 * - alpha: 0.03~0.05가 "있는 듯 없는 듯"한 구간이다. 0.08을 넘으면 지도가 지저분해 보인다.
 * - enabled: **드래그·줌이 버벅이면 여기부터 false로 끈다**(티켓의 성능 지침). 질감은 화면 전체를
 *   덮는 반복 이미지라 세 겹 중 가장 비싸고, 없어도 톤 자체는 유지된다.
 * - tileSizePx: 노이즈 무늬가 반복되는 주기. 작을수록 촘촘하다.
 */
export const MAP_TONE_TEXTURE = {
  alpha: 0.04,
  enabled: true,
  tileSizePx: 180,
} as const;

/**
 * 워시·질감이 지도 아래쪽에서 사라지기 시작하는 높이(px).
 *
 * ⚠️ 취향이 아니라 **약관 요구**다. 카카오 로고와 저작권 표기는 지도 하단에 그려지는데, 그 위에 막을
 * 덮으면 표기를 가리는 것이 된다. 이 값만큼을 알파 0으로 떨어뜨려 막이 닿지 않게 한다.
 * 값을 줄이려면 실제 화면에서 로고·저작권이 막 바깥에 있는지 반드시 확인한다.
 * (필터는 로고에도 걸리지만 그건 티켓에서 "가독성이 유지되면 허용"으로 확인된 범위다.)
 */
export const MAP_TONE_BOTTOM_SAFE_PX = 44;

/** 지도 컨테이너에 그대로 넣는 CSS filter 값. */
export function getMapToneFilterCss(): string {
  const { saturate, sepia, brightness, contrast } = MAP_TONE_FILTER;
  return `saturate(${saturate}) sepia(${sepia}) brightness(${brightness}) contrast(${contrast})`;
}

/**
 * 워시·질감 레이어의 mask. 아래쪽 MAP_TONE_BOTTOM_SAFE_PX 구간에서 막을 서서히 없앤다.
 * 딱 잘라 끝내지 않고 그라데이션으로 빼는 이유는 HERO_MAP_FADE_MASK와 같다 — 경계에서 뚝 끊으면
 * "막이 있는 곳 / 없는 곳"이 맞닿는 가로줄이 눈에 보인다.
 */
export function getMapToneBottomFadeMask(): string {
  return `linear-gradient(to top, transparent 0, black ${MAP_TONE_BOTTOM_SAFE_PX}px)`;
}

/**
 * 워시 레이어의 배경색(rgba). 색과 알파를 따로 조정할 수 있게 상수는 나눠 두고, CSS로 낼 때만 합친다
 * — 알파를 색 문자열(#f6efe3aa) 안에 섞어 두면 "조금만 진하게"를 16진수로 계산해야 한다.
 */
export function getMapToneWashColorCss(): string {
  const hex = MAP_TONE_WASH.color.replace('#', '');
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${MAP_TONE_WASH.alpha})`;
}

/**
 * 지도 오른쪽 끝을 배경으로 스며들게 하는 페이드 폭(px 기본값)과 마스크.
 *
 * 377 후속: 지도 폭을 줄여 '최근의 장소' 카드와 분리했는데, 단면이 직선으로 잘리면 "지도가
 * 잘렸다"로 읽힌다. 그라데이션으로 배경에 녹여야 한다.
 *
 * ⚠️ 이 마스크는 **지도 타일과 톤 레이어에만** 건다. 앞선 시도처럼 지도 레이어 전체에 걸면 그 안에
 * 있는 줌·"내 주변" 버튼(오른쪽에서 32px 자리)까지 함께 사라진다 — 실제로 그렇게 사라졌다.
 * 그리고 타일과 워시·질감이 **같은 폭**으로 사라져야 한다. 폭이 어긋나면 한쪽만 먼저 끝나 경계가
 * 두 겹으로 보인다(374 워시와의 정합).
 */
export const MAP_TONE_RIGHT_FADE_PX = 128;

export function getMapToneRightFadeMask(fadePx: number = MAP_TONE_RIGHT_FADE_PX): string {
  return `linear-gradient(to right, black calc(100% - ${fadePx}px), transparent 100%)`;
}

/**
 * 아래(로고 보호)와 오른쪽(배경으로 스며듦) 페이드를 함께 건다. 두 그라데이션을 겹쳐 **둘 다
 * 불투명한 곳만** 남긴다(intersect) — 하나만 쓰면 다른 쪽 페이드가 사라진다.
 */
export function getMapToneEdgeMaskStyle(fadePx: number = MAP_TONE_RIGHT_FADE_PX) {
  const masks = `${getMapToneBottomFadeMask()}, ${getMapToneRightFadeMask(fadePx)}`;
  return {
    maskImage: masks,
    WebkitMaskImage: masks,
    maskComposite: 'intersect',
    WebkitMaskComposite: 'source-in',
  } as const;
}

/** 종이 질감 이미지(data URI). feTurbulence로 만든 노이즈라 별도 asset 파일이 필요 없다. */
export function getMapToneTextureImage(): string {
  const size = MAP_TONE_TEXTURE.tileSizePx;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// --- 마커 색 역보정 --------------------------------------------------------------------------
//
// 컨테이너에 필터를 걸면 그 안에 있는 것이 전부 물든다. 카카오 SDK가 만드는 타일뿐 아니라 우리가
// CustomOverlay로 얹은 마커도 같은 필터를 통과하므로, 그대로 두면 브랜드 팔레트 20색이 전부 누렇게
// 뜬다. 마커 엘리먼트에 **정확한 역행렬**을 미리 걸어 두면, 컨테이너 필터를 지난 뒤 원래 색으로
// 돌아온다(중첩 필터는 자식이 먼저, 그다음 조상 순으로 합성된다).
//
// SVG 파일 20개의 색값을 손으로 보정하지 않은 이유가 여기 있다. 그렇게 하면 위 MAP_TONE_FILTER를
// 한 번 조정할 때마다 20개 파일을 다시 뽑아야 하는데, 이 티켓의 목적 자체가 "화면을 보며 값을
// 조정하는 것"이다. 색 보정을 상수에서 파생시키면 조정할 곳이 계속 한 곳으로 남는다.
// (20색 팔레트와 해시 규약 자체는 그대로다 — 책등·표지 색과 공유하는 계약이라 건드리지 않는다.)

/** 3x3 행렬. 행 우선이고, 색 벡터에 왼쪽에서 곱한다(c' = M·c). */
export type ColorMatrix3x3 = readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number],
];

const IDENTITY_3X3: ColorMatrix3x3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

// CSS filter 명세가 정의한 휘도 계수. saturate·sepia 행렬이 이 값을 공유한다.
const LUMA_R = 0.213;
const LUMA_G = 0.715;
const LUMA_B = 0.072;

/** CSS `saturate(amount)`와 같은 행렬. */
export function getSaturateMatrix(amount: number): ColorMatrix3x3 {
  const s = amount;
  return [
    [LUMA_R + (1 - LUMA_R) * s, LUMA_G - LUMA_G * s, LUMA_B - LUMA_B * s],
    [LUMA_R - LUMA_R * s, LUMA_G + (1 - LUMA_G) * s, LUMA_B - LUMA_B * s],
    [LUMA_R - LUMA_R * s, LUMA_G - LUMA_G * s, LUMA_B + (1 - LUMA_B) * s],
  ];
}

// amount=1일 때의 sepia 행렬(CSS filter 명세 값).
const SEPIA_FULL: ColorMatrix3x3 = [
  [0.393, 0.769, 0.189],
  [0.349, 0.686, 0.168],
  [0.272, 0.534, 0.131],
];

/** CSS `sepia(amount)`와 같은 행렬. amount만큼 항등행렬과 SEPIA_FULL을 섞는다. */
export function getSepiaMatrix(amount: number): ColorMatrix3x3 {
  const p = amount;
  return IDENTITY_3X3.map((row, i) =>
    row.map((value, j) => value * (1 - p) + SEPIA_FULL[i]![j]! * p),
  ) as unknown as ColorMatrix3x3;
}

/** CSS `brightness(amount)`와 같은 행렬(각 채널에 같은 배수). */
export function getBrightnessMatrix(amount: number): ColorMatrix3x3 {
  return [
    [amount, 0, 0],
    [0, amount, 0],
    [0, 0, amount],
  ];
}

export function multiplyMatrix3x3(a: ColorMatrix3x3, b: ColorMatrix3x3): ColorMatrix3x3 {
  const result: number[][] = [];
  for (let i = 0; i < 3; i += 1) {
    const row: number[] = [];
    for (let j = 0; j < 3; j += 1) {
      let sum = 0;
      for (let k = 0; k < 3; k += 1) {
        sum += a[i]![k]! * b[k]![j]!;
      }
      row.push(sum);
    }
    result.push(row);
  }
  return result as unknown as ColorMatrix3x3;
}

/**
 * 역행렬. 되돌릴 수 없는 행렬(행렬식이 0에 가까움)이면 **null**을 준다 — 예를 들어 brightness(0)
 * 처럼 정보가 완전히 사라지는 설정이 그렇다. 호출부는 그 경우 보정을 포기하고 마커를 그냥 둔다
 * (억지로 나누면 NaN이 섞인 행렬이 나와 마커가 통째로 사라진다).
 */
export function invertMatrix3x3(m: ColorMatrix3x3): ColorMatrix3x3 | null {
  const [a, b, c] = m[0];
  const [d, e, f] = m[1];
  const [g, h, i] = m[2];

  const cofactorA = e * i - f * h;
  const cofactorB = f * g - d * i;
  const cofactorC = d * h - e * g;
  const determinant = a * cofactorA + b * cofactorB + c * cofactorC;

  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-8) {
    return null;
  }

  return [
    [cofactorA / determinant, (c * h - b * i) / determinant, (b * f - c * e) / determinant],
    [cofactorB / determinant, (a * i - c * g) / determinant, (c * d - a * f) / determinant],
    [cofactorC / determinant, (b * g - a * h) / determinant, (a * e - b * d) / determinant],
  ];
}

/**
 * 컨테이너 필터가 색에 하는 일 전체를 하나의 행렬로 합친 것.
 * 곱하는 순서가 중요하다 — CSS는 나열한 순서대로 적용하므로(saturate → sepia → brightness),
 * 색 벡터에는 **역순으로** 곱해진다: c' = B·(P·(S·c)).
 * contrast는 색을 섞지 않고 각 채널을 같은 식으로 옮기는 연산이라 여기 넣지 않는다(아래 주석 참고).
 */
export function getMapToneColorMatrix(): ColorMatrix3x3 {
  const saturate = getSaturateMatrix(MAP_TONE_FILTER.saturate);
  const sepia = getSepiaMatrix(MAP_TONE_FILTER.sepia);
  const brightness = getBrightnessMatrix(MAP_TONE_FILTER.brightness);
  return multiplyMatrix3x3(brightness, multiplyMatrix3x3(sepia, saturate));
}

/**
 * 마커에 걸 feColorMatrix 값(4x5 = 20개). 위 행렬의 역행렬이고, 알파는 건드리지 않는다.
 * 되돌릴 수 없는 설정이면 null이다.
 *
 * ⚠️ contrast는 보정에서 빠져 있다. contrast는 `c' = (c - 0.5) * k + 0.5` 꼴이라 순수한 행렬 곱이
 * 아니라 상수항(feColorMatrix의 5번째 열)이 필요한데, 그걸 정확히 되돌리려면 브라우저가 필터를
 * 적용하는 색 공간·클램핑 시점까지 맞춰야 해서 실익이 없다. 기본값(1.02)처럼 1 근처에서는 눈에
 * 띄지 않는다. contrast를 크게 올릴 생각이면 그때는 SVG 자체를 다시 뽑는 편이 정확하다.
 */
export function getMarkerToneCompensationMatrix(): string | null {
  const inverse = invertMatrix3x3(getMapToneColorMatrix());
  if (!inverse) {
    return null;
  }
  const round = (value: number) => Number(value.toFixed(5));
  return [
    ...inverse[0].map(round),
    0,
    0,
    ...inverse[1].map(round),
    0,
    0,
    ...inverse[2].map(round),
    0,
    0,
    0,
    0,
    0,
    1,
    0,
  ].join(' ');
}

/** 마커 보정 필터의 DOM id. RecordMapView가 <svg>로 심고 마커 스타일에서 url(#...)로 참조한다. */
export const MARKER_TONE_FILTER_ID = 'pinlog-map-marker-tone';
