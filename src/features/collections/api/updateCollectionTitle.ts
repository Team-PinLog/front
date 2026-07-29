import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 7.4 제목 수정. 소유자만 가능.
 * 응답 바디 스키마가 문서에 명시되어 있지 않아 추측하지 않고 void로 둔다(200이지만 파싱하지 않음).
 */
export interface UpdateCollectionTitleRequest {
  title: string;
}

export async function updateCollectionTitle(
  collectionId: number,
  payload: UpdateCollectionTitleRequest,
): Promise<void> {
  await httpClient.patch(`/collections/${collectionId}`, payload);
}
