import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { PaperFilterDefs } from '@/features/home/components/PaperFilterDefs';
import '@/features/home/paperAperture.css';
import '../paperStage.css';

interface PaperStageProps {
  /** 무대 루트에 덧붙일 클래스. 화면별 좌표계(--pe-*, --lb-* 같은 것)를 여기서 연다. */
  className?: string;
  children: ReactNode;
}

/**
 * 종이 화면의 무대 — 지면 한 장과 그 위에 놓이는 것들의 좌표계.
 *
 * 홈·탐색·책장이 공유한다. 각 화면은 이 위에 자기 조판·곁열·선반을 얹기만 하고, **종이 자체는
 * 만들지 않는다** — 질감·눈금·접힌 자국이 화면마다 달라지면 한 제품으로 읽히지 않는다.
 *
 * ⚠️ 루트에 `.pl-stage`를 함께 붙이는 것이 핵심이다. 브랜드 토큰(--pl-paper/--pl-navy/…)과
 * 질감 레이어(.pl-grain/.pl-emboss/.pl-spot)가 그 클래스에 묶여 있고, `overflow:hidden`과
 * 컨테이너 선언(container-name: pl-stage)도 거기서 온다. `--open`은 홈의 기본값 0으로 남으므로
 * 홈 쪽 개폐 transform은 전부 항등식이 되어 아무 일도 하지 않는다.
 *
 * ⚠️ PaperFilterDefs는 문서에 **한 번만** 마운트돼야 하는 id 참조 묶음이다. 라우트가 화면을
 * 하나씩만 마운트하므로 이 컴포넌트가 들고 있어도 충돌하지 않는다 — 한 화면에 무대를 둘 이상
 * 세우면 그때 깨진다.
 */
export function PaperStage({ className = '', children }: PaperStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);

  // 커서 스포트라이트(.pl-spot). setState가 아니라 CSS 변수를 직접 쓰고 rAF로 프레임당 한 번으로
  // 묶는다 — pointermove마다 리렌더하면 무대 위 내용(지도·선반)이 통째로 다시 그려진다.
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
      // 뷰포트가 아니라 무대 기준으로 잰다 — 무대가 화면 전체가 아닐 때 빛이 밀리면 안 된다.
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
      className={`pl-stage ${className}`}
      onPointerMove={(event) => {
        if (!reduceMotionRef.current) {
          handlePointerMove(event);
        }
      }}
    >
      <PaperFilterDefs />

      {/* 지면. 질감 세 겹은 홈의 종이 판이 쓰는 것과 같은 레이어다. */}
      <div className="paper-sheet">
        <div className="pl-emboss" aria-hidden="true" />
        <div className="pl-grain" aria-hidden="true" />
        <div className="pl-spot" aria-hidden="true" />
      </div>

      {children}
    </div>
  );
}
