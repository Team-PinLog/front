import { Link } from '@tanstack/react-router';
import { usePlaceRecordSheet } from '@/contexts/usePlaceRecordSheet';
import type { RecordMapItem } from '@/features/map/api/getRecordMapMarkers';

/** 하판 목록에 세우는 줄 수. 그 이상은 판 높이를 넘긴다. */
const LISTED_PLACE_COUNT = 3;

/** 기록 번호 표기. 세 자리로 맞춰야 점선 리더 끝이 세로로 정렬된다. */
function folioNo(recordId: number): string {
  return String(recordId).padStart(3, '0');
}

/**
 * 상판 조판. 굵기가 하나뿐인 서체라 위계를 크기·자간·괘선으로 만든다.
 * 근거: 디자인 시안 home-paper-aperture.html.
 */
export function HomeTopType() {
  return (
    <>
      {/* <em>은 민트 하이라이트가 깔리는 자리다(paperAperture.css .pl-display em).
          이 화면에서 브랜드 색이 가장 크게 나는 지점이라 브랜드 이름에 얹는다. */}
      <h1 className="pl-display">
        기억이 머무는 자리
        <br />
        <em>핀로그</em>
      </h1>
    </>
  );
}

/** 창이 열린 뒤 상단에 남는 워드마크. 대형 제목과 교차 페이드된다. */
export function HomeTopmark() {
  return (
    <div className="pl-topmark" aria-hidden="true">
      <b>핀로그</b>
      <span>기억이 머무는 자리</span>
    </div>
  );
}

interface HomeLeftTypeProps {
  /** 지도 마커 목록. 이 화면이 이미 들고 있는 유일한 "내 장소 목록"이다. */
  places: RecordMapItem[];
  onSelectRecord: (recordId: number) => void;
}

/**
 * 좌측 포스트잇 두 장 — 위는 내가 적어 둔 곳 목록, 아래는 장소 추가.
 *
 * 목록은 원래 하판에 있었는데 이 자리로 옮겼다. 세는 것과 더하는 것이 같은 메모지 위에 나란히
 * 붙어 있는 편이 "적어 두고 붙여 둔다"는 이 화면의 문법에 맞는다.
 *
 * ⚠️ 제목이 "최근에 적은 것"이 아니라 "내가 적어 둔 곳"인 이유: **최근순으로 정렬할 수가 없다.**
 * `GET /records/map` 응답에는 createdAt이 없고(getRecordMapMarkers.ts) 최근 기록 목록 엔드포인트도
 * 계약에 없다(docs/api-contract.md). recordId가 생성 순서일 것이라 가정하면 문서에 없는 백엔드
 * 동작을 추측하는 것이라 하지 않는다(AGENTS.md). 정렬 근거가 생기면 제목과 정렬을 함께 바꾼다.
 */
export function HomeLeftType({ places, onSelectRecord }: HomeLeftTypeProps) {
  const sheet = usePlaceRecordSheet();
  const listed = places.slice(0, LISTED_PLACE_COUNT);

  return (
    <>
      <div className="pl-note pl-note-list">
        <NoteParts />
        <div className="pl-note-h">내가 적어 둔 곳</div>
        {listed.length > 0 ? (
          listed.map((place) => (
            <button
              key={place.recordId}
              type="button"
              className="pl-note-row"
              onClick={() => onSelectRecord(place.recordId)}
            >
              <span className="pl-note-name">{place.name}</span>
              <span className="pl-note-dots" aria-hidden="true" />
              <span className="pl-note-no">{folioNo(place.recordId)}</span>
            </button>
          ))
        ) : (
          // 저장된 기록이 없는 것은 오류가 아니라 정상 상태다.
          <p className="pl-note-empty">아직 적어 둔 곳이 없습니다.</p>
        )}
      </div>

      <button type="button" className="pl-note pl-note-add" onClick={sheet.open}>
        <NoteParts />
        <b aria-hidden="true">+</b>
        <span>장소 추가</span>
      </button>
    </>
  );
}

/** 포스트잇 공통 장식 — 마스킹 테이프와 접힌 모서리. 값은 공용 ContextStickyNote와 같다. */
function NoteParts() {
  return (
    <>
      <span className="pl-note-tape" aria-hidden="true" />
      <span className="pl-note-dogear" aria-hidden="true" />
    </>
  );
}

