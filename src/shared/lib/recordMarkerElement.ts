import { RECORD_MARKER_TIP_Y_RATIO } from './getRecordMarkerAsset';

/**
 * 417 — 지도 핀(색 마커 SVG + 카카오 CustomOverlay)을 만드는 **한 곳**.
 *
 * 왜 여기인가. 핀을 그리는 화면은 홈 지도(features/map/RecordMapView)와 컬렉션 상세 지도
 * (features/collections/CollectionSpreadMap) 둘인데, 지금까지 각자 거의 같은 <img>를 따로 만들고
 * 있었다(CollectionSpreadMap의 주석이 "그 함수는 features/map 내부 전용이라 여기서 다시 만든다"고
 * 적어 둔 그 자리다). 그래서 Tailwind preflight 회피(max-width:none) 같은 함정이 한쪽에서만
 * 고쳐졌다가 다른 쪽에서 다시 재현된 이력이 있다. 호버 효과를 또 두 벌 만들지 않으려면 핀 DOM을
 * 만드는 책임 자체를 공유 지점으로 올려야 한다 — 두 화면 어느 쪽도 상위가 아니므로 shared/lib다.
 *
 * 효과의 **값**은 이 파일이 아니라 src/index.css의 `.record-map-pin` 규칙에 있다. 호버·포커스는
 * 상태를 JS로 추적할 이유가 없는 순수 CSS 사건이고, prefers-reduced-motion 분기도 미디어 쿼리
 * 하나로 끝나기 때문이다. 이 파일은 그 규칙이 읽는 **커스텀 프로퍼티**만 세운다.
 *
 * 커스텀 프로퍼티로 주고받는 이유가 핵심이다 — 인라인 style.transform / style.filter를 직접 쓰면
 * CSS 클래스의 호버 규칙을 항상 이겨서(인라인이 명시도 최상위) 선택 강조가 걸린 핀에는 호버가
 * 아예 먹지 않는다. 화면은 "지금 이 핀의 기본 상태"만 변수로 알려주고, 호버 시 어떻게 합성할지는
 * CSS가 정한다.
 */

/** src/index.css의 핀 규칙이 붙는 클래스. 문자열을 두 화면에서 각자 적지 않도록 여기서 내보낸다. */
export const RECORD_MAP_PIN_CLASS = 'record-map-pin';

/** 핀의 기본 배율(1 = 원래 크기). 선택·강조가 이 값을 올리면 호버는 그 위에 곱해진다. */
const PIN_BASE_SCALE_VAR = '--pin-base-scale';
/** 핀에 상시 걸려 있는 filter(지도 톤 역보정·dim 등). 호버 그림자는 이 뒤에 이어 붙는다. */
const PIN_FILTER_VAR = '--pin-filter';
/**
 * 걸 filter가 없을 때 쓰는 항등 함수. `none`을 쓰면 안 된다 — 호버 규칙이 이 값 뒤에 그림자를
 * 이어 붙이는데 `none drop-shadow(...)`는 문법에 맞지 않아 선언 전체가 버려지고, 상시 필터가 없는
 * 핀만 호버 그림자가 조용히 사라진다(실렌더 확인에서 잡힌 실제 증상).
 */
const PIN_FILTER_NONE = 'brightness(1)';
/** 핀의 기본 불투명도. 호버하면 CSS가 1로 올린다. */
const PIN_OPACITY_VAR = '--pin-opacity';
/** 확대 기준점의 세로 위치. 핀의 뾰족한 끝이어야 커질 때 좌표가 튀지 않는다. */
const PIN_TIP_Y_VAR = '--pin-tip-y';

export interface RecordMarkerImageOptions {
  /** getRecordMarkerAsset이 고른 SVG asset URL. */
  assetUrl: string;
  /** 마커가 가리키는 장소 이름. title(툴팁)과 접근성 이름으로 함께 쓴다. */
  title: string;
  /** 화면에 그릴 크기(px). 화면마다 다르다 — 홈은 원본의 1/2, 컬렉션 지도는 비활성 핀을 더 작게 그린다. */
  widthPx: number;
  heightPx: number;
  /**
   * 핀을 눌렀을 때 할 일. 넘기지 않으면 표시 전용 핀이 되어 커서·포커스·호버 반응이 모두 빠진다
   * (누를 수 없는 것에 누를 수 있다는 신호를 주지 않는다).
   */
  onSelect?: () => void;
}

