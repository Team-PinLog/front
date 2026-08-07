import type { CSSProperties } from 'react';

/**
 * Context 포스트잇을 "손으로 붙인" 것처럼 흩어 놓는 오프셋 표.
 *
 * 373(핀 상세 노트 페이지) 사용자 피드백에서 나온 규칙이고, 378에서 컬렉션 펼침 화면도 같은
 * 문법을 쓰게 되면서 두 화면이 공유한다 — 한쪽만 고치면 "같은 포스트잇"이라는 인상이 깨진다.
 * (Context는 Record 소유라 ContextStickyNoteCard와 같은 자리에 둔다. collections가 records의
 * 컴포넌트를 참조하는 기존 방향과 같다.)
 *
 * 목록 순서(index)로 순환해 고르므로 리렌더돼도 배치가 흔들리지 않는다. 세로 오프셋이 열마다
 * 어긋나며 masonry 같은 리듬이 생기고, 회전은 포스트잇 자체 회전(contextId 해시) 위에 한 겹 더
 * 얹혀 각도 편차를 넓힌다.
 *
 * ⚠️ 값을 키우면 호버 들림·마스킹 테이프와 함께 스크롤 컨테이너 밖으로 나가 잘린다. 호출부는
 * 최소 pt-6/px-3/pb-4 수준의 여백을 확보해야 한다.
 */
const CONTEXT_NOTE_SCATTER = [
  { top: 0, left: 0, rotate: '0deg' },
  { top: 22, left: 6, rotate: '-0.9deg' },
  { top: 8, left: -4, rotate: '0.7deg' },
  { top: 30, left: 9, rotate: '-0.5deg' },
  { top: 14, left: 2, rotate: '1deg' },
] as const;

/** 포스트잇끼리 세로로 겹치지 않게 하는 최소 간격(px). 겹치면 아래 장의 테이프·글자가 묻힌다. */
export const CONTEXT_NOTE_SCATTER_BOTTOM_GAP = 20;

/** index번째 포스트잇에 적용할 손붙임 오프셋. 래퍼 div에 그대로 넘긴다. */
export function contextNoteScatterStyle(index: number): CSSProperties {
  const scatter = CONTEXT_NOTE_SCATTER[index % CONTEXT_NOTE_SCATTER.length];
  return {
    marginTop: scatter.top,
    marginLeft: scatter.left,
    marginBottom: CONTEXT_NOTE_SCATTER_BOTTOM_GAP,
    transform: `rotate(${scatter.rotate})`,
  };
}
