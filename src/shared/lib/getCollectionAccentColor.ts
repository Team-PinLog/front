import { useEffect, useSyncExternalStore } from 'react';
import { hashPaletteIndex } from './hashPaletteIndex';

// 287-12: 파스텔톤 카드 표지 보조 색상 팔레트(디자인 결정으로 직접 지정한 5색 — pastelizeHex
// 자동 변환을 거치지 않는다. Library 책등 팔레트(shelfSpine.ts SPINE_COLORS)는 원래 채도 높은
// 색이라 pastelizeHex로 파스텔화하지만, 이 팔레트는 이미 파스텔톤이라 그 변환을 한 번 더 거치면
// 명도가 92% 상한 쪽으로 더 끌려가 배경(paper-white)과 구분이 안 될 만큼 옅어진다 — 검증해보니
// 예를 들어 #FFEBD3가 #f5ece0으로 바뀌어 사실상 흰색과 구별되지 않았다).
// Feed API에는 Collection 이미지 필드가 없어, collectionId를 해시해 이 팔레트 중 하나를
// 결정론적으로 골라 카드 배경(일러스트 대체)으로 쓴다. 저장하지 않고 매번 계산한다.
// 근거: Jira S15P11A705-170. 171(Collection 상세)에서도 재사용 가능하도록 공용 위치에 둔다.
// 331: 표지 이미지가 생긴 뒤로는 해시가 **폴백**이 됐다 — 표지가 있으면 그 이미지에서 대표색을
// 뽑아 이 팔레트 중 가장 가까운 색으로 매핑한다(useCollectionAccentColor). 팔레트 자체는 그대로다.
const ACCENT_BASE_COLORS = ['#FFB6A6', '#FFEBD3', '#9BCEC1', '#67A2C5', '#99C2FF'];

