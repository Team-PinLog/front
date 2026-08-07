import { useEffect, useId, useMemo, useState } from 'react';
import { useMyCollectionsQuery } from '@/features/collections/hooks/useMyCollectionsQuery';
// asset(모양)과 색을 같은 파일에 둔 이유는 그쪽 주석 참고 — 둘은 같은 해시 인덱스로 짝지어진다.
import { getRecordMarkerColor } from '@/shared/lib/getRecordMarkerAsset';
import type { RecordMapItem } from '../api/getRecordMapMarkers';

interface MapCollectionLegendProps {
  /** 지금 지도에 찍혀 있는 마커. 개수도 색도 전부 여기서 나온다. */
  items: RecordMapItem[];
}

/** 접힌 머리줄에 미리 보여줄 색 견본 개수. 그 이상은 펼쳐서 본다. */
const COLLAPSED_SWATCH_LIMIT = 6;

interface LegendEntry {
  key: string;
  color: string;
  title: string;
  count: number;
  /** 아직 이름을 못 받은 Collection(목록 페이지가 덜 왔을 때). */
  pending: boolean;
}

/**
 * 지도 마커 색이 무엇을 뜻하는지 밝히는 범례.
 *
 * 마커 색은 예전부터 latestCollectionId 해시로 정해져 있었지만(getRecordMarkerAsset), 화면 어디에도
 * "이 색 = 이 책"이라는 연결이 없어서 사용자에게는 그냥 알록달록한 핀이었다. 마커를 책등 모양으로
 * 바꾸는 것과 한 덩어리인 변경이다 — 모양만 바꾸면 색은 여전히 아무 말도 하지 않는다.
 *
 * 개수는 Collection의 recordCount가 아니라 **지금 지도에 있는 마커**를 센다. 화면에 보이는 것과
 * 숫자가 어긋나지 않아야 하고, latestCollectionId는 Record당 하나라 중복 집계도 생기지 않는다.
 */
export function MapCollectionLegend({ items }: MapCollectionLegendProps) {
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useMyCollectionsQuery();

  // 목록은 커서 페이지네이션(10개씩)이라 첫 페이지만으로는 이름을 다 못 채운다. 범례를 펼친
  // 동안에만 남은 페이지를 이어 받는다 — 접혀 있을 때는 이름이 필요 없어서 요청하지 않는다.
  // 한 번 받을 때마다 hasNextPage/isFetchingNextPage가 바뀌며 다음 장을 당기고, 마지막 장에서
  // hasNextPage가 false가 되며 멈춘다.
  useEffect(() => {
    if (isOpen && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [isOpen, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const titleById = useMemo(() => {
    const map = new Map<number, string>();
    for (const page of data?.pages ?? []) {
      for (const collection of page.items) {
        map.set(collection.collectionId, collection.title);
      }
    }
    return map;
  }, [data]);

  const { books, unassignedCount } = useMemo(() => {
    const counts = new Map<number, number>();
    let unassigned = 0;

    for (const item of items) {
      // latestCollectionId는 필드 자체가 없을 수도 있다(백엔드 배포 지연) — null과 같게 다룬다.
      const collectionId = item.latestCollectionId ?? null;
      if (collectionId === null) {
        unassigned += 1;
        continue;
      }
      counts.set(collectionId, (counts.get(collectionId) ?? 0) + 1);
    }

    const entries: LegendEntry[] = [...counts.entries()]
      .map(([collectionId, count]) => {
        const title = titleById.get(collectionId);
        return {
          key: String(collectionId),
          color: getRecordMarkerColor(collectionId),
          // 이름을 아직 못 받았으면 지어내지 않는다. 페이지가 도착하면 그대로 채워진다.
          title: title ?? '이름 불러오는 중',
          count,
          pending: title === undefined,
        };
      })
      // 지도에 많이 찍힌 책이 위로. 개수가 같으면 이름순이라 렌더마다 순서가 흔들리지 않는다.
      .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, 'ko'));

    return { books: entries, unassignedCount: unassigned };
  }, [items, titleById]);

  // 마커가 하나도 없으면 설명할 색도 없다.
  if (items.length === 0) {
    return null;
  }

  const rows: LegendEntry[] =
    unassignedCount > 0
      ? [
          ...books,
          {
            key: 'unassigned',
            color: getRecordMarkerColor(null),
            title: '아직 담지 않음',
            count: unassignedCount,
            pending: false,
          },
        ]
      : books;

  return (
    <div className="overflow-hidden rounded-2xl border border-line-card bg-snow-white shadow-lg">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={listId}
        className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-log-mint/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-log-mint ${
          isOpen ? 'border-b border-line-subtle' : ''
        }`}
      >
        <span aria-hidden="true" className="flex gap-[3px]">
          {rows.slice(0, COLLAPSED_SWATCH_LIMIT).map((row) => (
            <LegendSwatch key={row.key} color={row.color} />
          ))}
        </span>
        <span className="whitespace-nowrap text-[13px] font-bold text-pin-navy">
          내 책 {books.length}권
        </span>
        <span aria-hidden="true" className="ml-auto text-[11px] leading-none text-ink-gray-light">
          {isOpen ? '⌄' : '⌃'}
        </span>
      </button>

      {isOpen && (
        <ul id={listId} className="flex flex-col gap-px p-1.5">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex w-[212px] items-center gap-2.5 rounded-lg px-2 py-1.5"
            >
              <LegendSwatch color={row.color} />
              <span
                className={`flex-1 truncate text-[12.5px] ${
                  row.pending ? 'text-ink-gray-light' : 'text-pin-navy'
                }`}
              >
                {row.title}
              </span>
              <span className="text-[11.5px] tabular-nums text-ink-gray-light">{row.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * 책등을 옆에서 본 얇은 조각. 안쪽 왼쪽 하이라이트는 마커 SVG·ShelfBookSpine과 같은 장식이라,
 * 이 견본이 지도에 꽂힌 그 책과 같은 물건으로 읽힌다.
 */
function LegendSwatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="h-[18px] w-[7px] flex-none rounded-sm shadow-[inset_1px_0_0_rgba(255,255,255,.34),0_1px_2px_rgba(4,33,66,.22)]"
      style={{ backgroundColor: color }}
    />
  );
}
