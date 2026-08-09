import { useCallback, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { PaperFilterDefs } from '@/features/paper/components/PaperFilterDefs';
// ⚠️ 순서가 의미를 가진다. 브랜드 토큰(.pl-stage)과 질감 세 겹(.pl-grain/.pl-emboss/.pl-spot)은
// 종이 화면이 공유하는 것이라 409에서 features/paper로 옮겨 갔고, 홈 전용 규칙만 아래 파일에
// 남았다(paperAperture.css 머리말). 토큰이 먼저 열려야 그 뒤 규칙의 var()가 값을 얻는다.
// 여기서 PaperStage 컴포넌트 자체를 감싸 쓰지 않는 이유: 그쪽은 화면을 꽉 채우는 지면
// 한 장(.paper-sheet)을 깔아 두는데, 홈은 그 자리에 **지도가 비쳐야** 한다. 종이는 창을 만드는
// 네 판(.pl-sheet-*)뿐이라 바닥 한 장을 깔면 창이 막힌다.
import '@/features/paper/paperStage.css';
import '../paperAperture.css';

interface PaperApertureStageProps {
  /** 0~1. 검색어 길이에서 나온다(paperAperture.ts computeOpen). */
  open: number;
  /** 창(구멍)을 통해 보이는 층 — 실제 지도가 여기 들어간다. */
  children: ReactNode;
  /** 상판 조판 */
  top: ReactNode;
  /** 좌측 열. 우측과 마찬가지로 **판 없이 놓이는 요소**다(포스트잇). */
  left: ReactNode;
  /** 우측 열. 종이 판이 아니라 **판 없이 놓이는 요소**다(책 두 권) — 아래 rail 주석 참고. */
  right?: ReactNode;
  /** 하판 조판. 지금은 비어 있다 — 판은 창의 아래 변으로만 남는다. */
  bottom?: ReactNode;
  /** 창이 열린 뒤 상단에 남는 워드마크 */
  topmark: ReactNode;
  /** 검색 도크. 창 한가운데 있다가 열리면 위로 올라간다. */
  dock: ReactNode;
}

type StageStyle = CSSProperties & { '--open'?: string };

/**
 * 종이 네 판이 물러나며 창을 여는 무대. 창 = (좌판~우판) × (상판~하판)의 교집합이다.
 *
 * 지도는 종이 **아래로** 흐르는 층이다(children). 결·접힌 자국·재단면은 전부 종이 쪽에
 * 있으므로 지도를 팬·줌해도 종이가 깨지지 않는다.
 *
 * ⚠️ 시안은 화면 전체(position:fixed)를 썼지만 여기서는 사이드바를 남기기로 해서
 * `<main>` 안에 absolute로 앉는다. 그래서 CSS의 모든 기준이 vw/vh가 아니라 컨테이너 %다
 * (paperAperture.css 머리말 참고).
 *
 * 근거: 디자인 시안 home-paper-aperture.html.
 */
export function PaperApertureStage({
  open,
  children,
  top,
  left,
  right,
  bottom,
  topmark,
  dock,
}: PaperApertureStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);

  const style: StageStyle = { '--open': String(open) };

  // 커서 스포트라이트. 종이 결이 손끝을 따라 밝아진다.
  // setState가 아니라 CSS 변수를 직접 쓴다 — pointermove마다 리렌더하면 지도까지 다시 그린다.
  // rAF로 프레임당 한 번으로 묶는다(시안과 동일).
  const queuedRef = useRef(false);
  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (queuedRef.current) {
      return;
    }
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const { clientX, clientY } = event;
    queuedRef.current = true;
    requestAnimationFrame(() => {
      queuedRef.current = false;
      const rect = stage.getBoundingClientRect();
      // 뷰포트가 아니라 무대 기준으로 잰다 — 사이드바 폭만큼 스포트라이트가 밀리면 안 된다.
      stage.style.setProperty('--mx', (((clientX - rect.left) / rect.width) * 100).toFixed(1));
      stage.style.setProperty('--my', (((clientY - rect.top) / rect.height) * 100).toFixed(1));
    });
  }, []);

  // prefers-reduced-motion일 때는 스포트라이트도 끈다 — 커서를 따라다니는 밝기 변화도 모션이다.
  const reduceMotionRef = useRef(false);
  useEffect(() => {
    reduceMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  return (
    <div
      ref={stageRef}
      className="pl-stage"
      style={style}
      onPointerMove={(event) => {
        if (!reduceMotionRef.current) {
          handlePointerMove(event);
        }
      }}
    >
      <PaperFilterDefs />

      {/* 창 아래로 흐르는 층 */}
      {children}

      <div className="pl-sheet pl-sheet-t">
        <PaperSurface />
        <div className="pl-type-t">{top}</div>
      </div>

      {/* 좌측 열. 우측과 같은 이유로 종이 판(찢긴 재단면 포함)을 걷어냈다 — 이제 창의 좌우가
          모두 종이로 막히지 않고 지도가 이어지며, 그 위에 포스트잇과 책이 놓인다.
          안쪽 래퍼(.pl-rail-inner)를 한 겹 두는 이유: 레일은 창의 개폐(느리게, --pl-sweep)를,
          래퍼는 호버 복귀(빠르게)를 맡는다. 같은 요소에 두면 transform 하나를 두 타이밍이
          나눠 쓸 수 없어 호버가 개폐 속도로 끌려간다. */}
      {left ? (
        <div className="pl-left-rail">
          <div className="pl-rail-inner">{left}</div>
        </div>
      ) : null}

      {/* 우측 열. 예전에는 여기도 종이 판(찢긴 재단면 포함)이었는데, 판을 걷어내고 책이 그
          자리를 차지한다(디자인 피드백). 그래서 창의 오른쪽은 종이로 막히지 않고 지도가 그대로
          이어지며, 책 두 권이 그 위에 놓인 물건으로 읽힌다.
          열릴 때는 옛 우판과 같은 방향·같은 지연으로 함께 빠져나간다(paperAperture.css). */}
      {right ? (
        <div className="pl-right-rail">
          <div className="pl-rail-inner">{right}</div>
        </div>
      ) : null}

      <div className="pl-sheet pl-sheet-b">
        <PaperSurface />
        {bottom ? <div className="pl-type-b">{bottom}</div> : null}
      </div>

      {topmark}
      {dock}
    </div>
  );
}

/** 종이 표면 세 겹(요철·결·스포트라이트). 전부 장식이고 --open과 무관한 정적 층이다. */
function PaperSurface() {
  return (
    <>
      <div className="pl-emboss" aria-hidden="true" />
      <div className="pl-grain" aria-hidden="true" />
      <div className="pl-spot" aria-hidden="true" />
    </>
  );
}
