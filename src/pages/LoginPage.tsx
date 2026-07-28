import { savePreLoginPath } from '@/features/auth/lib/preLoginPath';
import {
  redirectToProviderLogin,
  type SocialProvider,
} from '@/features/auth/lib/redirectToProviderLogin';

function handleProviderClick(provider: SocialProvider) {
  savePreLoginPath();
  redirectToProviderLogin(provider);
}

// 실제 화면은 목업 확정 후 구현한다. 현재는 라우팅/리다이렉트 로직 검증용 placeholder.
export function LoginPage() {
  return (
    <div>
      <button onClick={() => handleProviderClick('google')}>구글로 로그인</button>
      <button onClick={() => handleProviderClick('kakao')}>카카오로 로그인</button>
      <button onClick={() => handleProviderClick('naver')}>네이버로 로그인</button>
    </div>
  );
}
