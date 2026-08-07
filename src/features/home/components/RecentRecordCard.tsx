import { useRecordDetailQuery } from '@/features/records/hooks/useRecordDetailQuery';
import type { RecentRecordCardItem } from '@/features/records/api/getRecentRecords';
import { PinTackMount } from '@/shared/ui/PinSymbols';

/**
 * 사진이 없을 때 쓰는 일러스트풍 폴백의 색 조합. 명세에 "thumbnailUrl은 당분간 대부분 null"이라고
 * 못박혀 있어 이 폴백이 사실상 기본 경로다 — 회색 빈 상자로 두면 화면 대부분이 회색이 된다.
 * placeId로 고르므로 같은 장소는 항상 같은 색이고, 목록 순서가 바뀌어도 유지된다
 * (ContextStickyNote가 contextId로 색을 고르는 것과 같은 규칙).
 */
const FALLBACK_TINTS = [
  { from: '#dff3ec', to: '#bfe5d7', ink: '#2f7f68' },
  { from: '#e6eefc', to: '#c9dcf7', ink: '#37619e' },
  { from: '#fdf2dc', to: '#f7e2ba', ink: '#9a7431' },
] as const;

function pickFallbackTint(placeId: number) {
  return FALLBACK_TINTS[Math.abs(placeId) % FALLBACK_TINTS.length]!;
}

/**
 * 사진 자리를 채우는 일러스트. 실제 장소 사진이 없다는 사실을 감추지 않으면서도 사진 칸이 비어
 * 보이지 않게 하는 것이 목적이라, 사진처럼 보이는 이미지가 아니라 명백한 그림이다.
 */
function PlacePhotoFallback({ placeId }: { placeId: number }) {
  const tint = pickFallbackTint(placeId);
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ background: `linear-gradient(150deg, ${tint.from}, ${tint.to})` }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke={tint.ink} strokeWidth={2}>
        <path d="M24 6c-6.1 0-11 4.8-11 10.8C13 26 24 42 24 42s11-16 11-25.2C35 10.8 30.1 6 24 6Z" />
        <circle cx="24" cy="17" r="4" />
      </svg>
    </div>
  );
}

/**
 * 손글씨 맥락 한 줄. **별도 컴포넌트인 것이 핵심이다.**
 *
 * 최근 목록 응답에는 Context 본문이 없어(명세 11.5) 상세를 따로 불러야 한다. 377에서 카드가 리치
 * 폴라로이드로 돌아오면서 **보이는 카드마다** 맥락이 필요해졌으므로, 호출 수 상한을 구조로 못박는다:
 *
 * - 이 컴포넌트는 **보이는 카드에만** 마운트된다 → 한 화면의 동시 요청은 최대 RECENT_ROW_COUNT(2)건.
 * - recordId별로 react-query가 캐시하므로 **한 번 본 카드는 다시 요청하지 않는다** → 화살표로 목록
 *   전체를 한 바퀴 돌아도 총 요청은 "기록 수"를 넘지 않는다(넘김당 새 카드 1장 = 최대 1건).
 * - 목록을 20건 받아 두므로(useRecentRecordsQuery) 최악의 경우에도 20건이 상한이고, 그마저 사용자가
 *   20번 넘겼을 때에만 도달한다.
 *
 * 로딩·실패에 자리표시자를 두지 않는다 — 메모는 카드의 부가 정보라, 실패했다고 "불러오지 못했습니다"를
 * 띄우면 종이 한가운데에 오류 문구가 박힌다. 조용히 비운다.
 */
function RecentRecordCardMemo({ recordId }: { recordId: number }) {
  const { data } = useRecordDetailQuery(recordId);
  // ⚠️ at(-1)이다. contexts는 createdAt **오름차순**이라 [0]은 가장 오래된 맥락이고, 그걸 쓰면
  // "최근 저장" 카드가 방금 적은 메모가 아니라 예전 메모를 보여준다(PlaceRecordResult.tsx의
  // savedContext도 같은 이유로 at(-1)을 쓴다).
  const body = data?.contexts?.at(-1)?.body?.trim();
  if (!body) {
    return null;
  }
  return (
    // font-hand는 같은 px에서 본문 서체보다 작게 보여 한 단계 키운다(ContextStickyNote와 같은 이유).
    <p className="line-clamp-2 font-hand text-lg leading-tight text-pin-navy/80">{body}</p>
  );
}

