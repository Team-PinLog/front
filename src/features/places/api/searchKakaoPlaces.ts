import { z } from 'zod';
import { KAKAO_REST_KEY } from '@/config/constants';

/**
 * 카카오 로컬 API(키워드 장소 검색)를 프론트가 직접 호출한다.
 * 근거: docs/api-contract.md Place·지도·검색, docs/reference/08_API_명세.md 4.1.
 * 검색만으로 내부 Place를 저장하지 않는다 — 선택 후 저장 시에만 POST /records로 전달한다(features/records).
 */
const KAKAO_KEYWORD_SEARCH_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json';

const kakaoPlaceDocumentSchema = z.object({
  id: z.string(),
  place_name: z.string(),
  address_name: z.string(),
  road_address_name: z.string(),
  x: z.string(),
  y: z.string(),
});

const kakaoSearchResponseSchema = z.object({
  documents: z.array(kakaoPlaceDocumentSchema),
});

export interface KakaoPlace {
  kakaoPlaceId: string;
  name: string;
  address: string;
  roadAddress: string;
  lat: number;
  lng: number;
}

export async function searchKakaoPlaces(query: string): Promise<KakaoPlace[]> {
  const keyword = query.trim();
  if (!keyword) {
    return [];
  }
  if (!KAKAO_REST_KEY) {
    throw new Error('KAKAO_REST_KEY_MISSING');
  }

  const url = new URL(KAKAO_KEYWORD_SEARCH_URL);
  url.searchParams.set('query', keyword);

  const response = await fetch(url, {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
  });
  if (!response.ok) {
    throw new Error('KAKAO_SEARCH_FAILED');
  }

  const body: unknown = await response.json();
  const { documents } = kakaoSearchResponseSchema.parse(body);

  return documents.map((doc) => ({
    kakaoPlaceId: doc.id,
    name: doc.place_name,
    address: doc.address_name,
    roadAddress: doc.road_address_name,
    lat: Number(doc.y),
    lng: Number(doc.x),
  }));
}
