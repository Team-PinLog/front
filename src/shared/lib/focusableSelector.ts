/**
 * 포커스 트랩이 순회할 대상 선택자.
 *
 * 385: 원래 ConfirmDialog 안에 있던 상수인데, 설정 모달(AppLayout)도 같은 트랩을 걸게 되면서
 * 공용으로 뽑았다. 각자 들고 있으면 한쪽만 갱신됐을 때 "이 모달에서만 Tab이 새는" 차이가 조용히
 * 생긴다.
 *
 * 컴포넌트 파일이 아니라 lib/에 두는 것은 이 레포 관례다 — 컴포넌트 파일이 컴포넌트 외의 것을
 * export하면 Fast Refresh가 깨진다(eslint react-hooks의 react-refresh/only-export-components).
 *
 * 지금 트랩이 걸리는 모달 안에는 버튼뿐이지만, 나중에 링크·입력이 들어와도 트랩이 저절로
 * 따라오도록 일반적인 선택자를 쓴다.
 */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');
