import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import {
  collectionDetailQueryKey,
  collectionDetailQueryKeyPrefix,
} from './useCollectionDetailQuery';

// useUpdateContextMutation·useDeleteContextMutation(features/records)이 collectionId 없이
// collectionDetailQueryKeyPrefix()로 무효화하는 근거가 되는 TanStack Query 동작 두 가지를 확인한다:
// (1) queryKey 필터는 기본이 접두사 일치(exact:false)라 더 긴 키를 가진 마운트 쿼리도 함께 잡힌다.
// (2) 매칭되는 마운트 쿼리가 하나도 없어도 invalidateQueries는 에러 없이 조용히 끝난다.
describe('collectionDetailQueryKeyPrefix invalidation', () => {
  it('접두사만으로 여러 collectionId의 상세 쿼리를 모두 무효화한다', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(collectionDetailQueryKey(1), { title: 'a' });
    queryClient.setQueryData(collectionDetailQueryKey(2), { title: 'b' });

    await queryClient.invalidateQueries({ queryKey: collectionDetailQueryKeyPrefix() });

    expect(queryClient.getQueryState(collectionDetailQueryKey(1))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(collectionDetailQueryKey(2))?.isInvalidated).toBe(true);
  });

  it('마운트된 Collection 상세 쿼리가 없으면 안전하게 아무 일도 하지 않는다', async () => {
    const queryClient = new QueryClient();

    await expect(
      queryClient.invalidateQueries({ queryKey: collectionDetailQueryKeyPrefix() }),
    ).resolves.not.toThrow();
  });
});
