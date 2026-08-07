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
/**
 * 356: 펼친 책 화면의 공통 포커스 표시. 브라우저 기본 파란 사각형이 책 디자인과 겉돌아 브랜드
 * 아웃라인으로 교체하되, **표시를 없애지는 않는다**(그건 키보드 사용자가 위치를 잃는 접근성 후퇴다).
 *  - `outline-none`을 쓰지 않는다. 우리 outline을 지정하면 기본 사각형은 자연히 대체되고, 강제 색상
 *    모드(Windows 고대비)에서도 box-shadow 기반 ring과 달리 표시가 살아남는다.
 *  - 마우스 클릭에는 뜨지 않아야 하므로 `:focus`가 아니라 `:focus-visible`이다.
 *  - offset이 음수(요소 안쪽)인 이유: 이 화면의 포커스 대상 상당수가 `overflow-*-auto` 안에 있어
 *    바깥으로 내민 아웃라인이 잘린다. 안쪽에 그리면 어디서도 잘리지 않는다.
 * 포커스 색은 상태색(위험=빨강 등)을 따라가지 않고 브랜드 민트 하나로 통일한다 — 포커스 표시는
 * "지금 여기"를 알리는 신호라 화면 전체에서 같은 모양이어야 학습된다.
 */
export const COLLECTION_FOCUS_RING_CLASS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-log-mint';

const ACTION_BASE = `rounded-xl bg-snow-white text-sm font-bold shadow-sm transition-colors disabled:opacity-40 ${COLLECTION_FOCUS_RING_CLASS}`;

/** 기본 액션(레코드 추가·제목 수정·취소). */
export const COLLECTION_ACTION_CLASS = `h-10 px-4 border border-line-card text-pin-navy hover:border-pin-navy/25 ${ACTION_BASE}`;

/** 파괴적 액션(컬렉션 삭제·레코드 제거). */
export const COLLECTION_DANGER_ACTION_CLASS = `h-10 px-4 border border-red-300 text-red-500 hover:border-red-400 ${ACTION_BASE}`;

/** 강조 액션(저장하기). 민트 아웃라인. */
export const COLLECTION_ACCENT_ACTION_CLASS = `h-10 px-4 border border-log-mint/50 text-log-mint hover:border-log-mint ${ACTION_BASE}`;

// 332 디자인 피드백으로 하단 네비(이전/다음/목차) 자체가 사라져 그 전용 클래스도 함께 지웠다 —
// 페이지 이동은 이제 좌·우 페이지 클릭과 방향키가 전담한다(CollectionDetailView).
