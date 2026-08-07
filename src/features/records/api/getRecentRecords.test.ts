import { describe, expect, it, vi } from 'vitest';
import { httpClient } from '@/shared/http/client';
import { getRecentRecords } from './getRecentRecords';

vi.mock('@/shared/http/client', () => ({
  httpClient: { get: vi.fn() },
}));

const place = {
  placeId: 11,
  name: '연남동 카페',
  address: '서울 마포구',
  thumbnailUrl: null,
  lat: 37.56,
  lng: 126.92,
};

describe('getRecentRecords', () => {
  it('명세대로 파싱한다 — keywords 빈 배열은 정상이다', async () => {
    // keywordStatus가 없는 응답이라(5.9) 빈 배열을 "아직 안 됨"으로 볼 근거가 없다.
    // 여기서 던지면 갓 저장한 기록이 있는 사용자의 홈이 통째로 죽는다.
    vi.mocked(httpClient.get).mockResolvedValue({
      data: {
        items: [{ recordId: 8801, place, keywords: [], createdAt: '2026-08-06T11:20:31Z' }],
        nextCursor: null,
        hasNext: false,
      },
    });

    const page = await getRecentRecords();

    expect(page?.items).toHaveLength(1);
    expect(page?.items[0]?.keywords).toEqual([]);
  });

  it('7일 내 기록이 없으면 빈 배열이고, null(미구현)과 구분된다', async () => {
    // 이 구분이 화면 분기의 전부다 — 빈 배열은 안내 문구, null은 영역 비노출이다.
    vi.mocked(httpClient.get).mockResolvedValue({
      data: { items: [], nextCursor: null, hasNext: false },
    });

    await expect(getRecentRecords()).resolves.toEqual({
      items: [],
      nextCursor: null,
      hasNext: false,
    });
  });

  it('엔드포인트가 아직 없으면(404) 던지지 않고 null을 준다', async () => {
    // 백엔드 배포 전에도 홈이 에러 화면이 되거나 재시도가 돌지 않아야 한다.
    vi.mocked(httpClient.get).mockRejectedValue({ status: 404, code: 'NOT_FOUND' });

    await expect(getRecentRecords()).resolves.toBeNull();
  });

  it('그 밖의 실패(401 등)는 그대로 던진다', async () => {
    // 인증 만료를 조용히 "미구현"으로 삼키면 재발급·재로그인 경로가 통째로 막힌다.
    vi.mocked(httpClient.get).mockRejectedValue({ status: 401, code: 'UNAUTHORIZED' });

    await expect(getRecentRecords()).rejects.toMatchObject({ status: 401 });
  });

  it('501은 접지 않는다 — 계약에 없는 코드까지 폴백이 덮지 않는다', async () => {
    vi.mocked(httpClient.get).mockRejectedValue({ status: 501, code: 'NOT_IMPLEMENTED' });

    await expect(getRecentRecords()).rejects.toMatchObject({ status: 501 });
  });

  it('계약이 어긋난 응답은 삼키지 않고 던진다', async () => {
    // 미구현 폴백이 zod 실패까지 덮으면 계약 위반이 조용히 숨는다(빈 화면으로만 보인다).
    vi.mocked(httpClient.get).mockResolvedValue({ data: { items: [{ recordId: 'oops' }] } });

    await expect(getRecentRecords()).rejects.toThrow();
  });

  it('size를 쿼리로 넘긴다 — 장 넘김이 네트워크에 묶이지 않게 한 번에 받는다', async () => {
    vi.mocked(httpClient.get).mockResolvedValue({
      data: { items: [], nextCursor: null, hasNext: false },
    });

    await getRecentRecords({ size: 20 });

    expect(httpClient.get).toHaveBeenCalledWith('/records/recent', { params: { size: 20 } });
  });
});