// 287-10: 기본색 5개뿐이면 인접한 컬렉션(대개 collectionId가 연속인 생성 순서)끼리 같은 색이 나올
// 확률이 20%(1/5)로 육안에 띌 만큼 잦다. 새 hex를 임의로 고르는 대신, 이미 있는 5개를 25% 어둡게
// 변형(shadeHex)해 10개로 늘려 그 확률을 10%(1/10)로 낮췄다 — 팔레트는 여전히 위 5개 색상에서만
// 파생된다.
function shadeHex(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const toHex = (channel: number) =>
    Math.round(channel * factor)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export const ACCENT_COLORS = [
  ...ACCENT_BASE_COLORS,
  ...ACCENT_BASE_COLORS.map((hex) => shadeHex(hex, 0.75)),
];

export function getCollectionAccentColor(collectionId: number): string {
  return ACCENT_COLORS[hashPaletteIndex(collectionId, ACCENT_COLORS.length)];
}

// --- 331: 표지 이미지 → 팔레트 최근접 매핑 --------------------------------------------------------

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): Rgb {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

/**
 * 색 거리는 **RGB가 아니라 CIE Lab에서 잰다.**
 *
 * RGB 유클리드(가중식 redmean 포함)로 먼저 만들어봤다가 갈아엎었다 — 청록색 도판(60,130,110)이
 * 초록 계열이 아니라 파랑 계열(77,122,148)로 붙었다. RGB 좌표상으로는 실제로 파랑 쪽이 더
 * 가깝기 때문이고(주 차이가 B 채널 하나뿐), 이건 가중치를 손본다고 사라지는 문제가 아니다.
 * Lab은 밝기(L)와 색상·채도(a·b)가 축으로 분리돼 있어서, 같은 계열의 밝기 차이보다 계열이 다른
 * 것을 훨씬 큰 거리로 잡는다 — "표지 색의 계열을 유지한다"는 이 기능의 요구가 곧 그 성질이다.
 * ΔE76(Lab 유클리드)이면 충분하다. ΔE2000은 훨씬 복잡한데, 우리는 색차를 수치로 보고할 게
 * 아니라 10색 중 하나를 고르기만 한다.
 */
interface Lab {
  l: number;
  a: number;
  b: number;
}

// sRGB → 선형 RGB → XYZ(D65) → Lab. 표준 변환식 그대로다.
const D65_WHITE = { x: 95.047, y: 100.0, z: 108.883 };

function toLinearChannel(channel: number): number {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function toLabComponent(t: number): number {
  return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
}

function rgbToLab({ r, g, b }: Rgb): Lab {
  const lr = toLinearChannel(r) * 100;
  const lg = toLinearChannel(g) * 100;
  const lb = toLinearChannel(b) * 100;

  const x = toLabComponent((lr * 0.4124 + lg * 0.3576 + lb * 0.1805) / D65_WHITE.x);
  const y = toLabComponent((lr * 0.2126 + lg * 0.7152 + lb * 0.0722) / D65_WHITE.y);
  const z = toLabComponent((lr * 0.0193 + lg * 0.1192 + lb * 0.9505) / D65_WHITE.z);

  return { l: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
}

const ACCENT_LAB = ACCENT_COLORS.map((hex) => rgbToLab(hexToRgb(hex)));

/** ΔE76의 제곱. 제곱근을 취하지 않는다 — 최솟값을 고르는 데만 쓰므로 결과가 같다. */
function labDistanceSquared(a: Lab, b: Lab): number {
  const dL = a.l - b.l;
  const dA = a.a - b.a;
  const dB = a.b - b.b;
  return dL * dL + dA * dA + dB * dB;
}

/**
 * 임의의 색을 기존 팔레트 10색 중 가장 가까운 하나로 매핑한다. **새 색을 만들지 않는다** —
 * 표지에서 뽑은 색을 그대로 카드 배경으로 쓰면 서가 전체의 톤이 이미지마다 제각각이 되어
 * 파스텔 팔레트를 둔 의미가 사라진다(287-12 주석).
 */
export function getNearestAccentColor(rgb: Rgb): string {
  const lab = rgbToLab(rgb);
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < ACCENT_LAB.length; i += 1) {
    const distance = labDistanceSquared(lab, ACCENT_LAB[i]);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  return ACCENT_COLORS[bestIndex];
}

// 표지를 이 정사각형으로 축소해 그린 뒤 샘플링한다(원본 크기와 무관하게 24×24=576픽셀).
// 원본 그대로 읽으면 표지 한 장에 수십만 픽셀이라 한 화면(최대 20권)에서 비용이 크다. 축소 draw는
// 브라우저가 GPU에서 처리하고, 축소 자체가 평균화라 대표색을 구하는 데는 오히려 유리하다.
const SAMPLE_SIZE = 24;

// 지면(크림/흰 여백)과 윤곽선(검정)은 표지의 "색"이 아니라 어느 표지에나 있는 공통 요소다.
// 걸러내지 않으면 AI 일러스트가 대부분 밝은 지면 위에 그려져 있어 평균이 전부 흰색 쪽으로 쏠리고,
// 결과적으로 모든 표지가 같은 밝은 색 하나로 매핑된다.
const NEAR_WHITE_MIN_CHANNEL = 236;
const NEAR_BLACK_MAX_CHANNEL = 20;
// 걸러낸 뒤 남는 픽셀이 이 비율에 못 미치면(예: 여백이 거의 전부인 표지) 필터를 포기하고 전체
// 평균을 쓴다 — 소수 픽셀의 평균은 대표색이 아니라 잡음이다.
const MIN_KEPT_RATIO = 0.05;

/** 축소 이미지의 픽셀 배열(RGBA)에서 대표색 하나를 뽑는다. 픽셀 데이터만 받는 순수 함수다. */
export function getRepresentativeRgb(data: Uint8ClampedArray): Rgb | null {
  let keptR = 0;
  let keptG = 0;
  let keptB = 0;
  let keptCount = 0;
  let allR = 0;
  let allG = 0;
  let allB = 0;
  let allCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 128) {
      continue;
    }
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    allR += r;
    allG += g;
    allB += b;
    allCount += 1;

    const isNearWhite = Math.min(r, g, b) >= NEAR_WHITE_MIN_CHANNEL;
    const isNearBlack = Math.max(r, g, b) <= NEAR_BLACK_MAX_CHANNEL;
    if (isNearWhite || isNearBlack) {
      continue;
    }

    keptR += r;
    keptG += g;
    keptB += b;
    keptCount += 1;
  }

  if (allCount === 0) {
    return null;
  }

  if (keptCount >= allCount * MIN_KEPT_RATIO) {
    return { r: keptR / keptCount, g: keptG / keptCount, b: keptB / keptCount };
  }

  return { r: allR / allCount, g: allG / allCount, b: allB / allCount };
}

/**
 * 캐시 키(getAccentCacheKey) → 확정된 accent 색. **캐시는 영구적이다(세션 동안).**
 *
 * 페이지를 앞뒤로 넘길 때마다 카드가 다시 마운트되는데, 그때마다 이미지를 다시 읽어 색을 구하면
 * (1) 비용이 반복되고 (2) 로드 순서에 따라 잠깐 폴백 색이 보였다가 바뀌어 같은 책의 색이 깜빡인다.
 * 실패(이미지 없음·로드 실패)도 폴백 색으로 캐시한다 — 실패를 캐시하지 않으면 볼 때마다 재시도하고,
 * 그때마다 같은 깜빡임이 난다. 로드 실패는 오류가 아니라 정상 폴백이다.
 */
const accentColorCache = new Map<string, string>();
/** 같은 컬렉션이 한 화면에 여러 번 있거나 연속 렌더될 때 추출을 중복 실행하지 않는다. */
const pendingExtractions = new Map<string, Promise<string>>();

/**
 * 캐시 키는 collectionId **와 표지 URL**이다.
 *
 * 요구는 "페이지를 오가도 같은 책의 색이 바뀌지 않는다"인데, 같은 컬렉션의 표지 URL은 재생성 전까지
 * 불변이므로 URL을 키에 넣어도 그 요구는 그대로 지켜진다. 반대로 id만으로 키를 잡으면 사용자가 표지를
 * 다시 생성해 URL이 바뀐 뒤에도 새로고침 전까지 **옛 표지의 색**이 남는다 — 그때는 색이 바뀌는 게 맞다.
 */
function getAccentCacheKey(collectionId: number, imageUrl: string | null): string {
  return `${collectionId}|${imageUrl ?? ''}`;
}

// 캐시는 컴포넌트 밖의 외부 저장소다 — 그래서 훅도 useState+setState가 아니라
// useSyncExternalStore로 읽는다. 이유가 둘 있다: (1) 캐시에 이미 값이 있는 경우(페이지를 되돌아온
// 카드)를 effect 안의 setState로 처리하면 마운트 직후 한 번 더 렌더된다 —
// react-hooks/set-state-in-effect가 정확히 이걸 막는다. (2) 같은 컬렉션 카드가 동시에 여러 개
// 떠 있어도 추출 한 번에 전부 함께 갱신된다.
const cacheListeners = new Set<() => void>();

function subscribeAccentColorCache(onStoreChange: () => void): () => void {
  cacheListeners.add(onStoreChange);
  return () => {
    cacheListeners.delete(onStoreChange);
  };
}

function commitAccentColor(cacheKey: string, color: string): void {
  accentColorCache.set(cacheKey, color);
  for (const listener of cacheListeners) {
    listener();
  }
}

function sampleImageAccentColor(image: HTMLImageElement, fallbackColor: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (context === null) {
    return fallbackColor;
  }

  context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

  let data: Uint8ClampedArray;
  try {
    data = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
  } catch {
    // 표지는 같은 오리진(/image/files/*.webp)이라 canvas가 오염될 일이 없지만, 경로가 바뀌어
    // 교차 오리진이 되면 getImageData가 SecurityError를 던진다 — 그때도 화면은 폴백 색으로 멀쩡히
    // 그려져야 한다.
    return fallbackColor;
  }

  const representative = getRepresentativeRgb(data);
  return representative === null ? fallbackColor : getNearestAccentColor(representative);
}

function extractAccentColor(
  cacheKey: string,
  imageUrl: string,
  fallbackColor: string,
): Promise<string> {
  const pending = pendingExtractions.get(cacheKey);
  if (pending !== undefined) {
    return pending;
  }

  const task = new Promise<string>((resolve) => {
    const image = new Image();
    // ⚠️ crossOrigin을 지정하지 않는다 — 표지는 같은 오리진이고, 지정하면 오히려 CORS 헤더가 없는
    // 응답에서 로드가 실패한다.
    image.decoding = 'async';
    image.onload = () => resolve(sampleImageAccentColor(image, fallbackColor));
    image.onerror = () => resolve(fallbackColor);
    image.src = imageUrl;
  }).then((color) => {
    pendingExtractions.delete(cacheKey);
    commitAccentColor(cacheKey, color);
    return color;
  });

  pendingExtractions.set(cacheKey, task);
  return task;
}

/**
 * 331: 표지 이미지에서 뽑은 대표색을 팔레트에 매핑해 돌려준다. 표지가 없거나(coverImageUrl === null)
 * 로드에 실패하면 기존 해시 색이다 — 둘 다 오류가 아닌 정상 상태다.
 *
 * 첫 계산 전에는 해시 색을 그대로 내보낸다(빈 카드를 두지 않는다). 카드 배경에는 이미 transition이
 * 걸려 있어 색이 확정되면 튀지 않고 넘어가고, 그 뒤로는 캐시라 같은 책이 다시 계산되지 않는다.
 */
export function useCollectionAccentColor(collectionId: number, imageUrl: string | null): string {
  const fallbackColor = getCollectionAccentColor(collectionId);
  const cacheKey = getAccentCacheKey(collectionId, imageUrl);
  const color = useSyncExternalStore(
    subscribeAccentColorCache,
    () => accentColorCache.get(cacheKey) ?? fallbackColor,
  );

  useEffect(() => {
    if (imageUrl === null || accentColorCache.has(cacheKey) || typeof document === 'undefined') {
      return;
    }
    // 결과는 캐시에 들어가고 위 구독이 그걸 읽는다 — 여기서 값을 받아 setState 하지 않는다.
    void extractAccentColor(cacheKey, imageUrl, fallbackColor);
  }, [cacheKey, imageUrl, fallbackColor]);

  return color;
}
