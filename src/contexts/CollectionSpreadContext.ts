import { createContext } from 'react';

/**
 * Collection 상세(플립북)에서 현재 펼쳐 보고 있는 record 인덱스. 근거: Jira S15P11A705-171.
 * 근거: docs/architecture.md 3장 — 서버와 무관한 화면 상태는 Context로 관리한다.
 * spreadIndex는 pages(useCollectionDetailQuery)를 flat하게 순서대로 센 인덱스다 — 로드된 record 범위를
 * 벗어난 다음 이동(fetchNextPage 필요 여부 판단)과 최초 인덱스(0) 하한 처리는 호출부(CollectionDetailView)가
 * 담당한다. 이 Context는 인덱스 값과 이동만 다루는 단순 상태다.
 */
export interface CollectionSpreadState {
  spreadIndex: number;
}

export interface CollectionSpreadValue extends CollectionSpreadState {
  goToNext(): void;
  goToPrevious(): void;
  // 목차에서 임의 record로 바로 점프할 때 쓴다(순차 이동인 goToNext/goToPrevious와 달리 대상 인덱스를
  // 직접 받는다). 상한(flatRecords.length) 검증은 호출부가 유효한 인덱스만 넘기는 방식으로 담당한다.
  goToIndex(index: number): void;
}

export const initialCollectionSpreadState: CollectionSpreadState = {
  spreadIndex: 0,
};

export const CollectionSpreadContext = createContext<CollectionSpreadValue | null>(null);
