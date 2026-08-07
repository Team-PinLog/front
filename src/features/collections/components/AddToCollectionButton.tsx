import { useAddToCollection } from '@/contexts/useAddToCollection';

/**
 * Record 상세에서 기존 컬렉션에 담거나 새 컬렉션을 만드는 진입점.
 * 근거: Jira S15P11A705-139·216, docs/reference/09_유저플로우.md 6장.
 *
 * 373 사용자 피드백: 이 버튼만 예전 회색 테두리라 노트 페이지 디자인과 겉돌고 좌우 여백이 좁았다.
 * 유일한 소비처가 Record 상세(노트 페이지)라 그 화면의 디자인 언어에 맞춘다 — 시안 초록 계열
 * (#4f9b78/#dcecdf/#3f7d5f)·radius 999px. 기능은 그대로다.
 *
 * 415: 장소명 헤딩과 같은 줄 오른쪽에 놓인다(실물 피드백). 그 자리에서는 제목이 폭을 갖고
 * 버튼은 내용만큼만 차지해야 하므로 내용 폭 알약(inline-flex)으로 두고, 제목이 길어 줄이 좁아지면
 * 호출부의 flex-wrap이 이 버튼을 아랫줄로 떨어뜨린다. 배치는 호출부(RecordDetailView)가 정하고,
 * 여기서는 "제목 옆에 서는 작은 알약"이라는 모양만 갖는다.
 */
export function AddToCollectionButton() {
  const addToCollectionState = useAddToCollection();

  return (
    <button
      type="button"
      onClick={addToCollectionState.open}
      className="inline-flex h-9 flex-none items-center gap-1.5 whitespace-nowrap rounded-full border border-[#cfe4d5] bg-[#eef6f0] px-4 text-[13px] font-bold text-[#3f7d5f] transition-colors hover:border-[#a9cfb8] hover:bg-[#dcecdf] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4f9b78]"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z" />
      </svg>
      컬렉션에 담기
    </button>
  );
}
