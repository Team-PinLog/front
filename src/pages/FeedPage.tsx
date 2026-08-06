import { FeedList } from '@/features/feed/components/FeedList';
import {
  PAGE_CONTAINER_CLASS,
  PAGE_MIN_HEIGHT_CLASS,
  PAGE_TITLE_GAP_CLASS,
  PAGE_VERTICAL_PADDING_CLASS,
} from '@/shared/lib/shelfCabinetLayout';
import { PageTitle } from '@/shared/ui/PageTitle';

// 287-8: min-h는 뷰포트 높이(100dvh)에서 AppLayout 고정 헤더 높이를 뺀 값이다 — 헤더 아래 남는
// 세로 공간 전체를 이 페이지가 쓴다. 캐비닛 래퍼는 flex-1 min-h-0으로 나머지를 전부 채운다 — 정확한
// px 합산 대신 flexbox가 "남는 공간"을 계산하게 한다.
// 330: min-h 리터럴은 PAGE_MIN_HEIGHT_CLASS 하나로 모았다(같은 값이 세 페이지에 복제돼 있었다).
// sm은 하단 탭바(3.5rem + safe-area)만큼 뷰포트에서 덜고, md 이상은 사이드바가 세로를 먹지 않아
// 뷰포트 높이를 그대로 쓴다 — AppLayout <main>의 pb/pl과 반드시 함께 맞춘다.
// 287-9: 제목은 PageTitle(shared/ui/PageTitle.tsx)로 고정 height를 준다 — Library의 h1과 폰트
// 크기/line-height가 달라(text-2xl vs text-[27px]) 자연 높이가 미세하게 어긋나면, flex-1인 캐비닛이
// 그 차이만큼 다르게 커져 페이지 전환 시 화면이 "이동"해 보였다.
export function FeedPage() {
  return (
    <main
      className={`${PAGE_CONTAINER_CLASS} ${PAGE_MIN_HEIGHT_CLASS} flex flex-col ${PAGE_TITLE_GAP_CLASS} ${PAGE_VERTICAL_PADDING_CLASS}`}
    >
      <PageTitle
        className="text-2xl font-extrabold text-pin-navy"
        description="익명의 사용자가 만든 다양한 컬렉션을 구경해 보세요."
      >
        새로운 장소를 발견해 보세요
      </PageTitle>
      {/* 328: items-center를 더했다. 이 래퍼는 flex-1이라 타이틀 아래 남는 세로를 전부 차지하는데,
          그 안의 책장은 그 높이를 다 쓰지 못하는 경우가 많다 — Feed 카드 크기는 세로 예산과 가로
          가용폭 중 빡빡한 쪽에 맞춰지고(solveFeedScale), 넓은 화면에서는 거의 항상 가로가 이긴다
          (xl 1920×1080 기준 세로 예산 904px 중 실제 사용 562px). 기본 정렬(stretch → 내용은 위에
          붙는다)이면 그 차이 342px이 통째로 책장 아래 빈 여백이 돼, 캐비닛이 예산을 꽉 채우는
          나의 책장과 비교했을 때 "탐색만 아래가 휑하다"로 보였다. 남는 세로를 위아래로 나눠 가지면
          두 페이지 모두 책장이 화면 중앙에 온다(LibraryPage에도 같은 정렬을 뒀다).
          정렬을 items-center가 아니라 자식의 auto 마진(FeedList 루트의 m-auto)으로 주는 이유:
          예산 하한(SHELF_SCROLL_MIN_H_PX)에 걸리는 아주 낮은 뷰포트에서는 책장이 이 래퍼보다 커질
          수 있는데, items-center는 그때 넘치는 만큼을 위로도 밀어내 책장 윗부분이 타이틀 뒤로
          잘린다. auto 마진은 공간이 남을 때만 나눠 갖고 모자라면 0이 돼 위로 밀지 않는다. */}
      <div className="flex min-h-0 flex-1 flex-col">
        <FeedList />
      </div>
    </main>
  );
}
