import { hashPaletteIndex } from './hashPaletteIndex';
import marker01Navy from '@/assets/color-markers/marker-01-navy.svg';
import marker02Coral from '@/assets/color-markers/marker-02-coral.svg';
import marker03Violet from '@/assets/color-markers/marker-03-violet.svg';
import marker04Denim from '@/assets/color-markers/marker-04-denim.svg';
import marker05DeepTeal from '@/assets/color-markers/marker-05-deep-teal.svg';
import marker06Mint from '@/assets/color-markers/marker-06-mint.svg';
import marker07Brown from '@/assets/color-markers/marker-07-brown.svg';
import marker08Rose from '@/assets/color-markers/marker-08-rose.svg';
import marker09Gold from '@/assets/color-markers/marker-09-gold.svg';
import marker10Plum from '@/assets/color-markers/marker-10-plum.svg';
import marker11Blue from '@/assets/color-markers/marker-11-blue.svg';
import marker12Pink from '@/assets/color-markers/marker-12-pink.svg';
import marker13Orange from '@/assets/color-markers/marker-13-orange.svg';
import marker14Green from '@/assets/color-markers/marker-14-green.svg';
import marker15Cyan from '@/assets/color-markers/marker-15-cyan.svg';
import marker16Amber from '@/assets/color-markers/marker-16-amber.svg';
import marker17Purple from '@/assets/color-markers/marker-17-purple.svg';
import marker18Teal from '@/assets/color-markers/marker-18-teal.svg';
import marker19Red from '@/assets/color-markers/marker-19-red.svg';
import marker20Slate from '@/assets/color-markers/marker-20-slate.svg';

/**
 * 마커 SVG 원본 크기(px)와 핀 끝점의 세로 비율.
 * src/assets/color-markers/*.svg는 모두 동일한 64x76 viewBox·동일한 path를 쓰고 색(fill)만 다르다.
 * 핀의 뾰족한 끝은 y=68.32다(76이 아니다 — 아래 8px 가까이는 SVG 안에 내장된 feDropShadow가
 * 잘리지 않도록 비워둔 여백이다). 그래서 CustomOverlay yAnchor를 1로 두면 핀 끝이 실제 좌표보다
 * 약 8px 위에 찍힌다.
 * 근거: Jira S15P11A705-307.
 *
 * 마커 실루엣이 물방울 핀 → 책등으로 바뀔 때(디자인 개편) 끝점 y를 68.32에 그대로 두었기 때문에
 * 이 값과 아래 앵커 계산은 손대지 않았다. asset을 다시 그릴 일이 있으면 그 규칙을 지킨다
 * (src/assets/color-markers/README.md).
 */
export const RECORD_MARKER_ASSET_WIDTH = 64;
export const RECORD_MARKER_ASSET_HEIGHT = 76;
export const RECORD_MARKER_TIP_Y_RATIO = 68.32 / RECORD_MARKER_ASSET_HEIGHT;

/**
 * collectionId 해시로 배정하는 마커 색 팔레트(19색). README.md의 01~19 순서를 그대로 따른다.
 * 20번 slate는 아래 UNASSIGNED_MARKER_ASSET 전용이라 여기서 제외한다 — 해시 팔레트에 섞으면
 * 우연히 특정 Collection이 "미분류"와 같은 마커를 배정받아 둘이 시각적으로 구분되지 않는다.
 */
const MARKER_ASSETS = [
  marker01Navy,
  marker02Coral,
  marker03Violet,
  marker04Denim,
  marker05DeepTeal,
  marker06Mint,
  marker07Brown,
  marker08Rose,
  marker09Gold,
  marker10Plum,
  marker11Blue,
  marker12Pink,
  marker13Orange,
  marker14Green,
  marker15Cyan,
  marker16Amber,
  marker17Purple,
  marker18Teal,
  marker19Red,
];

