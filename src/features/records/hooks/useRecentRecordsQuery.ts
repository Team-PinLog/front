import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { getRecentRecords, type RecentRecordsPage } from '../api/getRecentRecords';

/**
 * 한 번에 받아 둘 카드 수. 명세상 size 기본값은 1이고 상한은 100인데(5.9), 홈의 카드 스택은
 * 좌우 화살표로 **즉시** 넘겨야 해서 장을 넘길 때마다 커서 요청을 태우면 넘김이 네트워크 지연에
 * 묶인다. 7일이라는 짧은 기간이라 개인당 최대치가 크지 않아 넉넉히 한 번에 받고 로컬에서 순환한다
 * (useFollowsQuery의 "네트워크 배치 크기와 화면 노출 개수를 분리한다"와 같은 판단이다).
 * 이 값을 넘는 기록이 있으면 hasNext가 true로 오고, 화면은 "1 / 20+"처럼 표기한다.
 */
export const RECENT_RECORDS_PAGE_SIZE = 20;

/**
 * 무효화용 접두 키. size가 키에 들어 있어 정확한 키를 모르는 mutation 쪽은 이 접두사로 무효화한다
 * (react-query는 접두 일치로 하위 키를 모두 잡는다).
 */
export const recentRecordsQueryKeyPrefix = ['records', 'recent'] as const;

export function recentRecordsQueryKey(size: number = RECENT_RECORDS_PAGE_SIZE) {
  return [...recentRecordsQueryKeyPrefix, size] as const;
}

/**
 * ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
 * TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다.
 *
 * useInfiniteQuery가 아니라 useQuery인 이유 — 카드 스택은 받아온 배열을 **순환**할 뿐 "다음 페이지로
 * 나아가는" UI가 아니다. 커서를 이어 받을 진입점이 화면에 없는데 무한 쿼리를 두면 쓰이지 않는
 * fetchNextPage와 pages 평탄화만 늘어난다. 더 받아야 할 만큼 기록이 쌓이면 그때 전환한다.
 *
 * data가 **null이면 엔드포인트 미구현**이다(getRecentRecords 주석) — 빈 배열과 구분해서 읽어야 한다.
 */
export function useRecentRecordsQuery() {
  return useQuery<RecentRecordsPage | null, ApiError>({
    queryKey: recentRecordsQueryKey(),
    queryFn: () => getRecentRecords({ size: RECENT_RECORDS_PAGE_SIZE }),
  });
}
