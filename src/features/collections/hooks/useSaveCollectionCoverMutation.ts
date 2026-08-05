import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { updateCollection } from '../api/updateCollection';
import { collectionDetailQueryKey } from './useCollectionDetailQuery';
import { myCollectionsQueryKey } from './useMyCollectionsQuery';

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.

/**
 * 318: 이미지 서비스가 만든 최종본 URL을 Collection에 저장한다(PATCH 7.4).
 *
 * **폴링에서 `final.status: "done"`으로 확인한 `final.url`만 보낸다.** 서버는 경로 패턴만 검사하고
 * 파일의 실제 존재는 확인하지 않으므로(확인하려면 core가 이미지 서비스에 결합된다), 아직 완성되지
 * 않은 URL을 보내면 깨진 표지가 그대로 저장된다.
 *
 * 캐시 무효화 범위가 제목 수정보다 넓다 — 표지는 Feed 카드 그림까지 바꾼다. 다만 Feed는 요청마다
 * 추천 세션(requestId)이 새로 생기는 목록이라, 무효화하면 사용자가 보던 페이지가 다른 컬렉션들로
 * 바뀔 수 있다. 그래서 **Feed는 건드리지 않는다** — 내 표지가 탐색 목록에 반영되는 시점은 다음
 * 진입이면 충분하고, 보던 목록이 발밑에서 갈리는 편이 더 나쁘다.
 */
export function useSaveCollectionCoverMutation(collectionId: number) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    // coverImageUrl만 보낸다 — title을 생략하면 서버가 기존 제목을 그대로 둔다(생략 = 유지).
    mutationFn: (coverImageUrl) => updateCollection(collectionId, { coverImageUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionDetailQueryKey(collectionId) });
      queryClient.invalidateQueries({ queryKey: myCollectionsQueryKey });
    },
  });
}
