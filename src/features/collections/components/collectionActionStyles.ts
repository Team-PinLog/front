/**
 * Collection 상세(펼친 책) 화면의 버튼 톤. 근거: Jira S15P11A705-332 시안 —
 * 아이보리 배경 위 "흰 면 + 얇은 라이트 아웃라인 필"로 헤더·하단 네비·레코드 버튼이 모두 같은 톤이다.
 *
 * CollectionDetailView가 아니라 별도 모듈에 두는 이유는 순환 참조 때문이다 —
 * CollectionDetailView가 RecordRemoveButton/RecordSaveButton을 import하므로, 그 버튼들이 다시
 * CollectionDetailView에서 상수를 가져오면 값(value) 레벨 순환이 생긴다(CollectionIndexRail이
 * 가져가는 CollectionRecordItem은 타입이라 컴파일 시 지워지지만, 이 상수는 런타임 값이다).
 *
 * 삭제/제거만 코럴이지만 브랜드 토큰에 코럴이 없어 Tailwind 기본 red 계열을 쓴다(사용자 확정).
 * tailwind.config.js에 색 토큰을 추가하지 않는다는 제약과 맞물린 선택이다.
 */
const ACTION_BASE =
  'rounded-xl bg-snow-white text-sm font-bold shadow-sm transition-colors disabled:opacity-40';

/** 기본 액션(레코드 추가·제목 수정·취소). */
export const COLLECTION_ACTION_CLASS = `h-10 px-4 border border-line-card text-pin-navy hover:border-pin-navy/25 ${ACTION_BASE}`;

/** 파괴적 액션(컬렉션 삭제·레코드 제거). */
export const COLLECTION_DANGER_ACTION_CLASS = `h-10 px-4 border border-red-300 text-red-500 hover:border-red-400 ${ACTION_BASE}`;

/** 강조 액션(저장하기). 민트 아웃라인. */
export const COLLECTION_ACCENT_ACTION_CLASS = `h-10 px-4 border border-log-mint/50 text-log-mint hover:border-log-mint ${ACTION_BASE}`;

/** 스프레드 하단 네비(이전·다음). 시안에서 헤더 버튼보다 한 단계 크다. */
export const COLLECTION_NAV_CLASS = `h-11 px-5 border border-line-card text-pin-navy hover:border-pin-navy/25 ${ACTION_BASE}`;

/** 스프레드 하단 네비의 강조 버튼(목차). */
export const COLLECTION_NAV_ACCENT_CLASS = `h-11 px-5 border border-log-mint/50 text-log-mint hover:border-log-mint ${ACTION_BASE}`;