/**
 * 우판: 위에서 내려다본 책 두 권 — 홈에서 다른 화면으로 나가는 진입점.
 *
 * 네비게이션 바를 지운 뒤로 이동 수단은 전부 화면 안에 있다. 평소에는 표지만 겹쳐 놓인 두 권으로
 * 보이고, 마우스를 올리면 두 권이 나란히 서며 이름이 드러난다.
 * (곁열이 사라지는 좁은 폭에서는 지면 어깨의 조판 링크가 대신한다 — HomePage의 PaperCornerNav.)
 *
 * 색은 브랜드 그대로다 — 위는 민트(#3BB7A2), 아래는 네이비(#042142).
 */
export function HomeRightType() {
  return (
    <nav className="pl-pile" aria-label="다른 화면으로 이동">
      {/* DOM 순서가 곧 쌓임 순서다 — 아래 깔리는 책을 먼저 둔다. */}
      <Link to="/library" className="pl-pile-book pl-pile-under">
        <PaperCoverFace title="책장" />
      </Link>
      <Link to="/feed" className="pl-pile-book pl-pile-over">
        <PaperCoverFace title="탐색" />
      </Link>
    </nav>
  );
}

/**
 * 책 표지 조판. 시안 원본 `Book Covers.dc.html`(신국판 456×675, 판형 1a~1f) 중 **1d "도판 위
 * 백문자·금선"**의 구조를 따른다 — `금선 → 가운데 표제 → 금선`, 그리고 판 아래에 자간을 크게
 * 벌린 작은 라벨.
 *
 * 1d를 고른 이유: 나머지 판형은 도판(일러스트)이 조형의 절반을 맡는데 이 두 권은 도판이 없는
 * 단색 표지라, 조판만으로 성립하는 판형이어야 한다. 가장자리 1px 금박 프레임은 1a·1f에서
 * 가져왔다 — 단색 면에는 판면을 잡아 주는 테두리가 필요하다.
 *
 * 시안의 저자명 줄(유하람)은 옮기지 않았다. 이 두 권은 소설이 아니라 화면 이동 버튼이라
 * 대응하는 정보가 없고, 없는 걸 지어내면 표지가 거짓말을 한다.
 *
 * ⚠️ 크기는 시안 비율을 그대로 쓰지 않는다. 시안 라벨은 판 폭의 2.4%(11px/456)인데 우리 표지는
 * 288px이라 그대로 옮기면 7px이 되어 안 읽힌다. 앱의 Collection 표지가 같은 문제를 두고 내린
 * 결론(coverParts.tsx 주석)을 따라 **라벨류는 가독 하한에 두고 시안의 인상은 자간·괘선·여백으로**
 * 가져온다.
 *
 * 표제는 평소 감춰 두고 호버·포커스에서 드러난다(pl-pile-title). 프레임·괘선·라벨은 항상 보인다.
 *
 * 탐색 화면(features/explore)도 같은 표지를 진입점으로 쓴다 — 두 화면이 같은 종이 세계라
 * 표지 조판이 달라지면 "같은 시리즈의 책"이라는 인상이 깨진다. 그래서 복제하지 않고 내보낸다.
 */
export function PaperCoverFace({ title }: { title: string }) {
  return (
    <>
      <span className="pl-cover-frame" aria-hidden="true" />
      <span className="pl-cover-block">
        <span className="pl-cover-rule" aria-hidden="true" />
        <span className="pl-pile-title">{title}</span>
        <span className="pl-cover-rule" aria-hidden="true" />
      </span>
      {/* 표지 한가운데. 조판 덩어리(.pl-cover-block)는 판 상단에 고정돼 있어서 그 안에 두면
          가운데로 못 온다 — 표지 기준으로 따로 앉힌다.
          호버·포커스에서 드러나며 깜빡인다. 링크 이름은 표제(탐색/책장)가 이미 읽어 주므로
          이 줄은 장식이다 — aria-hidden으로 두 번 읽히지 않게 한다. */}
      <span className="pl-cover-go" aria-hidden="true">
        이동하기
      </span>
      <span className="pl-cover-label" aria-hidden="true">
        PINLOG
      </span>
    </>
  );
}
