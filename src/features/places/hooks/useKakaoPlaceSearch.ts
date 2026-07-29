import { useMutation } from '@tanstack/react-query';
import { searchKakaoPlaces, type KakaoPlace } from '../api/searchKakaoPlaces';

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수를 직접 부르지 않는다.
// 검색은 입력마다 자동 실행되는 조회가 아니라 사용자가 검색을 실행하는 동작이라 useMutation을 쓴다.
export function useKakaoPlaceSearch() {
  return useMutation<KakaoPlace[], Error, string>({
    mutationFn: searchKakaoPlaces,
  });
}
