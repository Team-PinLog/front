import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { PaperStage } from '@/features/paper/components/PaperStage';
import '../paperSpread.css';

/**
 * 상자 크기가 이만큼 조용해지면 "멎었다"로 본다. 마지막 변화 이후로 재는 시간이라, 창을 계속
 * 끌고 있는 동안에는 계속 뒤로 밀린다 — 손을 놓은 뒤에 한 번만 구성이 다시 정해진다.
 */
const AREA_SETTLE_MS = 200;

/** 선반이 실제로 쓸 수 있는 상자. ResizeObserver가 잰 값이다. */
export interface ShelfArea {
  widthPx: number;
  heightPx: number;
}

/**
 * 같은 상자를 **두 속도로** 내보낸다. 창 크기가 연속으로 변하는 동안(드래그 리사이즈, 기기 회전)
 * 하나로 합쳐 두면 어느 쪽으로 해도 나쁘다.
 *
 * 매 프레임 다 반영하면 열·행 수(pageSize)가 따라 흔들리고, pageSize가 바뀔 때마다 Feed 목록을
 * 새로 요청한다. 반대로 멎을 때까지 전부 붙잡으면 지면은 이미 넓어졌는데 책만 작은 크기로 남아
 * 있다가 뒤늦게 툭 커진다.
 *
 * 그래서 성격으로 나눈다. **크기는 연속**이므로 live를 따라 지면과 함께 자라고, **구성(몇 칸,
 * 몇 줄)은 이산**이므로 settled에서만 다시 정한다.
 */
export interface ShelfAreaFeed {
  /** 지금 이 프레임의 상자. 카드 크기(scale)가 이걸 따른다. */
  live: ShelfArea | null;
  /** 변화가 멎은 뒤의 상자. 열·행 수와 pageSize가 이걸 따른다. */
  settled: ShelfArea | null;
}

interface PaperSpreadStageProps {
  /** 상단 조판(라벨 · 대형 제목 · 괘선). */
  head: ReactNode;
  /** 좌측 곁열 — 메모지. */
  left?: ReactNode;
  /** 우측 곁열 — 표지 두 권(화면 이동 진입점). 곁열이 사라지는 좁은 폭에서는 감춰진다. */
  right?: ReactNode;
  /**
   * 지면 오른쪽 어깨의 조판 링크 — 설정 진입점이자, 곁열이 사라진 폭에서는 표지 두 권을 대신하는
   * 화면 이동 수단이다(shared/ui/PaperCornerNav).
   */
  corner?: ReactNode;
  /**
   * 선반. 실측한 상자를 받아 그 안에서 배치와 카드 크기를 역산한다(ShelfAreaFeed 주석).
   * 첫 렌더에는 아직 측정 전이라 둘 다 null이다 — 호출부가 그 프레임을 어떻게 그릴지 정한다.
   */
  shelf: (area: ShelfAreaFeed) => ReactNode;
}

/**
 * 탐색 "펼쳐 놓은 종이 위의 책장".
 *
 * 홈(PaperApertureStage)이 종이 네 판을 물려 창을 여는 무대라면, 이쪽은 펼쳐 놓은 지면 한 장이
 * 무대 전체다. 여닫는 축(--open)이 없으므로 판·도크·워드마크도 없고, 대신 지면 위에 조판 ·
 * 곁열 · 선반이 자리를 나눠 갖는다. 근거·값은 paperSpread.css 머리말 참고.
 *
 * ⚠️ 루트에 `.pl-stage`를 함께 붙이는 것이 핵심이다 — 브랜드 토큰과 종이 질감 레이어를 홈과
 * 한 곳에서 공유하려는 것이고, 그래서 `--open`은 홈의 기본값 0으로 남는다(이 화면에는 여닫을
 * 창이 없다).
 */
export function PaperSpreadStage({ head, left, right, corner, shelf }: PaperSpreadStageProps) {
  const shelfRef = useRef<HTMLDivElement>(null);
  const [liveArea, setLiveArea] = useState<ShelfArea | null>(null);
  const [settledArea, setSettledArea] = useState<ShelfArea | null>(null);

  // 선반 상자 실측. 뷰포트에서 역산하는 기존 계산(getPageContentBudgetPx)은 이 화면에서는 값이
  // 맞지 않는다 — 지면이 조판·곁열에 내주는 몫이 CSS의 clamp()에서 나와 JS가 알 수 없기 때문이다.
  // 상자를 직접 재면 그 항들이 한 번에 들어온다.
  //
  // 첫 측정은 **페인트 전에** 끝낸다. ResizeObserver는 첫 콜백도 커밋 뒤에 오는데, 그 한 프레임
  // 동안 선반은 상자를 모른 채 뷰포트 기반 폴백으로 배치를 정하고 그 pageSize로 목록을 이미
  // 요청해 버린다(실측: size=10을 받고 곧바로 size=8을 다시 받았다). useLayoutEffect에서 직접
  // 재면 그 프레임이 없어져 요청이 한 번으로 준다.
  useLayoutEffect(() => {
    const element = shelfRef.current;
    if (!element) {
      return;
    }
    const rect = element.getBoundingClientRect();
    const first: ShelfArea = {
      widthPx: Math.floor(rect.width),
      heightPx: Math.floor(rect.height),
    };
    setLiveArea(first);
    setSettledArea(first);
  }, []);

  // 두 속도로 내보내는 이유는 ShelfAreaFeed 주석에 있다 — live는 매 변화마다, settled는 멎은
  // 뒤에 한 번만.
  const settleTimerRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const element = shelfRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const box = entry.contentBoxSize?.[0];
      const next: ShelfArea = {
        widthPx: Math.floor(box?.inlineSize ?? entry.contentRect.width),
        heightPx: Math.floor(box?.blockSize ?? entry.contentRect.height),
      };
      setLiveArea(next);
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = window.setTimeout(() => setSettledArea(next), AREA_SETTLE_MS);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      window.clearTimeout(settleTimerRef.current);
    };
  }, []);

  return (
    <PaperStage className="pe-stage">
      <header className="pe-head">{head}</header>

      {corner}

      {left ? <div className="pe-rail-l">{left}</div> : null}

      {/* 첫 측정 전(위 useLayoutEffect가 돌기 전 단 한 번의 렌더)에는 선반을 그리지 않는다 —
          상자를 모르는 채 그리면 폴백 배치로 목록을 한 번 더 요청한다. 페인트 전에 끝나므로
          빈 프레임이 화면에 보이지 않는다. */}
      <div ref={shelfRef} className="pe-shelf">
        {liveArea ? shelf({ live: liveArea, settled: settledArea }) : null}
      </div>

      {right ? <div className="pe-rail-r">{right}</div> : null}
    </PaperStage>
  );
}
