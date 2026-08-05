import { getCollectionAccentColor } from '@/shared/lib/getCollectionAccentColor';
import { CollectionCover } from './covers/CollectionCover';
import type { FeedCollectionItem } from '../api/getFeedCollections';

/**
 * 315: Feed 카드 한 장. 314까지는 `표지(단색 div) + 정보 패널(고정 px)` 2단이라 책이 아니라 썸네일
 * 카드로 보였는데, 정보를 표지 안으로 옮겨 카드 자체가 표지 한 장이 되게 했다(FeedList.tsx에서
 * 분리 — 페이지네이션·이벤트 큐잉은 그대로 FeedList가 갖는다).
 *
 * 316: 표지 안의 조판은 이제 이 파일에 없다 — 판형 5종(covers/)이 가져갔고, 여기 남은 것은 **책의
 * 껍데기**뿐이다: 클릭 가능한 버튼, 카드 치수, 표지 안 글자 크기의 기준(fontSize), 축약 여부 판정,
 * 책등·그림자. 어떤 판형이 나올지는 디스패처(CollectionCover)가 collectionId로 정한다.
 *
 * ⚠️ 표지에 소유자 정보를 넣지 않는다 — Feed 응답에 소유자 식별자가 아예 없고(08_API_명세 §10.1),
 * 공개 화면 노출도 금지다(docs/privacy-rules.md). 표지가 그릴 수 있는 슬롯은
 * collectionCoverVariant.ts의 CollectionCoverSlots가 전부다.
 */

// 표지 안 글자 크기는 카드 폭에 비례한다 — Tailwind v3 + 컨테이너 쿼리 플러그인 미설치(plugins: [])라
// 고정 px은 작은 카드에서 넘치고, 노드마다 인라인 style을 주면 유지가 어렵다. 그래서 **표지 루트에
// fontSize 하나만 인라인으로 주고 내부는 전부 em 임의값**으로 쓴다.
// ⚠️ em 중첩 금지 — font-size를 지정한 요소 안에서 다시 em font-size를 쓰면 배율이 곱해진다.
// 316: 이 규칙을 판형 5종에 걸쳐 지키기 위해, text-[…em]은 판형이 아니라 공통 파츠(coverParts.tsx)만
// 갖는다. 판형은 위치·크기 클래스만 얹는다.
// 계수 0.08은 시안(카드 폭 약 240px에 제목 19~20px)에서 역산한 값이다.
const COVER_FONT_RATIO = 0.08;
// 소수 폰트 크기를 반올림하지 않는다 — 반올림하면 창 크기를 연속으로 바꿀 때 카드는 매끄럽게
// 커지는데 글자만 1px씩 계단식으로 튄다. 상/하한만 둔다(하한: 아주 좁은 뷰포트에서 글자가 사실상
// 사라지는 것 방지, 상한: 큰 화면에서 제목이 과하게 커지는 것 방지).
const COVER_FONT_MIN_PX = 9;
const COVER_FONT_MAX_PX = 22;

// 이 폭 미만이면 축약 모드 — 카테고리·부제·날짜를 생략하고 제목 + 저장된 장소 수만 남긴다. 폭
// 150px이면 카테고리 글자가 약 5.5px(0.46em × 12px)이라 읽히지 않는데, 안 읽히는 글자를 넣느니
// 제목에 자리를 더 주는 편이 낫다. 행 수 결정의 하한(FEED_ROWS_MIN_CARD_WIDTH_PX = 112)과는 다른
// 값이다 — 그쪽은 "배치를 포기하는 선", 이쪽은 "정보를 덜어내는 선"이다.
const COVER_COMPACT_WIDTH_PX = 150;

export interface CollectionBookCardProps {
  item: FeedCollectionItem;
  widthPx: number;
  heightPx: number;
  onClick: () => void;
}

export function CollectionBookCard({ item, widthPx, heightPx, onClick }: CollectionBookCardProps) {
  const fontSize = Math.min(
    COVER_FONT_MAX_PX,
    Math.max(COVER_FONT_MIN_PX, widthPx * COVER_FONT_RATIO),
  );
  const isCompact = widthPx < COVER_COMPACT_WIDTH_PX;
  const accentColor = getCollectionAccentColor(item.collectionId);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ width: widthPx, height: heightPx, backgroundColor: accentColor }}
      // 315: 테두리(border 1px×2)를 ring-inset으로 바꿨다 — border는 box-sizing과 무관하게 카드
      // 높이에 2px을 더하는 고정항이라, 그게 남아 있으면 3:4 비율이 scale마다 미세하게 어긋난다
      // (shelfCabinetLayout.ts FEED_CARD_REF_HEIGHT 주석). ring은 box-shadow라 레이아웃에 영향이 없다.
      // 좌측만 모서리를 덜 굴려(rounded-l-[3px]) 책등 쪽이 각지게 보이도록 한다.
      // 316: 배경색(accent)은 그대로 카드가 갖는다 — 지면을 덜 덮는 판형(insetSquare/arch/
      // verticalTitle)에서 이 색이 흰 지면 아래로 비쳐, 판형이 같아도 컬렉션마다 색이 달라진다.
      className="relative overflow-hidden rounded-l-[3px] rounded-r-lg text-left shadow-[0_6px_14px_rgba(4,33,66,.08)] ring-1 ring-inset ring-line-card transition duration-150 ease-out hover:-translate-y-1.5 hover:shadow-[0_14px_26px_rgba(4,33,66,.2)]"
    >
      <div style={{ fontSize }} className="h-full">
        <CollectionCover
          collectionId={item.collectionId}
          title={item.title}
          keywords={item.keywords}
          recordCount={item.recordCount}
          createdAt={item.createdAt}
          accentColor={accentColor}
          // 316: 표지 일러스트를 저장할 자리가 백엔드에 아직 없다(318 블로커) — 계약이 확정되기
          // 전까지 Zod 스키마에 필드를 추측해 넣지 않는다. 판형은 이미지가 있는 전제로 작성돼
          // 있고, null은 공통 파츠(CoverArtwork)가 accent 그라디언트 폴백으로 흡수한다.
          imageUrl={null}
          isCompact={isCompact}
        />
      </div>

      {/* 책등: 좌측 가장자리의 옅은 그림자. 표지(도판이 가장자리까지 차는 판형 포함) 위에 얹혀야
          하므로 표지보다 뒤에 그린다. 클릭을 가로채지 않도록 pointer-events-none. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-[4%] min-w-[2px] bg-gradient-to-r from-pin-navy/[0.14] to-transparent"
      />
    </button>
  );
}
