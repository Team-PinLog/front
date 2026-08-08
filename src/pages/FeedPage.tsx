import { useCallback, useState } from 'react';
import { FeedList } from '@/features/feed/components/FeedList';
import { PaperSpreadStage } from '@/features/paper/components/PaperSpreadStage';
import {
  ExploreCornerNav,
  ExploreHeadType,
  ExploreLeftType,
  ExploreRightType,
} from '@/features/explore/components/ExploreSpreadPanels';

/**
 * 탐색 — "펼쳐 놓은 종이 위의 책장".
 *
 * 홈("종이에 오려낸 창")과 같은 종이 세계의 다른 상태다. 홈이 덮인 종이를 오려 지도를 드러낸다면
 * 이쪽은 그 종이를 펼쳐 놓고 그 위에 선반을 얹는다 — 질감 · 브랜드 색 · 포스트잇 · 표지 조판을
 * 전부 홈과 공유한다(paperSpread.css 머리말). 414가 확정한 값(메모지 348px, 표지 240px,
 * 「이동하기」 밑줄 손짓)도 그대로 상속받는다.
 *
 * ⚠️ 파일 이름이 FeedPage로 남은 것은 라우트(/feed)와 도메인(Feed API, 08_API_명세 10.1)이 그대로이기
 * 때문이다. 사용자에게 보이는 이름은 계속 "탐색"이고, 이 화면의 조형을 맡는 컴포넌트는
 * features/explore에 있다 — 데이터(feed)와 지면(explore)을 나눠 둔 구분이다.
 *
 * 개편 전에는 PageTitle + 페이지 컨테이너(PAGE_CONTAINER_CLASS/PAGE_MIN_HEIGHT_CLASS) 위에 오픈
 * 책장이 놓였다. 이 화면은 지면이 화면을 가장자리까지 채워야 해서 그 여백 상수들을 쓰지 않고,
 * 책장이 쓸 상자는 지면 안에서 실측한다(PaperSpreadStage → FeedList의 area).
 */
export function FeedPage() {
  // 쪽 번호는 FeedList가 소유한 페이지네이션 상태의 **읽기 전용 사본**이다(FeedList 주석).
  // 콜백을 useCallback으로 고정해 두면 FeedList의 보고 effect가 쪽이 바뀔 때만 돈다.
  const [pageNumber, setPageNumber] = useState<number | null>(null);
  const handlePageNumberChange = useCallback((value: number) => setPageNumber(value), []);

  return (
    // 홈과 같은 이유로 PAGE_MIN_HEIGHT_CLASS를 쓰지 않는다 — 이 지면은 여백 없이 화면을
    // 가장자리까지 채운다. 414에서 셸 <main>의 여백이 전부 사라져 content box 높이가 정확히
    // 100dvh라 h-full이면 된다(HomePage와 같은 근거).
    <main className="relative h-full">
      <PaperSpreadStage
        head={<ExploreHeadType />}
        left={<ExploreLeftType pageNumber={pageNumber} />}
        right={<ExploreRightType />}
        corner={<ExploreCornerNav />}
        shelf={(area) => (
          <FeedList
            area={area.live}
            layoutArea={area.settled}
            onPageNumberChange={handlePageNumberChange}
          />
        )}
      />
    </main>
  );
}
