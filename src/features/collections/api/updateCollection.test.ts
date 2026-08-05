import { afterEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from '@/shared/http/client';
import { updateCollection } from './updateCollection';

// 318: 이 PATCH는 "보내지 않은 필드 = 기존 값 유지"다. Follow 별칭 PATCH는 정반대(생략 = 제거)라,
// 실수로 필드를 함께 실어 보내거나 null로 비우는 코드가 들어오면 표지·제목이 의도치 않게 바뀐다.
// 요청 바디에 무엇이 실리는지를 계약대로 고정한다.

describe('updateCollection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('제목만 수정할 때 coverImageUrl을 실어 보내지 않는다', async () => {
    // 실어 보내도 서버 규칙상 결과는 같지만(null = 유지), 보내지 않는 쪽이 의도가 분명하고
    // "생략 = 제거"인 다른 리소스의 습관이 섞여 들어오는 것을 막는다.
    const patchSpy = vi.spyOn(httpClient, 'patch').mockResolvedValue({ data: undefined });

    await updateCollection(7050, { title: '비 오는 날 다시 갈 카페' });

    expect(patchSpy).toHaveBeenCalledWith('/collections/7050', {
      title: '비 오는 날 다시 갈 카페',
    });
  });

  it('표지만 저장할 때 title을 실어 보내지 않는다', async () => {
    const patchSpy = vi.spyOn(httpClient, 'patch').mockResolvedValue({ data: undefined });

    await updateCollection(7050, { coverImageUrl: '/image/files/abc_image_0.webp' });

    expect(patchSpy).toHaveBeenCalledWith('/collections/7050', {
      coverImageUrl: '/image/files/abc_image_0.webp',
    });
  });

  it('둘 다 보낼 수도 있다', async () => {
    const patchSpy = vi.spyOn(httpClient, 'patch').mockResolvedValue({ data: undefined });

    await updateCollection(7050, { title: '새 제목', coverImageUrl: '/image/files/a.webp' });

    expect(patchSpy).toHaveBeenCalledWith('/collections/7050', {
      title: '새 제목',
      coverImageUrl: '/image/files/a.webp',
    });
  });
});
