import { useRecordDetailQuery } from '@/features/records/hooks/useRecordDetailQuery';
import type { RecentRecordCardItem } from '@/features/records/api/getRecentRecords';

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
 * 사진 자리를 채우는 일러스트. 실제 장소 사진이 없다는 사실을 감추지 않으면서도 폴라로이드의
 * "사진 칸"이 비어 보이지 않게 하는 것이 목적이라, 사진처럼 보이는 이미지가 아니라 명백한 그림이다.
 */
function PlacePhotoFallback({ placeId }: { placeId: number }) {
  const tint = pickFallbackTint(placeId);
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ background: `linear-gradient(150deg, ${tint.from}, ${tint.to})` }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke={tint.ink} strokeWidth={2}>
        <path d="M24 6c-6.1 0-11 4.8-11 10.8C13 26 24 42 24 42s11-16 11-25.2C35 10.8 30.1 6 24 6Z" />
        <circle cx="24" cy="17" r="4" />
      </svg>
    </div>
  );
}

/**
 * 앞장에만 붙는 손글씨 메모. **별도 컴포넌트인 것이 핵심이다.**
 *
 * 최근 목록 응답에는 Context 본문이 없어(명세 11.5) 상세를 따로 불러야 하는데, 카드마다 훅을 부르면
 * 스택에 그린 장 수만큼 요청이 나간다. 앞장일 때만 이 컴포넌트를 마운트하면 훅이 한 번만 돌고,
 * react-query 캐시 덕에 한 번 본 장으로 되돌아왔을 때는 재요청도 없다(장 넘김당 최대 1회).
 *
 * 로딩·실패에 자리표시자를 두지 않는다 — 메모는 카드의 부가 정보라, 실패했다고 "불러오지 못했습니다"를
 * 띄우면 폴라로이드 한가운데에 오류 문구가 박힌다. 조용히 비운다.
 */
function RecentRecordCardMemo({ recordId }: { recordId: number }) {
  const { data } = useRecordDetailQuery(recordId);
  // contexts는 본인 소유 조회라 배열로 온다(getRecordDetail 주석). 가장 최근 것 하나만 보여준다 —
  // 폴라로이드 아래 여백은 한 줄짜리 메모 자리이지 목록 자리가 아니다.
  // ⚠️ at(-1)이다. contexts는 createdAt **오름차순**이라 [0]은 가장 오래된 맥락이고, 그걸 쓰면
  // "최근 저장" 카드가 방금 적은 메모가 아니라 예전 메모를 보여준다(PlaceRecordResult.tsx의
  // savedContext도 같은 이유로 at(-1)을 쓴다).
  const body = data?.contexts?.at(-1)?.body?.trim();
  if (!body) {
    return null;
  }
  return (
    // font-hand(Nanum Pen Script)는 같은 px에서 Pretendard보다 작게 보여 한 단계 키운다
    // (ContextStickyNote와 같은 이유).
    <p className="line-clamp-2 font-hand text-lg leading-tight text-pin-navy/80">{body}</p>
  );
}

interface RecentRecordCardProps {
  item: RecentRecordCardItem;
  /** 상대 날짜 문구("2일 전"). 기준 시각을 스택이 한 번만 정해 모든 장에 같은 기준을 쓴다. */
  relativeDay: string;
  /** 앞장일 때만 손글씨 메모를 지연 호출한다. */
  isFront: boolean;
}

/**
 * 최근 저장 Record 한 장의 폴라로이드 카드. 근거: Jira S15P11A705-371.
 * 스택 안에서의 위치·각도·애니메이션은 이 컴포넌트가 모른다 — 부모(RecentRecordCardStack)가
 * 감싸는 요소에 transform을 건다. 여기서는 "한 장의 앞면"만 그린다.
 */
export function RecentRecordCard({ item, relativeDay, isFront }: RecentRecordCardProps) {
  const { place, keywords } = item;

  return (
    <div className="flex h-full w-full flex-col gap-3 rounded-[3px] bg-white p-3 pb-4 shadow-[0_10px_30px_-12px_rgba(4,33,66,0.45)]">
      {/* 폴라로이드 사진 칸은 4:3 고정이다(명세상 thumbnailUrl이 4:3) — 비율을 고정해야 사진이 있는
          장과 폴백인 장의 카드 높이가 같아 스택이 어긋나지 않는다. */}
      <div className="aspect-[4/3] w-full overflow-hidden bg-paper-white">
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
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-bold text-pin-navy">{place.name}</p>
          {relativeDay && (
            <span className="flex-none text-[11px] font-semibold text-ink-gray-light">
              {relativeDay}
            </span>
          )}
        </div>

        {isFront && <RecentRecordCardMemo recordId={item.recordId} />}

        {/* keywords: []는 AI 판정 전과 "0건"을 구분하지 않는 정상 응답이다(명세 5.9) — 그래서
            SearchResultGallery처럼 "분석 중" 안내를 띄우지 않는다. 구분할 근거가 응답에 없다. */}
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {keywords.slice(0, 3).map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-log-mint/10 px-2 py-0.5 text-[11px] font-bold text-log-mint"
              >
                {keyword}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
