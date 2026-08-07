/**
 * 홈 "요즘 붙여둔 것" 카드 스택의 배치·순환 규칙. 근거: Jira S15P11A705-371.
 *
 * 컴포넌트에서 분리한 이유는 두 가지다. ① 여기 값들이 시안 조정 때 가장 자주 손대는 부분인데,
 * 순수 함수라 테스트로 규칙(맨 앞이 정면, 뒤로 갈수록 기울고 작아진다, 순환은 끊기지 않는다)을
 * 고정해 두면 각도를 바꿔도 규칙이 깨졌는지 바로 드러난다. ② 렌더 중 계산이라 부수효과가 없어야 한다.
 */

/**
 * 앞장 뒤로 실제 그리는 장 수. 2 = 앞장 1 + 뒤 2, 화면에 카드 세 장이 함께 보인다.
 * (디자인 지침 변경 — 처음엔 뒷장 가장자리만 살짝 보이는 한 장짜리 스택이었으나, "우측에 3장 정도가
 * 붙어 있는 형태"로 바뀌었다. 뒤 장도 각각 카드로 식별돼야 한다.)
 * 이 상수는 DOM에 그릴 장 수인 동시에 아래 배치 배열의 최대 깊이라 둘이 같이 움직인다.
 */
export const RECENT_STACK_VISIBLE_DEPTH = 2;

/**
 * 뒷장 기울기·이동값. 인덱스는 **화면상 깊이(offset)** 다 — 카드의 고유 id가 아니다.
 * id 기반 해시(ContextStickyNote 방식)를 쓰지 않은 이유: 저 방식은 "같은 항목은 항상 같은 모양"이
 * 목적이지만, 여기서는 반대로 **자리마다 모양이 고정**돼야 한다. 장을 넘겼을 때 새 앞장이 항상
 * 정면(0deg)으로 오고 뒷장들이 같은 각도로 재정렬돼야 "한 장이 빠져 뒤로 들어갔다"로 읽힌다.
 * id 해시로 각도를 주면 넘길 때마다 스택 전체가 다른 모양이 되어 순환이 아니라 셔플로 보인다.
 *
 * **계단식(오른쪽 위로) + 약한 회전**을 골랐다. 부채꼴(한 점을 축으로 크게 벌리는 배치)이 아닌 이유:
 * ① 이 영역은 지도 위 우측의 좁은 띠라 가로 예산이 작은데, 부채꼴은 회전각이 커질수록 카드
 *    바깥 모서리가 원호를 그리며 폭을 급격히 먹는다(같은 노출량을 얻는 데 훨씬 넓은 자리가 든다).
 * ② 폴라로이드는 위가 사진, 아래가 텍스트다. 뒷장을 **오른쪽 위로** 밀면 각 장의 사진 윗부분이
 *    드러나 "카드 세 장"으로 읽힌다. 아래로 밀면 앞장이 뒷장의 사진을 덮어 텍스트 여백만 남는다.
 * ③ 회전을 완전히 빼지 않고 2.4도씩만 준 것은, 오프셋만으로는 세 장이 자로 잰 듯 평행해 "쌓인
 *    종이"가 아니라 그리드처럼 보이기 때문이다. 각도는 손으로 겹쳐 둔 느낌을 만드는 최소치다.
 */
const STACK_ROTATIONS_DEG = [0, 2.4, 4.8] as const;
const STACK_TRANSLATE_X_PX = [0, 34, 64] as const;
const STACK_TRANSLATE_Y_PX = [0, -16, -30] as const;

export interface RecentStackCardLayout {
  /** 앞장(0)으로부터의 깊이. */
  offset: number;
  rotateDeg: number;
  translateXPx: number;
  translateYPx: number;
  scale: number;
  /** 앞장이 가장 위. 뒤로 갈수록 낮아진다. */
  zIndex: number;
  isFront: boolean;
}

