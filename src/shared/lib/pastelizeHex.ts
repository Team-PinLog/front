// 287-15: 채도를 낮추는 게 파스텔이 아니다 — 채도를 낮추기만 하면 탁하고 흐릿한 회색조가 된다
// (실제로 이전 버전에서 그렇게 나왔다: 채도 50%로 절반 낮추니 원래 채도가 낮았던 책등색들이 거의
// 무채색에 가까워졌다). "파스텔"은 명도를 높이되 채도는 오히려 쨍하게(생생하게) 유지·보강해야
// 옅으면서도 선명한 톤이 된다. hue(색상)는 그대로 두므로 원래 팔레트의 색 구분은 유지된다.
// 상대 변환(보간)을 쓰는 이유: 절대값으로 고정하면(예: "S=70%, L=80%") 원래 색마다 다른 채도·명도
// 차이가 뭉개져 팔레트 색들이 서로 비슷해 보인다 — 상대 변환은 "원래 더 쨍했던 색은 변환 후에도
// 상대적으로 더 쨍하게" 남겨 색 간 구분이 유지된다.
const PASTEL_SATURATION_TOWARD_VIVID = 0.25; // 채도를 100%(완전 채도) 쪽으로 25%만큼 끌어올림
const PASTEL_LIGHTNESS_TOWARD_WHITE = 0.35; // 명도를 흰색(100%) 쪽으로 35%만큼 끌어올림
const PASTEL_MAX_LIGHTNESS = 85; // 채도를 살리면서도 흰 배경(paper-white)과 구분되도록 상한을 둔다

function hexToHsl(hex: string): [h: number, s: number, l: number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return [0, 0, l * 100];
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) {
    h = (g - b) / d + (g < b ? 6 : 0);
  } else if (max === g) {
    h = (b - r) / d + 2;
  } else {
    h = (r - g) / d + 4;
  }
  return [h * 60, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r: number;
  let g: number;
  let b: number;
  if (h < 60) {
    [r, g, b] = [c, x, 0];
  } else if (h < 120) {
    [r, g, b] = [x, c, 0];
  } else if (h < 180) {
    [r, g, b] = [0, c, x];
  } else if (h < 240) {
    [r, g, b] = [0, x, c];
  } else if (h < 300) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }

  const toHex = (channel: number) =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function pastelizeHex(hex: string): string {
  const [h, s, l] = hexToHsl(hex);
  const pastelS = s + (100 - s) * PASTEL_SATURATION_TOWARD_VIVID;
  const pastelL = Math.min(l + (100 - l) * PASTEL_LIGHTNESS_TOWARD_WHITE, PASTEL_MAX_LIGHTNESS);
  return hslToHex(h, pastelS, pastelL);
}
