/**
 * 활동 기록 화면(407)의 막대 계산. 값 자체를 가공하지 않고 **길이(%)와 라벨 표기**만 만든다 —
 * 정렬·상한·빈 달 채우기는 서버가 끝냈고(08_API_명세 3.7), 프론트가 다시 손대면 기준이 갈린다.
 *
 * SVG·캔버스·차트 라이브러리를 쓰지 않는 것이 이 화면의 설계 전제라(docs 이슈 #55), 막대는 전부
 * div의 height/width 퍼센트다. 그 퍼센트를 만드는 곳이 여기 한 군데뿐이라 세로 막대와 가로 막대가
 * 같은 규칙을 쓴다.
 */

/** 값이 0이 아닌데도 눈에 보이지 않는 것을 막는 최소 길이(%). 0건은 0%로 두어 빈 달이 드러나게 한다. */
const MIN_VISIBLE_PERCENT = 3;

/**
 * 최고값을 100%로 두는 선형 스케일. 최고값이 0(전부 빈 달)이면 모든 막대가 0%다 —
 * 0으로 나누지 않으려는 방어가 아니라, 그 경우 "그릴 것이 없다"가 맞는 답이다.
 */
export function getBarLengthPercent(count: number, maxCount: number): number {
  if (maxCount <= 0 || count <= 0) {
    return 0;
  }
  return Math.max(MIN_VISIBLE_PERCENT, (count / maxCount) * 100);
}

/** 배열에서 최고값. 빈 배열은 0이다(Math.max(...[])가 -Infinity라 직접 접지 않는다). */
export function getMaxRecordCount(items: readonly { recordCount: number }[]): number {
  return items.reduce((max, item) => (item.recordCount > max ? item.recordCount : max), 0);
}

/**
 * 값 라벨을 얹을 막대의 인덱스. **최고값 막대 하나뿐**이다(이슈의 차트 규칙 — 강조는 색이 아니라
 * 값 라벨로 한다. 색이 순위를 따라가면 다음 달에 최고값이 바뀌며 색이 막대 사이를 옮겨다닌다).
 * 동점이면 가장 이른 달 하나만 붙는다 — 여러 개를 붙이면 "최고값"이라는 신호가 흐려진다.
 * 전부 0건이면 -1(어디에도 붙이지 않는다).
 */
export function getPeakIndex(items: readonly { recordCount: number }[]): number {
  let peakIndex = -1;
  let peak = 0;
  items.forEach((item, index) => {
    if (item.recordCount > peak) {
      peak = item.recordCount;
      peakIndex = index;
    }
  });
  return peakIndex;
}

/**
 * "YYYY-MM" → 축 라벨. 1월은 해가 바뀐 지점이라 "26년 1월"로 연도를 붙인다 — 누적 집계라 축이
 * 여러 해에 걸치는데, 전부 "N월"로만 적으면 같은 달이 반복되며 어느 해인지 읽을 수 없다.
 * 형식을 벗어난 값은 원문 그대로 돌려준다(서버 값을 화면에서 지어내지 않는다).
 */
export function formatMonthAxisLabel(month: string): string {
  const matched = /^(\d{4})-(\d{2})$/.exec(month);
  if (!matched) {
    return month;
  }
  const [, year, monthPart] = matched;
  const monthNumber = Number(monthPart);
  if (monthNumber === 1) {
    return `${year.slice(2)}년 1월`;
  }
  return `${monthNumber}월`;
}

/**
 * 축 라벨을 몇 칸에 한 번 찍을지. 누적 집계라 달 수에 상한이 없고, 매 칸에 찍으면 좁은 폭에서
 * 라벨이 서로 겹친다. 라벨 자체를 지우는 대신 **간격을 벌린다** — 막대는 그대로 다 그린다.
 * (막대 하나하나의 값은 hover 툴팁으로 읽는다.)
 */
export function getAxisLabelInterval(monthCount: number): number {
  if (monthCount <= 12) {
    return 1;
  }
  if (monthCount <= 24) {
    return 2;
  }
  return Math.ceil(monthCount / 12);
}