function pickByOffset<T>(values: readonly T[], offset: number): T {
  // offset이 배열보다 깊어져도 마지막 값을 유지한다 — 가장 뒤 장들은 어차피 가장자리만 보인다.
  return values[Math.min(offset, values.length - 1)] as T;
}

/**
 * 깊이 offset인 장의 배치. offset 0이 정면이고, 뒤로 갈수록 기울고 오른쪽 아래로 밀리며 작아진다.
 * "겹쳐 쌓인 폴라로이드"라 뒷장은 가장자리만 노출되면 충분하므로 이동값을 크게 주지 않는다.
 */
export function getRecentStackCardLayout(offset: number): RecentStackCardLayout {
  const safeOffset = Math.max(0, Math.trunc(offset));
  return {
    offset: safeOffset,
    rotateDeg: pickByOffset(STACK_ROTATIONS_DEG, safeOffset),
    translateXPx: pickByOffset(STACK_TRANSLATE_X_PX, safeOffset),
    translateYPx: pickByOffset(STACK_TRANSLATE_Y_PX, safeOffset),
    // 한 장당 5%씩 줄인다. 세 장이 함께 보이므로 축소가 곧 원근이다 — 이보다 작게 주면 세 장이
    // 같은 평면에 놓인 것처럼 보이고, 크게 주면 맨 뒷장이 다른 크기의 카드로 보인다.
    scale: Math.max(0.85, 1 - safeOffset * 0.05),
    zIndex: RECENT_STACK_VISIBLE_DEPTH + 1 - safeOffset,
    isFront: safeOffset === 0,
  };
}

/**
 * 앞장 기준 깊이. 목록 순서를 바꾸지 않고 "지금 몇 번째 장이 앞이냐"만 옮기기 위한 계산이다 —
 * 배열 자체를 회전시키면 React key가 매 넘김마다 다른 위치로 이동해 카드 DOM이 재생성되고,
 * 그 순간 이미지가 다시 로드되며 깜빡인다.
 */
export function getRecentStackOffset(index: number, activeIndex: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return (index - activeIndex + total * 2) % total;
}

/**
 * 좌우 화살표의 순환. delta는 +1(다음 장) 또는 -1(이전 장)이다. 끝에서 끊기지 않고 반대편으로
 * 넘어간다 — 시안의 "맨 앞장이 빠져나가 맨 뒤로 들어간다"가 곧 이 순환이다.
 * total이 0이면 0을 돌려줘 호출부가 빈 목록을 따로 방어하지 않아도 된다.
 */
export function getCycledRecentIndex(activeIndex: number, delta: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return (((activeIndex + delta) % total) + total) % total;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * "오늘 / 어제 / N일 전". 서버가 7일로 잘라 주므로 주·달 단위 표기는 필요 없다.
 *
 * 시각 차이(밀리초)를 24로 나누지 않고 **자정 기준 날짜 수**로 센다. 어제 23시에 저장한 기록은
 * 시간 차이로는 몇 시간이지만 사람에게는 "어제"라, 밀리초로 세면 "0일 전"이 되어 어긋난다.
 * 기준 시각(now)을 인자로 받는 것은 테스트 때문만이 아니라 렌더 시점을 호출부가 정하게 하려는
 * 것이다 — 함수 안에서 new Date()를 부르면 순수 함수가 아니게 된다.
 */
export function formatRecentRelativeDay(createdAt: string, now: Date): string {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) {
    // 서버가 준 값이 파싱되지 않는 경우까지 화면을 깨뜨리지 않는다 — 날짜는 부가 정보다.
    return '';
  }
  const startOfCreated = new Date(
    created.getFullYear(),
    created.getMonth(),
    created.getDate(),
  ).getTime();
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayDiff = Math.round((startOfNow - startOfCreated) / MS_PER_DAY);

  if (dayDiff <= 0) {
    // 미래 시각(기기 시계가 어긋난 경우)도 "오늘"로 접는다. "-1일 전"을 보여줄 이유가 없다.
    return '오늘';
  }
  if (dayDiff === 1) {
    return '어제';
  }
  return `${dayDiff}일 전`;
}