/**
 * 위 MARKER_ASSETS와 **같은 순서**로 각 asset의 fill 색을 들고 있는 표.
 * 범례(MapCollectionLegend)의 색 견본은 SVG를 파싱할 수 없으므로 이 값을 쓴다 — asset 색을
 * 바꾸면 여기도 함께 고친다(src/assets/color-markers/README.md의 표가 원본).
 *
 * 배열을 하나 더 두는 대신 SVG에서 색을 뽑아 쓰는 방법도 있지만, asset은 Vite가 URL로 넘겨주는
 * 정적 파일이라 런타임에 내용을 읽으려면 fetch가 필요하다 — 색 하나 얻자고 마커 수만큼 네트워크
 * 요청을 만들 이유가 없다. 대신 순서가 어긋나면 조용히 틀리므로 아래 테스트로 길이를 묶어 둔다.
 */
const MARKER_COLORS = [
  '#083A67', // 01 navy
  '#F05A3D', // 02 coral
  '#7257B5', // 03 violet
  '#2E5D8C', // 04 denim
  '#1B4C6B', // 05 deep teal
  '#2CB8A6', // 06 mint
  '#A0784A', // 07 brown
  '#D64F78', // 08 rose
  '#E2A01F', // 09 gold
  '#6A3F77', // 10 plum
  '#356D9B', // 11 blue
  '#E05286', // 12 pink
  '#E47C2B', // 13 orange
  '#498A69', // 14 green
  '#279FC4', // 15 cyan
  '#E8A51E', // 16 amber
  '#8756A6', // 17 purple
  '#237E88', // 18 teal
  '#D84852', // 19 red
];

/**
 * collectionId가 null(어떤 Collection에도 속하지 않은 Record)인 마커 전용 고정 asset.
 * 20색 중 채도가 가장 낮은 slate(#3D6280) — 이 세트에는 무채색 마커가 없어, 나머지 19색과
 * 섞였을 때 가장 "색이 지정되지 않은 것"처럼 읽히는 값을 골랐다.
 */
const UNASSIGNED_MARKER_ASSET = marker20Slate;
const UNASSIGNED_MARKER_COLOR = '#3D6280';

/** MARKER_ASSETS와 MARKER_COLORS의 순서가 어긋나면 범례 색과 지도 마커 색이 달라진다. */
export const RECORD_MARKER_PALETTE_SIZE = MARKER_ASSETS.length;

/**
 * collectionId를 해시해 마커 asset(SVG URL)을 고정 배정한다 — 같은 Collection에 속한 기록끼리
 * 같은 마커를 쓴다(hashPaletteIndex — getCollectionAccentColor.ts와 같은 해시 함수를 공유해 같은
 * id는 항상 같은 결과를 낸다). collectionId가 null이면 해시 대신 UNASSIGNED_MARKER_ASSET을 쓴다.
 * 반환값은 Vite가 번들링한 asset URL이라 <img src>에 그대로 넣으면 된다.
 * 근거: Jira S15P11A705-307, docs/api-contract.md "[확정] 지도 마커 조회 응답에 latestCollectionId 추가".
 * 인자로 받는 값은 `GET /records/map` 응답의 `latestCollectionId`(가장 최근에 담긴 Collection id)다.
 */
export function getRecordMarkerAsset(collectionId: number | null): string {
  if (collectionId === null) {
    return UNASSIGNED_MARKER_ASSET;
  }
  return MARKER_ASSETS[hashPaletteIndex(collectionId, MARKER_ASSETS.length)];
}

/**
 * getRecordMarkerAsset과 **같은 인덱스**로 그 마커의 fill 색(hex)을 돌려준다.
 * 범례가 "이 색 = 이 책"을 보여주려면 지도에 찍힌 마커와 정확히 같은 색을 그려야 해서, 해시도
 * 팔레트 길이도 위 함수와 공유한다 — 둘 중 하나만 고치면 범례와 지도가 어긋난다.
 */
export function getRecordMarkerColor(collectionId: number | null): string {
  if (collectionId === null) {
    return UNASSIGNED_MARKER_COLOR;
  }
  return MARKER_COLORS[hashPaletteIndex(collectionId, MARKER_COLORS.length)];
}
