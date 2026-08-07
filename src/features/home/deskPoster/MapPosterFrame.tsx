import type { ReactNode } from 'react';
import { PinTack, PIN_TACK_SHADOW } from '@/shared/ui/PinSymbols';
import {
  getPaperGrainImage,
  HOME_DESK_POSTER_ENABLED,
  POSTER_FRAME_PX,
  POSTER_PAPER_GRAIN_ALPHA,
  POSTER_ROTATE_DEG,
  POSTER_ROTATE_KAKAO_ENABLED,
  POSTER_SHADOW,
  POSTER_TACK,
  GRAIN_TILE_PX,
} from './deskPoster';

interface MapPosterFrameProps {
  children: ReactNode;
  /**
   * 안에 들어가는 것이 카카오 지도인지. 지도면 기울기를 적용하지 않는다(deskPoster.ts의
   * POSTER_ROTATE_KAKAO_ENABLED 주석 — SDK가 축정렬 사각형으로 마우스 좌표를 환산한다).
   */
  variant: 'kakao' | 'svg';
}

/** 네 모서리에 박힌 압정. 종이 위로 올라와야 하므로 프레임보다 위층이다. */
function PosterCornerTacks() {
  const positions = [
    { top: POSTER_TACK.insetPx, left: POSTER_TACK.insetPx },
    { top: POSTER_TACK.insetPx, right: POSTER_TACK.insetPx },
    { bottom: POSTER_TACK.insetPx, left: POSTER_TACK.insetPx },
    { bottom: POSTER_TACK.insetPx, right: POSTER_TACK.insetPx },
  ];
  return (
    <>
      {positions.map((position, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="pointer-events-none absolute z-20 text-log-mint"
          style={{ ...position, filter: PIN_TACK_SHADOW }}
        >
          <PinTack height={POSTER_TACK.heightPx} />
        </span>
      ))}
    </>
  );
}

/**
 * 지도를 **책상에 붙인 종이 포스터**로 감싸는 프레임. 근거: Jira S15P11A705-384.
 *
 * 지도가 배경으로 그라데이션 페이드되며 사라지던 방식을 대체한다 — 포스터는 가장자리가 분명해서
 * 페이드가 필요 없고, 지도와 옆 메모(최근 카드)의 겹침도 종이 폭 자체로 해결된다.
 *
 * ⚠️ **기존 지도 컴포넌트를 뜯지 않는다.** children을 그대로 받아 종이 안에 넣기만 한다. 그래서
 * 이 파일을 지우고 HomePage에서 래퍼 한 줄만 빼면 원래 화면으로 돌아간다(롤백 조건).
 *
 * 스위치가 꺼져 있으면 아무것도 감싸지 않고 children을 그대로 돌려준다 — 껍데기 div조차 남기지
 * 않아야 이전 레이아웃이 정확히 재현된다.
 */
export function MapPosterFrame({ children, variant }: MapPosterFrameProps) {
  if (!HOME_DESK_POSTER_ENABLED) {
    return <>{children}</>;
  }

  const rotate = variant === 'svg' || POSTER_ROTATE_KAKAO_ENABLED ? POSTER_ROTATE_DEG : 0;

  return (
    // 바깥 여백이 곧 "책상 위에 놓인 자리"다.
    // ⚠️ 이 클래스는 deskPoster.ts의 POSTER_DESK_MARGIN_PX(12/20/28)와 **쌍둥이 값**이다 —
    // Tailwind는 원시 텍스트를 스캔하므로 상수를 클래스 문자열에 주입할 수 없어 두 곳에 같은 값이
    // 있다. 여백을 바꿀 때는 둘을 함께 고친다(이 저장소 전반의 관례다).
    <div className="h-full w-full p-3 md:p-5 xl:p-7">
      <div
        className="relative h-full w-full rounded-[3px] bg-white"
        style={{
          transform: rotate ? `rotate(${rotate}deg)` : undefined,
          boxShadow: POSTER_SHADOW,
          paddingLeft: POSTER_FRAME_PX.x,
          paddingRight: POSTER_FRAME_PX.x,
          paddingTop: POSTER_FRAME_PX.top,
          paddingBottom: POSTER_FRAME_PX.bottom,
        }}
      >
        {/* 종이 결. 흰 여백 위에만 얹히면 되므로 지도 영역까지 덮지 않도록 프레임 아래층에 둔다. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[3px]"
          style={{
            backgroundImage: getPaperGrainImage(),
            backgroundRepeat: 'repeat',
            backgroundSize: `${GRAIN_TILE_PX}px ${GRAIN_TILE_PX}px`,
            opacity: POSTER_PAPER_GRAIN_ALPHA,
            mixBlendMode: 'multiply',
          }}
        />

        <PosterCornerTacks />

        {/* 지도가 들어가는 창. overflow-hidden이라 타일·SVG가 종이 밖으로 새지 않는다.
            ⚠️ 여기에 transform·filter를 걸지 않는다 — 카카오 SDK가 만드는 고정 위치 레이어의
            기준이 바뀌고 마우스 좌표 환산이 어긋난다(374에서 컨테이너 filter를 지도 안쪽에만
            건 것과 같은 이유). */}
        <div className="relative h-full w-full overflow-hidden rounded-[2px]">{children}</div>
      </div>
    </div>
  );
}
