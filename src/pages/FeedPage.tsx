import { FeedList } from '@/features/feed/components/FeedList';
import {
  PAGE_CONTAINER_CLASS,
  PAGE_TITLE_GAP_CLASS,
  PAGE_VERTICAL_PADDING_CLASS,
} from '@/shared/lib/shelfCabinetLayout';
import { PageTitle } from '@/shared/ui/PageTitle';

// 287-8: min-h는 뷰포트 높이(100dvh)에서 AppLayout 고정 헤더 높이를 뺀 값이다 — 헤더 아래 남는
// 세로 공간 전체를 이 페이지가 쓴다. 캐비닛 래퍼는 flex-1 min-h-0으로 나머지를 전부 채운다 — 정확한
// px 합산 대신 flexbox가 "남는 공간"을 계산하게 한다.
// 295 추가 수정(요구사항 2.2): sm·mdlg(<1280)는 3.5rem(56px, AppLayout pt-14)을 뺀다 — AppLayout의
// 헤더 padding 축소와 반드시 함께 맞춘다. 페이지 상하 padding도 PAGE_VERTICAL_PADDING_CLASS(xl은
// py-6 유지, sm·mdlg는 py-3로 축소)로 바뀌었다.
// 304: xl(≥1280)은 상단 헤더가 좌측 사이드바로 바뀌면서 세로 방향으로 빼야 할 헤더 높이가 없어졌다
// — AppLayout main이 더 이상 xl:pt-20을 쓰지 않고(xl:pl-60으로 가로 오프셋만 준다) 대신
// xl:min-h-[100dvh]로 뷰포트 높이 전체를 그대로 쓴다.
// 287-9: 제목은 PageTitle(shared/ui/PageTitle.tsx)로 고정 height를 준다 — Library의 h1과 폰트
// 크기/line-height가 달라(text-2xl vs text-[27px]) 자연 높이가 미세하게 어긋나면, flex-1인 캐비닛이
// 그 차이만큼 다르게 커져 페이지 전환 시 화면이 "이동"해 보였다.
export function FeedPage() {
  return (
    <main
      className={`${PAGE_CONTAINER_CLASS} flex min-h-[calc(100dvh-3.5rem)] flex-col ${PAGE_TITLE_GAP_CLASS} ${PAGE_VERTICAL_PADDING_CLASS} xl:min-h-[100dvh]`}
    >
      <PageTitle className="text-2xl font-extrabold text-pin-navy">
        새로운 장소를 발견해 보세요
      </PageTitle>
      <div className="min-h-0 flex-1">
        <FeedList />
      </div>
    </main>
  );
}
