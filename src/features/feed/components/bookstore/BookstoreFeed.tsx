import { useState, type ReactNode } from 'react';
import { ShelfPlank } from '@/shared/ui/Shelf';
import { CollectionBookCard } from '../CollectionBookCard';
import { getWeeklyKeywords, type BookstoreLayout } from '../../lib/feedLayout';
import { readRecentlyOpened } from '../../lib/recentlyOpenedCollections';
import type { FeedCollectionItem } from '../../api/getFeedCollections';

/**
 * 382: 서점 매대 레이아웃(레퍼런스: 북스토어 앱). 위쪽 히어로 선반에 대표 책 한 권을 크게 세우고
 * 그 옆에 보조 카드 두 장, 아래쪽 선반에 나머지 추천을 늘어놓는다.
 *
 * ⏪ **롤백 지점**: 이 폴더(components/bookstore/)가 새 레이아웃의 전부다. feedLayout.ts의
 * FEED_LAYOUT을 'classic'으로 되돌리면 이 컴포넌트는 렌더되지 않고 기존 화면이 그대로 나온다.
 *
 * 이 컴포넌트는 **그리기만 한다.** 데이터 요청·페이지네이션·CLICK 이벤트 큐잉은 전부 FeedList가
 * 그대로 갖고 있고, 여기로는 이미 정해진 items와 onItemClick만 내려온다 — position·requestId를
 * 이 파일이 알 필요도, 만들 이유도 없다(재계산 금지, AGENTS.md 금지 5).
 *
 * 레퍼런스에 있지만 만들지 않은 것: 별점·리뷰 수·구매 버튼. 대응하는 데이터가 응답에 없다. 없는
 * 값을 그럴듯하게 채우면 화면이 거짓말을 한다.
 */

/** 보조 카드에 띄우는 키워드 수. 카드 폭이 240~360px이라 세 개가 한 줄에 들어가는 한계다. */
const WEEKLY_KEYWORD_LIMIT = 3;
/** "최근 열어본 책"에 보여줄 줄 수. 카드 높이가 히어로의 절반이라 넷부터는 넘친다. */
const RECENT_LIMIT = 3;

export interface BookstoreFeedProps {
  items: FeedCollectionItem[];
  layout: BookstoreLayout;
  /** 선반 덩어리 폭. 좌우 페이지 버튼이 놓이는 gutter를 포함한 값이라 FeedList가 정한다. */
  widthPx: number;
  onItemClick: (item: FeedCollectionItem) => void;
  /** 로딩 스켈레톤 칠. 빈 자리에만 붙는다. */
  slotClassName?: string;
  /** 선반 위 정중앙에 얹는 안내(빈 목록·에러). */
  overlay?: ReactNode;
}

/**
 * 책이 없어도(로딩·빈 목록·에러) **선반과 카드 자리는 그대로 그린다.** 314가 기존 레이아웃에서
 * 세운 원칙과 같다 — 상태마다 화면 구조가 달라지면 데이터가 도착하는 순간 레이아웃이 통째로 튄다.
 */
