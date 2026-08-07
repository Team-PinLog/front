import { useAddToCollection } from '@/contexts/useAddToCollection';

/**
 * Record 상세에서 기존 컬렉션에 담거나 새 컬렉션을 만드는 진입점.
 * 근거: Jira S15P11A705-139·216, docs/reference/09_유저플로우.md 6장.
 *
 * 373 사용자 피드백: 이 버튼만 예전 회색 테두리라 노트 페이지 디자인과 겉돌고 좌우 여백이 좁았다.
 * 유일한 소비처가 Record 상세(노트 페이지)라 그 화면의 디자인 언어에 맞춘다 — 시안 초록 계열
 * (#4f9b78/#dcecdf/#3f7d5f)·radius 999px·좌우 여백 px-5. 기능과 위치는 그대로다.
 */
export function AddToCollectionButton() {
  const addToCollectionState = useAddToCollection();

  return (
    <button
      type="button"
      onClick={addToCollectionState.open}
      className="inline-flex h-11 items-center gap-2 rounded-full border border-[#cfe4d5] bg-[#eef6f0] px-5 text-[15px] font-bold text-[#3f7d5f] transition-colors hover:border-[#a9cfb8] hover:bg-[#dcecdf]"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z" />
      </svg>
      컬렉션에 담기
    </button>
  );
}