interface RecentRecordCardProps {
  item: RecentRecordCardItem;
  /** 상대 날짜 문구("2일 전"). 기준 시각을 목록이 한 번만 정해 모든 카드에 같은 기준을 쓴다. */
  relativeDay: string;
  /** 보이는 카드인지. 보이는 카드만 손글씨 맥락을 지연 호출한다(호출 상한 = 보이는 행 수). */
  isFront: boolean;
  onSelect: (recordId: number) => void;
}

/**
 * "최근의 장소" 카드 한 장. 근거: Jira S15P11A705-371, 377(핀 목업 v2).
 *
 * 377에서 세로 폴라로이드 → **가로로 납작한 종이**로 바꿨다. 세 장을 세로로 펼쳐 보여야 하는데
 * 세로 카드 셋은 화면 높이를 다 먹는다. 사진은 작은 정사각으로 줄이고 글을 오른쪽에 둔다.
 *
 * 압정 구조가 이 컴포넌트의 핵심이다 — 압정 래퍼(z-0)가 **종이(z-10)보다 뒤**에 있어야 바늘이
 * 종이에 가려지고 받침만 위로 보인다. 그래서 바깥 래퍼를 하나 더 두고 그 안에서 층을 나눈다.
 * ⚠️ 종이에 overflow-hidden을 걸면 안 된다(압정이 카드 위로 튀어나와야 한다).
 */
export function RecentRecordCard({ item, relativeDay, isFront, onSelect }: RecentRecordCardProps) {
  const { place, keywords } = item;

  return (
    <div className="relative">
      {/* 압정: 종이보다 **뒤**(z-0). 바늘이 종이에 가려지고 받침만 종이 위로 나온다. */}
      <PinTackMount height={30} />

      <button
        type="button"
        onClick={() => onSelect(item.recordId)}
        className="relative z-10 flex w-full flex-col gap-2 rounded-[3px] bg-white p-2.5 pb-3 text-left shadow-[0_12px_30px_-14px_rgba(4,33,66,0.55)] transition-transform duration-200 ease-out hover:-translate-y-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-log-mint motion-reduce:transition-none"
      >
        {/* 압정 받침이 종이에 드리우는 그림자. 압정이 종이에 "눌러 박혔다"는 인상을 만드는 부분이라
            압정 자체가 아니라 종이 쪽에 그린다. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-6"
          style={{
            background:
              'radial-gradient(ellipse 18px 7px at 50% 0, rgba(4,33,66,.32), transparent 70%)',
          }}
        />

        {/* 폴라로이드 사진 칸. 4:3 고정이라(명세상 thumbnailUrl이 4:3) 사진이 있는 카드와 폴백인
            카드의 높이가 같아 두 행의 리듬이 어긋나지 않는다. */}
        <span className="block aspect-[4/3] w-full overflow-hidden rounded-[2px] bg-paper-white">
          {place.thumbnailUrl ? (
            <img
              src={place.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              draggable={false}
            />
          ) : (
            <PlacePhotoFallback placeId={place.placeId} />
          )}
        </span>

        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-bold text-pin-navy">{place.name}</span>
          {relativeDay && (
            <span className="flex-none text-[11px] font-semibold text-ink-gray-light">
              {relativeDay}
            </span>
          )}
        </span>

        {isFront && <RecentRecordCardMemo recordId={item.recordId} />}

        {/* keywords: []는 AI 판정 전과 "0건"을 구분하지 않는 정상 응답이다(명세 5.9) — 그래서
            SearchResultGallery처럼 "분석 중" 안내를 띄우지 않는다. 구분할 근거가 응답에 없다. */}
        {keywords.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {keywords.slice(0, 3).map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-log-mint/10 px-2 py-0.5 text-[10px] font-bold text-log-mint"
              >
                {keyword}
              </span>
            ))}
          </span>
        )}
      </button>
    </div>
  );
}
