/**
 * 382 보조 카드 2: "최근 열어본 책".
 *
 * **서버를 쓰지 않는다.** 이런 목록을 주는 API가 없고(08_API_명세에 열람 이력 엔드포인트가 없다),
 * 없는 엔드포인트를 추측해 만들지 않는 것이 이 레포 규칙이다(AGENTS.md). 그래서 이 기능은 전적으로
 * "이 브라우저에서 방금 내가 연 것"이라는 로컬 사실만 다룬다.
 *
 * 저장하는 것은 Collection id와 제목뿐이다 — 둘 다 공개 화면에 이미 그려지는 값이라 새로 노출되는
 * 정보가 없다. contexts·member.id·Keyword code는 애초에 담지 않는다(docs/privacy-rules.md).
 *
 * localStorage를 쓰는 이유: 이 카드의 의미가 "지난번에 보던 것"이라 탭을 닫으면 사라지는 저장소로는
 * 성립하지 않는다. Feed의 cursor를 모듈 변수에만 두는 것(FeedList의 lastFeedPagePosition)과 반대
 * 판단인데, 그쪽은 **서버 세션에 묶인 값**이라 탭 수명을 넘기면 안 되는 반면 이건 순수한 로컬 기록이다.
 *
 * ⚠️ 저장소 접근은 전부 try/catch다. 사파리 프라이빗 모드처럼 localStorage가 던지는 환경이 실제로
 * 있고, 그때 화면이 죽는 것보다 이 카드가 비는 편이 낫다.
 */

const STORAGE_KEY = 'pinlog.recentlyOpenedCollections.v1';
const MAX_ENTRIES = 6;

export interface RecentlyOpenedCollection {
  collectionId: number;
  title: string;
}

function isEntry(value: unknown): value is RecentlyOpenedCollection {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.collectionId === 'number' && typeof candidate.title === 'string';
}

/** 저장된 목록. 최근 것이 앞이다. 형태가 깨진 값은 조용히 버린다(저장소는 사용자가 손댈 수 있다). */
export function readRecentlyOpened(): RecentlyOpenedCollection[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isEntry).slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

/**
 * 방금 연 책을 맨 앞에 놓는다. 같은 책을 다시 열면 중복을 만들지 않고 앞으로 끌어올린다.
 * 반환값은 갱신된 목록이라, 호출부가 저장소를 다시 읽지 않고 화면 상태를 바로 맞출 수 있다.
 */
export function recordRecentlyOpened(entry: RecentlyOpenedCollection): RecentlyOpenedCollection[] {
  const next = [
    entry,
    ...readRecentlyOpened().filter((it) => it.collectionId !== entry.collectionId),
  ].slice(0, MAX_ENTRIES);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 저장에 실패해도 이번 화면에서 쓸 목록은 돌려준다.
  }
  return next;
}