export function BookstoreFeed({
  items,
  layout,
  widthPx,
  onItemClick,
  slotClassName,
  overlay,
}: BookstoreFeedProps) {
  // 대표 책은 **응답의 첫 항목**이다. "가장 인기 있는 책"이 아니라 서버가 준 추천 순서의 첫머리라는
  // 뜻이고, 화면에도 순위 표현을 쓰지 않는다(AGENTS.md 금지 5).
  const [hero, ...rest] = items;
  const shelfItems = rest.slice(0, layout.shelfCapacity);

  // 로컬 기록이라 렌더 중에 읽어도 되지만, 저장소 접근은 한 번이면 충분해서 초기값으로만 읽는다.
  // 클릭하면 곧바로 라우트가 바뀌어 이 화면이 언마운트되므로 갱신을 구독할 필요가 없다.
  const [recentlyOpened] = useState(() => readRecentlyOpened());

  return (
    <div
      className="relative m-auto flex flex-col"
      style={{ width: widthPx, gap: layout.sectionGap }}
    >
      {/* --- 히어로 선반 ------------------------------------------------------------------- */}
      <section
        aria-label="이번 추천의 첫 책"
        className="flex flex-col"
        style={{ height: layout.heroSectionHeight }}
      >
        <div
          className="flex min-h-0 flex-1 items-end justify-center"
          style={{ gap: layout.heroAsideGap }}
        >
          {hero ? (
            <CollectionBookCard
              item={hero}
              widthPx={layout.heroCardWidth}
              heightPx={layout.heroCardHeight}
              onClick={() => onItemClick(hero)}
            />
          ) : (
            <div
              aria-hidden="true"
              style={{ width: layout.heroCardWidth, height: layout.heroCardHeight }}
              className={slotClassName}
            />
          )}

          {layout.showAside && (
            <div
              className="flex h-full min-h-0 flex-col justify-end"
              style={{ width: layout.asideWidth, gap: layout.bookGap }}
            >
              <WeeklyKeywordsCard items={items} />
              <RecentlyOpenedCard entries={recentlyOpened.slice(0, RECENT_LIMIT)} />
            </div>
          )}
        </div>

        <ShelfPlank heightPx={layout.plankHeight} />
      </section>

      {/* --- 하단 선반 -------------------------------------------------------------------- */}
      <section
        aria-label="추천 책장"
        className="flex flex-col"
        style={{ height: layout.shelfSectionHeight }}
      >
        <div
          className="flex min-h-0 flex-1 items-end justify-center"
          style={{ gap: layout.bookGap }}
        >
          {/* 슬롯 수를 선반 용량으로 고정한다 — 마지막 페이지처럼 항목이 모자라도 선반 크기가
              그대로여서 페이지를 넘길 때 판이 늘었다 줄었다 하지 않는다. */}
          {Array.from({ length: layout.shelfCapacity }, (_, index) => {
            const item = shelfItems[index];
            if (!item) {
              return (
                <div
                  key={`empty-${index}`}
                  aria-hidden="true"
                  style={{ width: layout.shelfCardWidth, height: layout.shelfCardHeight }}
                  className={slotClassName}
                />
              );
            }
            // 354: key에 requestId를 넣지 않는다 — 목록이 다시 받아지면 같은 자리 같은 책인데도
            // 카드가 전부 재마운트돼 표지가 다시 로딩되는 것처럼 보인다.
            return (
              <CollectionBookCard
                key={`${item.collectionId}-${item.position}`}
                item={item}
                widthPx={layout.shelfCardWidth}
                heightPx={layout.shelfCardHeight}
                onClick={() => onItemClick(item)}
              />
            );
          })}
        </div>

        <ShelfPlank heightPx={layout.plankHeight} />
      </section>

      {overlay && <div className="absolute inset-0 grid place-items-center">{overlay}</div>}
    </div>
  );
}

/** 보조 카드 공용 껍데기 — 두 카드가 같은 종이로 보여야 한 벌이 된다. */
function AsideCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-lg border border-line-card bg-snow-white p-4 shadow-[0_6px_14px_rgba(4,33,66,.06)]">
      <h2 className="font-serif text-sm font-bold text-pin-navy">{title}</h2>
      {children}
    </div>
  );
}

/**
 * 보조 카드 1 — 이번 주의 키워드.
 *
 * ⚠️ 레퍼런스의 "이 주의 작가" 자리지만 **작성자를 절대 쓰지 않는다.** Feed 응답에는 소유자
 * 식별자가 없고 공개 화면 노출도 금지다(docs/privacy-rules.md, AGENTS.md 금지 1). 대신 지금 페이지에
 * 모인 책들의 키워드를 세어 "무엇이 많이 모였나"를 보여준다 — 익명 큐레이션이다.
 */
function WeeklyKeywordsCard({ items }: { items: { keywords: string[] }[] }) {
  const keywords = getWeeklyKeywords(items, WEEKLY_KEYWORD_LIMIT);

  return (
    <AsideCard title="이번 주의 키워드">
      {keywords.length === 0 ? (
        // keywords: []는 AI 미완료 상태의 정상 응답이다 — 오류 문구를 쓰지 않는다(AGENTS.md 금지 4).
        <p className="text-xs text-ink-gray">키워드가 모이면 여기에 보여드릴게요.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {keywords.map((keyword) => (
            <li
              key={keyword.label}
              className="rounded-full bg-log-mint/15 px-2.5 py-1 text-xs font-medium text-pin-navy"
            >
              {keyword.label}
              <span className="ml-1 text-ink-gray-light">{keyword.count}</span>
            </li>
          ))}
        </ul>
      )}
    </AsideCard>
  );
}

/** 보조 카드 2 — 최근 열어본 책(이 브라우저의 로컬 기록, 서버 호출 없음). */
function RecentlyOpenedCard({ entries }: { entries: { collectionId: number; title: string }[] }) {
  return (
    <AsideCard title="최근 열어본 책">
      {entries.length === 0 ? (
        <p className="text-xs text-ink-gray">책을 펼치면 여기에 쌓여요.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {entries.map((entry) => (
            <li key={entry.collectionId} className="truncate text-xs text-ink-gray">
              {entry.title}
            </li>
          ))}
        </ul>
      )}
    </AsideCard>
  );
}
