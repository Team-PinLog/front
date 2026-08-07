import { useState } from 'react';
import { readRecentlyOpened } from '../lib/recentlyOpenedCollections';

/**
 * 411: "펼쳐본 책"이 몇 권인지. 종이 지면의 좌측 메모지가 쓴다.
 *
 * ⚠️ **새 저장소를 만들지 않는다.** 382가 넣어 둔 기록(recentlyOpenedCollections.ts)이 그대로
 * 쌓이고 있는데 395 롤백으로 읽는 쪽만 사라져 있었다 — 이 훅이 그 소비자를 되살린다.
 *
 * ⚠️ 그래서 이 값은 **"지금까지 연 책의 누적 총합"이 아니다.** 저장소는 최근 것부터 최대
 * MAX_ENTRIES(6)권까지만 남기고 같은 책을 다시 열면 중복 없이 앞으로 끌어올린다 — 즉 "최근에
 * 펼쳐본 서로 다른 책 몇 권"이고, 6에서 멎는다. 누적 총합을 적으려면 저장 구조 자체가 달라져야
 * 하는데(카운터를 따로 두거나 상한을 없애거나), 그건 이 티켓이 손대지 않기로 한 부분이다.
 * 그래서 메모지 문구도 "펼쳐본 책"이지 "지금까지 본 책 전부"가 아니다 — 세는 것과 적는 것이
 * 어긋나면 메모가 거짓말을 한다.
 *
 * localStorage는 다른 탭이 바꿀 수 있지만 그것까지 따라가지 않는다(storage 이벤트 미구독) —
 * 이 화면에 들어올 때 한 번 읽으면 충분한 성격의 값이고, 책을 열면 화면이 언마운트됐다가 다시
 * 마운트되므로 돌아왔을 때는 자연히 최신값이 된다.
 */
export function useRecentlyOpenedCount(): number {
  // 마운트할 때 한 번만 읽는다(useState의 lazy initializer). effect에서 읽어 setState하는 형태로
  // 두면 커밋 후 리렌더가 한 번 더 돌고(react-hooks/set-state-in-effect), 그 사이 한 프레임 동안
  // 메모지에 잘못된 값이 적힌다 — 저장소 접근은 동기이고 readRecentlyOpened가 실패를 스스로
  // 삼키므로(try/catch) 첫 렌더에서 바로 읽는 편이 정확하다.
  const [count] = useState(() => readRecentlyOpened().length);
  return count;
}
