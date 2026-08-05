import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { updateCollection } from '../api/updateCollection';
import { collectionDetailQueryKey } from './useCollectionDetailQuery';

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다.
//
// 318: 제목 수정과 표지 저장이 같은 PATCH를 쓰지만 훅은 나눠 둔다(useSaveCollectionCoverMutation).
// 화면이 다르고(제목 수정 다이얼로그 / 표지 선택 단계) 무효화할 캐시도 다르다 — 표지는 Feed 카드
// 그림까지 바뀐다. 한 훅에 두 용도를 담으면 호출부마다 "이번엔 무엇을 보내는지"를 다시 읽어야 한다.
export function useUpdateCollectionTitleMutation(collectionId: number) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    // title만 보낸다 — coverImageUrl을 생략하면 서버가 기존 표지를 그대로 둔다(생략 = 유지).
    // ⚠️ Follow 별칭 PATCH와 반대 규칙이다. 그쪽에서 쓰던 "안 바꿀 값도 실어 보내기" 습관을
    // 여기 가져오면 안 된다(api-contract.md § Follow 대비표).
    mutationFn: (title) => updateCollection(collectionId, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionDetailQueryKey(collectionId) });
    },
  });
}
