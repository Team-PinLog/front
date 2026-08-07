import { Link } from '@tanstack/react-router';
import { useSettingsTrigger } from '@/contexts/useSettingsTrigger';

/**
 * 화면 오른쪽 어깨에 놓이는 조판 링크 — 네비게이션 바를 없애면서 그 자리를 대신한다.
 *
 * 바(bar)가 아니라 **그 화면에 인쇄된 한 줄**로 취급한다. 그래서 배경도 테두리도 없고, 자간을
 * 크게 벌린 작은 글자와 밑줄만 있다(홈·탐색 지면의 라벨 조판과 같은 규격, paperSpread.css의
 * .pe-cornernav에서 규칙을 가져왔다). 어느 화면에 있든 같은 자리·같은 조판이라 "돌아가는 길은
 * 언제나 오른쪽 위"라는 위치 기억이 생긴다.
 *
 * ⚠️ 설정은 링크가 아니라 **버튼**이다. 라우트 이동이 아니라 패널을 여는 동작이라
 * (SettingsTriggerContext), Link로 렌더하면 안 된다. 셸을 지운 지금 이것이 계정 정보·로그아웃·
 * 탈퇴로 가는 유일한 경로이므로 어느 화면에서든 빠뜨리지 않는다 — 그래서 items와 달리
 * 호출부가 끌 수 없게 항상 그린다.
 *
 * 색은 브랜드 4색 안에서만 쓴다. 민트는 종이 위 2.32:1이라 글자색으로 못 쓰므로 밑줄 면으로만
 * 얹고 글자는 네이비로 둔다(paperAperture.css의 대비 실측 주석과 같은 규칙).
 */
export interface PaperCornerNavItem {
  to: string;
  label: string;
}

interface PaperCornerNavProps {
  /** 이 화면에서 갈 수 있는 다른 화면들. 자기 자신은 넣지 않는다(눌러도 아무 일이 없다). */
  items: PaperCornerNavItem[];
  /** 지면 위에 절대 위치로 얹을지, 흐름 안에 둘지. 종이 화면(홈·탐색)은 얹고, 나머지는 흐름이다. */
  className?: string;
}

export function PaperCornerNav({ items, className = '' }: PaperCornerNavProps) {
  const { openSettings } = useSettingsTrigger();

  return (
    <nav aria-label="화면 이동" className={`paper-corner-nav ${className}`}>
      {items.map((item) => (
        <Link key={item.to} to={item.to}>
          {item.label}
        </Link>
      ))}
      <button type="button" onClick={openSettings} aria-haspopup="dialog">
        설정
      </button>
    </nav>
  );
}