/**
 * CustomOverlay content로 올릴 핀 <img>를 만든다.
 *
 * 인라인 <svg>가 아니라 <img src>인 이유 — asset 20개가 전부 같은 `<filter id="shadow">`를 쓰기
 * 때문에, 인라인으로 심으면 문서 전체에서 id가 충돌해 모든 핀이 첫 번째 필터 하나를 공유한다.
 * <img>는 각 SVG가 독립 문서로 렌더돼 그 문제가 없고, 그림자도 asset 안에 이미 들어 있다.
 */
export function createRecordMarkerImage({
  assetUrl,
  title,
  widthPx,
  heightPx,
  onSelect,
}: RecordMarkerImageOptions): HTMLImageElement {
  const image = document.createElement('img');
  image.src = assetUrl;
  image.className = RECORD_MAP_PIN_CLASS;
  // 이름은 title(과 클릭 가능한 경우 aria-label)로 노출되므로 alt는 비워 중복을 피한다.
  image.alt = '';
  image.title = title;
  image.width = widthPx;
  image.height = heightPx;
  image.draggable = false;
  image.style.display = 'block';
  // ⚠️ width/height 속성만으로는 그려지지 않는다. Tailwind preflight의 `img { max-width: 100%;
  // height: auto }`가 살아 있는데 CustomOverlay가 content를 감싸는 래퍼 div는 폭이 0이라
  // max-width:100%가 0으로 계산돼 핀이 0x0으로 찌그러진다(실측: naturalWidth 64인데 렌더 폭 0).
  // max-width를 풀고 크기를 인라인으로 못박아야 한다. 근거: Jira S15P11A705-307.
  image.style.maxWidth = 'none';
  image.style.width = `${widthPx}px`;
  image.style.height = `${heightPx}px`;
  // 확대 기준점. asset 아래 여백은 내장 그림자 자리라 바닥(100%)이 아니라 핀 끝 비율이어야 한다 —
  // 바닥을 기준으로 키우면 커진 만큼 핀 끝이 실제 좌표에서 아래로 밀린다.
  image.style.setProperty(PIN_TIP_Y_VAR, `${RECORD_MARKER_TIP_Y_RATIO * 100}%`);

  if (onSelect) {
    // CustomOverlay content는 React 트리 밖의 DOM이라 이벤트를 직접 붙인다.
    image.addEventListener('click', onSelect);
    // 핀은 이 지도에서 기록으로 들어가는 유일한 입구다. 마우스로만 닿을 수 있으면 키보드 사용자는
    // 지도에서 아무 데도 갈 수 없어서, 버튼 의미를 주고 탭 순서에 넣는다. 포커스 링은 index.css의
    // 전역 :focus-visible 규칙이 그려 준다.
    image.setAttribute('role', 'button');
    image.setAttribute('aria-label', title);
    image.tabIndex = 0;
    image.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      // Space는 기본 동작이 페이지 스크롤이다. 지도 위에서 그게 일어나면 핀이 화면 밖으로 나간다.
      event.preventDefault();
      onSelect();
    });
  } else {
    // 표시 전용 핀은 호버·포커스 규칙에서 빠진다(index.css가 [data-pin-static]을 제외 조건으로 본다).
    image.dataset.pinStatic = 'true';
  }

  return image;
}

export interface RecordMarkerPinState {
  /** 기본 배율. 선택·강조된 핀만 1보다 크다. 생략하면 1. */
  baseScale?: number;
  /** 상시 filter 문자열. 빈 문자열이면 아무것도 걸지 않는다. */
  filter?: string;
  /** 기본 불투명도(0~1). 생략하면 1. */
  opacity?: number;
}

/**
 * 핀의 기본 상태를 커스텀 프로퍼티로 반영한다. **엘리먼트를 다시 만들지 않는 것이 핵심이다** —
 * CustomOverlay를 새로 만들면 <img>가 다시 로드돼 강조를 옮길 때마다 지도 전체 핀이 깜빡인다
 * (근거: Jira S15P11A705-371).
 *
 * transform·transition을 여기서 직접 쓰지 않는다. 인라인 transform은 CSS의 호버 규칙을 이겨 버려서
 * 선택된 핀에 호버가 먹지 않게 되고, 인라인 transition은 prefers-reduced-motion 분기까지 덮는다.
 */
export function applyRecordMarkerPinState(
  image: HTMLImageElement,
  { baseScale = 1, filter = '', opacity = 1 }: RecordMarkerPinState,
): void {
  image.style.setProperty(PIN_BASE_SCALE_VAR, `${baseScale}`);
  image.style.setProperty(PIN_FILTER_VAR, filter || PIN_FILTER_NONE);
  image.style.setProperty(PIN_OPACITY_VAR, `${opacity}`);
}
