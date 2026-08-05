import { afterEach, describe, expect, it, vi } from 'vitest';
import { imageClient } from '@/shared/http/imageClient';
import { createCoverRequest, getCoverRequest, selectCoverStyle } from './coverGeneration';

// 317: 이미지 서비스는 core와 달리 봉투가 없고 필드가 snake_case다. 경계에서 그 둘을 흡수하는 게
// 이 모듈의 일이라, 파싱 결과가 프론트 관례(camelCase)로 나오는지와 계약 이탈 시 실패하는지를 고정한다.

const DONE_CANDIDATE = {
  style_id: 'watercolour',
  label: '수채화',
  status: 'done',
  url: '/image/files/abc_image_0.webp',
};

describe('createCoverRequest', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('request_id를 coverRequestId로 바꾸고 후보를 queued로 채운다', async () => {
    // 생성 응답의 candidates에는 status·url이 없다 — 잡이 막 큐에 들어간 시점이다.
    vi.spyOn(imageClient, 'post').mockResolvedValue({
      data: {
        request_id: 'b11d1291',
        candidates: [
          { style_id: 'watercolour', label: '수채화' },
          { style_id: 'ink_line', label: '펜화' },
        ],
      },
    });

    const result = await createCoverRequest({ title: '비 오는 날', keywords: ['카페'] });

    expect(result).toEqual({
      coverRequestId: 'b11d1291',
      candidates: [
        { styleId: 'watercolour', label: '수채화', status: 'queued', url: null },
        { styleId: 'ink_line', label: '펜화', status: 'queued', url: null },
      ],
    });
  });

  it('한국어 title·keywords를 그대로 보낸다(번역·프롬프트 조립 금지)', async () => {
    const postSpy = vi.spyOn(imageClient, 'post').mockResolvedValue({
      data: { request_id: 'r1', candidates: [] },
    });

    await createCoverRequest({ title: '고요한 물가의 기록', keywords: ['호수', '새벽 안개'] });

    expect(postSpy).toHaveBeenCalledWith('/covers', {
      title: '고요한 물가의 기록',
      keywords: ['호수', '새벽 안개'],
    });
  });
});

describe('getCoverRequest', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('폴링 응답을 camelCase로 바꾼다', async () => {
    vi.spyOn(imageClient, 'get').mockResolvedValue({
      data: {
        request_id: 'r1',
        status: 'running',
        candidates: [
          DONE_CANDIDATE,
          { style_id: 'ink_line', label: '펜화', status: 'running', url: null },
        ],
        final: null,
      },
    });

    const state = await getCoverRequest('r1');

    expect(state.coverRequestId).toBe('r1');
    expect(state.candidates[0]).toEqual({
      styleId: 'watercolour',
      label: '수채화',
      status: 'done',
      url: '/image/files/abc_image_0.webp',
    });
    expect(state.final).toBeNull();
  });

  it('final(인쇄본)도 같은 형태로 파싱한다', async () => {
    vi.spyOn(imageClient, 'get').mockResolvedValue({
      data: { request_id: 'r1', status: 'done', candidates: [], final: DONE_CANDIDATE },
    });

    const state = await getCoverRequest('r1');

    expect(state.final?.styleId).toBe('watercolour');
    expect(state.final?.url).toBe('/image/files/abc_image_0.webp');
  });

  it('모르는 style_id도 그대로 통과시킨다', async () => {
    // 프론트는 style_id를 해석하지 않는다 — 카드에 찍는 것은 label이고 id는 선택 시 돌려보내는
    // 불투명 값이다. enum으로 좁히면 AI 파트가 화풍을 추가하는 순간 화면이 통째로 죽는다.
    vi.spyOn(imageClient, 'get').mockResolvedValue({
      data: {
        request_id: 'r1',
        status: 'running',
        candidates: [
          { style_id: 'brand_new_style', label: '새 화풍', status: 'queued', url: null },
        ],
        final: null,
      },
    });

    const state = await getCoverRequest('r1');

    expect(state.candidates[0].styleId).toBe('brand_new_style');
  });

  it('모르는 status는 거절한다', async () => {
    // 반대로 status는 좁힌다 — 값마다 화면이 다르고 폴링 종료 여부까지 이 값으로 판단하므로,
    // 모르는 값이 흘러들면 폴링이 멈추지 않거나 잘못된 화면을 그린다.
    vi.spyOn(imageClient, 'get').mockResolvedValue({
      data: {
        request_id: 'r1',
        status: 'paused',
        candidates: [],
        final: null,
      },
    });

    await expect(getCoverRequest('r1')).rejects.toThrow();
  });
});

describe('selectCoverStyle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('style_id로 보내고 응답을 camelCase로 받는다', async () => {
    const postSpy = vi.spyOn(imageClient, 'post').mockResolvedValue({
      data: { request_id: 'r1', job_id: 'j1', style_id: 'woodblock' },
    });

    const result = await selectCoverStyle('r1', 'woodblock');

    expect(postSpy).toHaveBeenCalledWith('/covers/r1/select', { style_id: 'woodblock' });
    expect(result).toEqual({ coverRequestId: 'r1', jobId: 'j1', styleId: 'woodblock' });
  });
});
