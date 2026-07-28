// beforeLoad(handleOAuthCallback)가 항상 리다이렉트하므로 실제로는 거의 렌더링되지 않는 placeholder.
export function OAuthCallbackPage() {
  return <p>로그인 처리 중입니다...</p>;
}
