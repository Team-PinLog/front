import { formatDate } from '@/shared/lib/formatDate';
import { getCollectionAccentColor } from '@/shared/lib/getCollectionAccentColor';
import type { FeedCollectionItem } from '../api/getFeedCollections';

/**
 * 315: Feed 카드 한 장. 314까지는 `표지(단색 div) + 정보 패널(고정 px)` 2단이라 책이 아니라 썸네일
 * 카드로 보였는데, 정보를 표지 안으로 옮겨 카드 자체가 표지 한 장이 되게 한다(FeedList.tsx에서
 * 분리 — 페이지네이션·이벤트 큐잉은 그대로 FeedList가 갖는다).
 *
 * 표시 슬롯은 시안(북디자인)의 조판을 따른다: 제목 → 키워드 → 저장된 장소 수 → 날짜.
 * ⚠️ "저자/출판사" 자리에 해당하는 소유자 정보는 넣지 않는다 — Feed 응답에 소유자 식별자가 아예
 * 없고(08_API_명세 10.1), 공개 화면 노출도 금지다(docs/privacy-rules.md).
 * keywords: []는 AI 미완료 상태의 정상 응답이라 그냥 칩이 없는 채로 렌더한다(오류 아님).
 *
 * 316에서 이 자리를 표지 레이아웃 6종(band/insetSquare/…)이 대체한다 — 그때까지의 임시 조판이 아니라
 * "이미지 없이도 성립하는 기본 표지"로 두고, 아래 배경(accent + 흰 그라디언트)이 곧 일러스트가 들어올
 * 자리다(하단부를 비워두는 이유).
 */

// 표지 안 글자 크기는 카드 폭에 비례한다 — Tailwind v3 + 컨테이너 쿼리 플러그인 미설치(plugins: [])라
// 고정 px은 작은 카드에서 넘치고, 노드마다 인라인 style을 주면 유지가 어렵다. 그래서 **표지 루트에
// fontSize 하나만 인라인으로 주고 내부는 전부 em 임의값**으로 쓴다.
// ⚠️ em 중첩 금지 — font-size를 지정한 요소 안에서 다시 em font-size를 쓰면 배율이 곱해진다. 아래
// JSX에서 text-[…em]은 반드시 리프 텍스트 노드에만 붙인다(컨테이너에는 padding/gap/margin만 em으로).
// 계수 0.08은 시안(카드 폭 약 240px에 제목 19~20px)에서 역산한 값이다.
const COVER_FONT_RATIO = 0.08;
// 소수 폰트 크기를 반올림하지 않는다 — 반올림하면 창 크기를 연속으로 바꿀 때 카드는 매끄럽게
// 커지는데 글자만 1px씩 계단식으로 튄다. 상/하한만 둔다(하한: 아주 좁은 뷰포트에서 글자가 사실상
// 사라지는 것 방지, 상한: 큰 화면에서 제목이 과하게 커지는 것 방지).
const COVER_FONT_MIN_PX = 9;
const COVER_FONT_MAX_PX = 22;

// 이 폭 미만이면 축약 모드 — 키워드·날짜를 생략하고 제목 + 저장된 장소 수만 남긴다. 폭 150px이면
// 키워드 칩 글자가 약 6px(0.5em × 12px)이라 읽히지 않는데, 안 읽히는 글자를 넣느니 제목에 줄을
// 더 주는 편이 낫다. 행 수 결정의 하한(FEED_ROWS_MIN_CARD_WIDTH_PX = 112)과는 다른 값이다 — 그쪽은
// "배치를 포기하는 선", 이쪽은 "정보를 덜어내는 선"이다.
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

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: widthPx,
        height: heightPx,
        backgroundColor: getCollectionAccentColor(item.collectionId),
      }}
      // 315: 테두리(border 1px×2)를 ring-inset으로 바꾼다 — border는 box-sizing과 무관하게 카드
      // 높이에 2px을 더하는 고정항이라, 그게 남아 있으면 3:4 비율이 scale마다 미세하게 어긋난다
      // (shelfCabinetLayout.ts FEED_CARD_REF_HEIGHT 주석). ring은 box-shadow라 레이아웃에 영향이 없다.
      // 좌측만 모서리를 덜 굴려(rounded-l-[3px]) 책등 쪽이 각지게 보이도록 한다.
      className="relative overflow-hidden rounded-l-[3px] rounded-r-lg text-left shadow-[0_6px_14px_rgba(4,33,66,.08)] ring-1 ring-inset ring-line-card transition duration-150 ease-out hover:-translate-y-1.5 hover:shadow-[0_14px_26px_rgba(4,33,66,.2)]"
    >
      {/* 지면 그라디언트: 위쪽은 흰 종이(글자가 읽히는 면), 아래로 갈수록 accent 색이 비친다.
          시안의 표지도 상단은 밝은 지면에 조판, 하단은 일러스트다 — 그 하단이 316에서 채워진다. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-white/95 via-white/80 via-45% to-white/15"
      />
      {/* 책등: 좌측 가장자리에 아주 옅은 그림자를 둬 평평한 사각형이 아니라 책으로 보이게 한다. */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[4%] min-w-[2px] bg-gradient-to-r from-pin-navy/[0.14] to-transparent"
      />

      <div style={{ fontSize }} className="relative flex h-full flex-col p-[0.85em]">
        <p
          className={`overflow-hidden text-[1em] font-bold leading-[1.35] tracking-[-0.01em] text-pin-navy ${
            isCompact ? 'line-clamp-3' : 'line-clamp-2'
          }`}
        >
          {item.title}
        </p>

        {/* 키워드 수는 응답에 따라 달라진다(현재는 대부분 빈 배열) — 개수를 자르는 대신 높이를
            2줄(칩 0.95em × 2 + gap 0.3em)로 제한해, 키워드가 많아도 아래 푸터를 표지 밖으로
            밀어내지 못하게 한다. */}
        {!isCompact && item.keywords.length > 0 && (
          <div className="mt-[0.55em] flex max-h-[2.2em] flex-wrap gap-[0.3em] overflow-hidden">
            {item.keywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-pin-navy/[0.06] px-[0.6em] py-[0.1em] text-[0.5em] leading-[1.7] text-ink-gray"
              >
                {keyword}
              </span>
            ))}
          </div>
        )}

        <div className="mt-[1.1em]">
          {!isCompact && (
            <p className="text-[0.5em] leading-[1.6] text-ink-gray-light">저장된 장소</p>
          )}
          <p className="flex items-center gap-[0.2em] text-[0.6em] font-semibold leading-[1.5] text-pin-navy">
            <PinIcon />
            {item.recordCount}곳
          </p>
          {!isCompact && (
            <p className="mt-[0.2em] text-[0.55em] leading-[1.5] text-ink-gray-light">
              {formatDate(item.createdAt)}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// 크기를 em으로 두면 부모 <p>의 글자 크기(=카드 폭에 비례)를 그대로 따라간다.
function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[1em] w-[1em] shrink-0 text-ink-gray-light"
      aria-hidden="true"
    >
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
