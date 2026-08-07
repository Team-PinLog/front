/**
 * 홈 "요즘 붙여둔 것" 카드 스택의 배치·순환 규칙. 근거: Jira S15P11A705-371.
 *
 * 컴포넌트에서 분리한 이유는 두 가지다. ① 여기 값들이 시안 조정 때 가장 자주 손대는 부분인데,
 * 순수 함수라 테스트로 규칙(맨 앞이 정면, 뒤로 갈수록 기울고 작아진다, 순환은 끊기지 않는다)을
 * 고정해 두면 각도를 바꿔도 규칙이 깨졌는지 바로 드러난다. ② 렌더 중 계산이라 부수효과가 없어야 한다.
 */

/**
 * 한 번에 펼쳐 보여 줄 행 수. 377에서 "3장 겹침 스택"을 폐기하고 **엇갈려 펼친 배치**로 바꿨다
 * (사용자 지시) — 겹쳐 두면 뒤 장의 내용을 읽을 수 없어 "최근에 어디 갔었지"를 한눈에 확인할 수
 * 없었다.
 *
 * **2인 이유**: 카드가 사진(4:3) + 장소명 + 손글씨 맥락 + 키워드 칩 + 날짜를 담은 리치 폴라로이드라
 * 한 장이 약 200px이다. 세 장이면 보드만 600px을 넘어 히어로와 함께 화면 세로를 다 먹는다.
 * 사용자가 "3장이 안 들어가면 2행만 해도 된다"고 허용한 부분이다.
 * 이 값은 **보이는 카드 수 = 상세 지연 호출 상한**이기도 하다(RecentRecordCard 주석 참고).
 */
export const RECENT_ROW_COUNT = 2;

/**
 * 행마다 다른 가로 오프셋·기울기. 지그재그로 어긋나야 "대시보드에 하나씩 꽂아 둔 종이"로 읽힌다 —
 * 값이 모두 같으면 정렬된 목록처럼 보여 손으로 붙인 인상이 사라진다.
 *
 * 인덱스는 **행 번호**이지 카드 id가 아니다. 넘길 때마다 카드가 한 칸씩 밀려 올라오는데, 각 자리의
 * 모양이 고정돼 있어야 "종이 한 장이 빠지고 다음 장이 그 자리에 온다"로 읽힌다(371의 깊이별 배치와
 * 같은 이유다).
 */
const ROW_TRANSLATE_X_PX = [0, 30, 12] as const;
const ROW_ROTATE_DEG = [-1.8, 1.5, -0.9] as const;

export interface RecentRowLayout {
  rowIndex: number;
  translateXPx: number;
  rotateDeg: number;
  /** 위 행이 아래 행 위로 겹친다 — 압정이 아래 행 카드에 가리지 않게 한다. */
  zIndex: number;
  /** 첫 행. 손글씨 메모를 지연 호출하는 카드다. */
  isFront: boolean;
}

export function getRecentRowLayout(rowIndex: number): RecentRowLayout {
  const safeIndex = Math.max(0, Math.trunc(rowIndex));
  const slot = Math.min(safeIndex, ROW_TRANSLATE_X_PX.length - 1);
  return {
    rowIndex: safeIndex,
    translateXPx: ROW_TRANSLATE_X_PX[slot]!,
    rotateDeg: ROW_ROTATE_DEG[slot]!,
    zIndex: RECENT_ROW_COUNT - safeIndex,
    isFront: safeIndex === 0,
  };
}

/**
 * 지금 펼쳐 보여 줄 카드들. activeIndex가 첫 행이고 뒤로 순환한다.
 * 배열을 회전시키지 않고 인덱스만 계산하는 이유는 371과 같다 — 회전시키면 같은 카드가 매번 다른
 * React key 자리로 가 DOM이 재생성되고 사진이 다시 로드된다.
 */
export function getVisibleRecentIndexes(activeIndex: number, total: number): number[] {
  if (total <= 0) {
    return [];
  }
  const count = Math.min(RECENT_ROW_COUNT, total);
  return Array.from({ length: count }, (_, row) => (activeIndex + row) % total);
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
