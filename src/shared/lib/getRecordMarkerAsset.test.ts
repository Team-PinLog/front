import { describe, expect, it } from 'vitest';
import {
  getRecordMarkerAsset,
  getRecordMarkerColor,
  RECORD_MARKER_PALETTE_SIZE,
} from './getRecordMarkerAsset';

/**
 * asset(SVG)과 색(hex 문자열)은 서로 다른 두 배열에 들어 있고 같은 해시 인덱스로 짝지어진다.
 * 순서가 어긋나도 타입은 통과하고 화면만 조용히 틀린다 — 범례 색 견본이 지도에 찍힌 마커와
 * 다른 색으로 그려진다. 그래서 색 표를 여기에 또 베끼지 않고, **asset SVG 안의 실제 fill**을
 * 꺼내 getRecordMarkerColor와 맞춰 본다. 표를 세 벌로 늘리면 그 사본들끼리 또 어긋난다.
 */

/** asset URL(data URI)을 SVG 원문으로 되돌린다. */
function svgSourceOf(assetUrl: string): string {
  if (!assetUrl.startsWith('data:')) {
    // Vite는 작은 SVG를 data URI로 인라인한다. 여기 걸린다면 asset이 커져 assetsInlineLimit을
    // 넘었다는 뜻이다 — 그때는 이 헬퍼가 파일을 읽도록 고쳐야 한다(조용히 통과시키지 않는다).
    throw new Error(`marker asset이 data URI가 아니다: ${assetUrl.slice(0, 80)}`);
  }
  return decodeURIComponent(assetUrl.slice(assetUrl.indexOf(',') + 1));
}

/**
 * 마커 몸통의 fill(hex)을 꺼낸다.
 * 첫 번째 fill이 몸통이고 두 번째는 책배(크림색)라 first match만 본다.
 */
function bodyFillOf(assetUrl: string): string {
  const matched = /fill=["'](#[0-9A-Fa-f]{6})["']/.exec(svgSourceOf(assetUrl));
  if (!matched) {
    throw new Error(`marker asset에서 fill을 못 찾음: ${assetUrl.slice(0, 120)}`);
  }
  return matched[1].toUpperCase();
}

describe('getRecordMarkerAsset / getRecordMarkerColor', () => {
  it('같은 collectionId면 색 표와 asset의 실제 fill이 일치한다', () => {
    // 팔레트 길이보다 넉넉히 돌려 19개 인덱스를 모두 밟게 한다.
    for (let collectionId = 1; collectionId <= RECORD_MARKER_PALETTE_SIZE * 5; collectionId += 1) {
      expect(getRecordMarkerColor(collectionId)).toBe(
        bodyFillOf(getRecordMarkerAsset(collectionId)),
      );
    }
  });

  it('19색 해시 팔레트를 모두 쓰고, 미분류 색(slate)은 섞이지 않는다', () => {
    const used = new Set<string>();
    for (let collectionId = 1; collectionId <= RECORD_MARKER_PALETTE_SIZE * 20; collectionId += 1) {
      used.add(getRecordMarkerColor(collectionId));
    }
    expect(used.size).toBe(RECORD_MARKER_PALETTE_SIZE);
    expect(used.has(getRecordMarkerColor(null))).toBe(false);
  });

  it('collectionId가 null이면 미분류 전용 asset·색을 쓴다', () => {
    expect(getRecordMarkerColor(null)).toBe(bodyFillOf(getRecordMarkerAsset(null)));
  });

  it('모든 마커의 끝점이 y=68.32다 — 이 값이 흔들리면 핀이 좌표에서 어긋난다', () => {
    // 앵커 계산(RECORD_MARKER_TIP_Y_RATIO)의 전제라 asset을 다시 그릴 때 가장 깨지기 쉽다.
    for (let collectionId = 1; collectionId <= RECORD_MARKER_PALETTE_SIZE; collectionId += 1) {
      expect(svgSourceOf(getRecordMarkerAsset(collectionId))).toContain('68.32');
    }
    expect(svgSourceOf(getRecordMarkerAsset(null))).toContain('68.32');
  });
});
