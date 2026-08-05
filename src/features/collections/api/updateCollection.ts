import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 7.4 제목·표지 수정, docs/api-contract.md § Collection 표지 이미지.
 * 응답 바디 스키마가 문서에 명시되어 있지 않아 추측하지 않고 void로 둔다(200이지만 파싱하지 않음).
 *
 * 318: `updateCollectionTitle`에서 이름을 바꿨다 — 같은 PATCH가 제목과 표지를 함께 다루게 됐다.
 *
 * ⚠️ **이 요청 타입을 Follow 별칭 수정과 공유하지 않는다.** 두 PATCH는 생략 규칙이 정반대다.
 *
 * | 보낸 형태 | PATCH /follows (별칭) | PATCH /collections (여기) |
 * |---|---|---|
 * | 키 생략   | **제거된다**          | **기존 값 유지**          |
 * | null 명시 | **제거된다**          | **기존 값 유지**          |
 * | 빈 요청   | 별칭 제거로 정상 처리 | **400**                   |
 *
 * 서버(Jackson)가 "키 부재"와 "명시적 null"을 구분하지 못하는 같은 제약 위에 있는데, 별칭은 제거가
 * 필요한 기능이라 "없으면 제거"로, 표지는 제거 UI가 없어 "없으면 유지"로 정했다. 그래서 "변경된
 * 필드만 모아 보내는" 범용 부분수정 헬퍼를 두 리소스에 공유하면 별칭이 조용히 지워진다.
 */
export interface UpdateCollectionRequest {
  /** 생략하면 기존 제목 유지. */
  title?: string;
  /**
   * 생략하면 기존 표지 유지. **표지 제거는 이 API로 불가능하다**(등록·교체만 있다).
   * 값은 이미지 서비스 최종본의 같은 오리진 상대 경로여야 한다 — 서버가
   * `^/image/files/[A-Za-z0-9._-]+\.webp$`로 검증하고 벗어나면 400이다.
   */
  coverImageUrl?: string;
}

export async function updateCollection(
  collectionId: number,
  payload: UpdateCollectionRequest,
): Promise<void> {
  await httpClient.patch(`/collections/${collectionId}`, payload);
}
