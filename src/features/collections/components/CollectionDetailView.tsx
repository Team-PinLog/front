import { useEffect, useState, type ReactNode } from 'react';
import { useEditCollectionTitle } from '@/contexts/useEditCollectionTitle';
import { useCollectionDeleteConfirm } from '@/contexts/useCollectionDeleteConfirm';
import { useCollectionSpread } from '@/contexts/useCollectionSpread';
import { useDeleteConfirm } from '@/contexts/useDeleteConfirm';
import { ErrorState } from '@/shared/ui/ErrorState';
import { DeleteConfirmDialog } from '@/features/records/components/DeleteConfirmDialog';
import type { CollectionDetail } from '../api/getCollectionDetail';
import { useCollectionDetailQuery } from '../hooks/useCollectionDetailQuery';
import { AddRecordToCollectionDialog } from './AddRecordToCollectionDialog';
import { AuthorShelfPanel } from './AuthorShelfPanel';
import { CollectionContextCollage } from './CollectionContextCollage';
import { CollectionIndexRail } from './CollectionIndexRail';
import { CollectionMapPoster } from './CollectionMapPoster';
import { CollectionRecordPhoto } from './CollectionRecordPhoto';
import { CollectionSpreadPage } from './CollectionSpreadPage';
import { RecordRemoveButton } from './RecordRemoveButton';
import { RecordSaveButton } from './RecordSaveButton';

export type CollectionRecordItem = CollectionDetail['records']['items'][number];

/** "YYYY. M. D." — 시안의 부제 표기. 서버 ISO 문자열 앞 10자만 쓴다(shared/lib/formatDate와 같은 규칙). */
function formatMadeOn(isoDateTime: string): string {
  const [year, month, day] = isoDateTime.slice(0, 10).split('-');
  return `${year}. ${Number(month)}. ${Number(day)}.`;
}

/** 시안의 주소 앞 초록 핀. 이모지는 OS마다 모양·색이 달라 톤을 맞출 수 없어 SVG로 둔다. */
function PlacePinIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="#4f9b78"
      aria-hidden="true"
      className="mt-[2px] flex-none"
    >
      <path d="M12 2C7.9 2 4.5 5.3 4.5 9.4c0 5.4 6.7 11.9 7 12.2.3.3.7.3 1 0 .3-.3 7-6.8 7-12.2C19.5 5.3 16.1 2 12 2Zm0 10.2a2.9 2.9 0 1 1 0-5.8 2.9 2.9 0 0 1 0 5.8Z" />
    </svg>
  );
}

/** 종이 위의 조용한 텍스트 액션. 소유자 전용 도구라 표제보다 눈에 덜 띄어야 한다. */
const QUIET_ACTION_CLASS =
  'rounded-full px-2 py-1 text-[12px] font-bold text-[#8a857e] transition-colors hover:bg-black/5 hover:text-[#2c2a28] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4f9b78] disabled:opacity-40';

interface CollectionDetailViewProps {
  collectionId: number;
  // Feed(142) 경유 진입일 때만 채워진다 — 그 외 진입(내 책장·직접 URL 등)은 undefined다(하위 호환).
  feedRequestId?: string;
  feedPosition?: number;
  // 332: 오른쪽 책장에서 다른 Collection으로 넘어온 진입인지(router.tsx HistoryState.shelfContext).
  // 418-36부터 책장 노출 조건에서는 쓰지 않는다(타인 컬렉션이면 언제나 세운다). 라우터가 계속
  // 넘기고 있어 계약은 그대로 두되, 이 컴포넌트는 더 이상 읽지 않는다.
  hasShelfContext?: boolean;
  // 돌아갈 앱 내 지점이 있을 때만 넘어온다 — 펼침면 우상단 ✕를 그릴지 결정한다.
  onClose?: () => void;
}

/** 펼침면 바깥 여백. 책장 패널을 세울 때만 폭이 넓어진다. */
function SpreadFrame({ wide, children }: { wide: boolean; children: ReactNode }) {
  return (
    <div
      className={`mx-auto flex w-full items-start gap-8 px-4 py-3 ${
        wide ? 'max-w-[1560px]' : 'max-w-[1300px]'
      }`}
    >
      {children}
    </div>
  );
}

/**
 * Collection 상세 — **책 펼침면**(418).
 *
 * ## 무엇이 바뀌었나 (332/378 → 418)
 *
 * - 목차 장(속표지)이 사라졌다. 시안의 왼쪽 면이 곧 표제(컬렉션 제목·기록 수·만든 날)와
 *   **이 컬렉션의 장소들 전체 지도**라, 그 역할을 하던 별도의 첫 장이 필요 없어졌다.
 *   쪽 번호도 그래서 `record 순번 / 전체`다(시안의 "1 / 4").
 * - 페이지 스크롤이 사라졌다. 맥락은 세로 나열이 아니라 **밀도가 조여지는 2열 콜라주**로 앉는다
 *   (415의 배치기를 공유). 본문을 자르거나 말줄임하지 않는다.
 * - 좌측 "이 작성자의 다른 컬렉션"은 세로로 자라는 1열 캐비닛에서 **2열 고정 + 쪽 넘김**이 됐다
 *   (AuthorShelfPanel).
 *
 * ## 공개 범위 (privacy-rules.md 1장 — 이 화면의 핵심 제약)
 *
 * `ownedByMe`로 두 배치가 갈린다. 타인 조회는 `contexts`가 `null`이라 맥락 무리를 **렌더 자체 하지
 * 않고**, 키워드는 `label` 문자열만 온다(`code` 없음), 진입점은 `collectionId`뿐이라 `member.id`를
 * 쓰지 않는다. 소유자 전용 동작(제목 수정·삭제·기록 추가·이 장 덜어내기)도 그 분기 안에만 있다.
 *
 * ## 기능 무손실
 *
 * 페이지 넘김(모서리·페이지 클릭·방향키)·지도 핀 클릭 이동·인덱스 레일·Record 저장(Feed SAVE 이벤트
 * 포함)·마지막 Record 제거 시 409 강제 삭제 흐름은 그대로다.
 */
export function CollectionDetailView({
  collectionId,
  feedRequestId,
  feedPosition,
  onClose,
}: CollectionDetailViewProps) {
  const detailQuery = useCollectionDetailQuery(collectionId);
  const editTitleState = useEditCollectionTitle();
  const collectionDeleteConfirm = useCollectionDeleteConfirm();
  const spreadState = useCollectionSpread();
  // Record의 마지막 Context 삭제 확인(409) 상태. 스프레드 네비게이션과 레이스가 나지 않도록
  // 이 상태가 열려 있는 동안은 이동을 막는다(203 논의).
  const recordDeleteConfirm = useDeleteConfirm();
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  // lg 미만에서는 책장을 나란히 둘 가로 폭이 없어 서랍(오른쪽 슬라이드)으로 연다.
  const [isShelfOpen, setIsShelfOpen] = useState(false);
  // 418-39: 목차 장(첫 장) 노출 여부. spreadIndex(CollectionSpreadContext)와 달리 이 화면 안에서만
  // 의미가 있어 로컬 state로 둔다 — 332~378에서 쓰던 것과 같은 구조다.
  const [isTocOpen, setIsTocOpen] = useState(true);

  // 진입 시 hasNextPage가 false가 될 때까지 자동으로 순차 로드한다 — 왼쪽 지도가 Collection의 모든
  // record를 한 번에 보여줘야 하기 때문이다. isFetchNextPageError면 더 재시도하지 않는다.
  const { data, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } =
    detailQuery;
  useEffect(() => {
    if (data && hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [data, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  if (detailQuery.isPending) {
    // 골격(펼침면 크기)을 그대로 유지하고 안쪽만 비운다 — 한 줄짜리 문구만 반환하면 레이아웃이
    // 붕괴했다 복구되는 한 프레임이 "번쩍임"으로 보인다(332 피드백 2번).
    return (
      <SpreadFrame wide={false}>
        <div className="min-w-0 flex-1">
          <CollectionSpreadPage
            onClose={onClose}
            left={<p className="m-auto text-[13px] text-[#8a857e]">책을 펼치는 중…</p>}
            right={null}
          />
        </div>
      </SpreadFrame>
    );
  }

  if (detailQuery.isError) {
    // 08_API_명세: 존재하지 않거나 비공개인 Collection은 404 RESOURCE_NOT_FOUND로 응답한다(소유 여부 은닉).
    const isNotFound = detailQuery.error.code === 'RESOURCE_NOT_FOUND';
    return (
      <SpreadFrame wide={false}>
        <div className="min-w-0 flex-1">
          <CollectionSpreadPage
            onClose={onClose}
            left={
              <div className="m-auto">
                <ErrorState
                  title={isNotFound ? '컬렉션을 찾을 수 없어요' : '컬렉션을 불러오지 못했어요'}
                  description={
                    isNotFound
                      ? '삭제되었거나 접근할 수 없는 컬렉션이에요.'
                      : '잠시 후 다시 시도해 주세요.'
                  }
                />
              </div>
            }
            right={null}
          />
        </div>
      </SpreadFrame>
    );
  }

  const pages = detailQuery.data.pages;
  const { title, ownedByMe, createdAt } = pages[0];
  const flatRecords = pages.flatMap((page) => page.records.items);
  const isLoadingAllPlaces = detailQuery.hasNextPage && !detailQuery.isFetchNextPageError;
  // 217: 전체 로드가 끝나기 전에는 이 목록이 불완전해 "이미 담김" 필터링을 신뢰할 수 없다.
  const excludedRecordIds = new Set(flatRecords.map((record) => record.recordId));

  // 타인 컬렉션 펼침면에는 **항상** 작성자의 다른 컬렉션 책장을 세운다(418-36).
  // 332는 Feed·책장 경유 진입으로만 한정했는데, 그 결과 탐색·직접 URL로 남의 책을 펼치면 책장이
  // 통째로 사라졌다 — 같은 화면이 진입 경로에 따라 다른 구성이 되는 것이 결함으로 지목됐다.
  // 내 Collection에는 여전히 세우지 않는다(이 패널이 Follow/Unfollow를 함께 다룬다).
  const showShelfPanel = !ownedByMe;

  const currentIndex = Math.min(spreadState.spreadIndex, Math.max(0, flatRecords.length - 1));
  const currentRecord = flatRecords[currentIndex] as CollectionRecordItem | undefined;
  const canGoNext = currentIndex < flatRecords.length - 1;
  const canGoPrevious = currentIndex > 0;
  // Record 강제 삭제 확인(409) 모달이 열려 있는 동안 장을 넘기면 confirm 상태(targetContextId·impact)는
  // 이전 record 것인데 넘기는 recordId는 새 record 것이 되는 레이스가 생긴다(203 논의).
  const isRecordDeleteConfirmOpen = recordDeleteConfirm.isOpen;

  // 418-39: 목차 장을 되살린다. 쪽 순서는 [목차] → [record 0] → … → [record n-1]이고, 목차는
  // 되돌아갈 수 있는 첫 장이다(332의 규칙 그대로). 지도 맞춤도 이 상태로 갈린다 — 목차에서는
  // 컬렉션의 모든 핀이 보이게, record 장에서는 그 record의 핀 위치로 맞춘다.
  const handleNext = () => {
    if (isRecordDeleteConfirmOpen) {
      return;
    }
    if (isTocOpen) {
      setIsTocOpen(false);
      return;
    }
    if (canGoNext) {
      spreadState.goToNext();
    }
  };
  const handlePrevious = () => {
    if (isRecordDeleteConfirmOpen || isTocOpen) {
      return;
    }
    if (canGoPrevious) {
      spreadState.goToPrevious();
      return;
    }
    setIsTocOpen(true);
  };
  const handleSelectIndex = (index: number) => {
    if (!isRecordDeleteConfirmOpen) {
      setIsTocOpen(false);
      spreadState.goToIndex(index);
    }
  };
  const handleSelectFromMap = (recordId: number) => {
    const index = flatRecords.findIndex((record) => record.recordId === recordId);
    if (index !== -1) {
      handleSelectIndex(index);
    }
  };

  const mapPlaces = flatRecords.map((record) => ({
    recordId: record.recordId,
    name: record.place.name,
    lat: record.place.lat,
    lng: record.place.lng,
  }));

  const addRecordDialog = ownedByMe && (
    <AddRecordToCollectionDialog
      collectionId={collectionId}
      excludedRecordIds={excludedRecordIds}
      isOpen={isAddRecordOpen}
      onClose={() => setIsAddRecordOpen(false)}
    />
  );

  // ── 왼쪽 면: 표제 + 지도 포스터 + 손글씨 ────────────────────────────────
  // 소유자면 포스터 우하단 모서리에 압정 폴라로이드가 걸쳐 얹힌다(시안 1).
  const leftPage = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-none pr-12">
        <h1 className="text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] text-[#2c2a28] sm:text-[30px]">
          {title}
        </h1>
        <p className="mt-2 text-[13px] text-[#8a857e]">
          기록 {flatRecords.length}
          {isLoadingAllPlaces ? '+' : ''}개 · {formatMadeOn(createdAt)} 만듦
        </p>
        {/* 418-42: 소유자 전용 도구를 면 아래 구석에서 **표제 바로 아래(왼쪽 상단)**로 올렸다.
            버튼 구성·동작은 그대로이고 자리만 바뀐다. */}
        {ownedByMe && (
          <div className="mt-3 flex flex-wrap items-center gap-0.5">
            <button
              type="button"
              onClick={() => setIsAddRecordOpen(true)}
              disabled={isLoadingAllPlaces}
              className={QUIET_ACTION_CLASS}
            >
              {isLoadingAllPlaces ? '목록 불러오는 중…' : '기록 추가'}
            </button>
            <button type="button" onClick={editTitleState.open} className={QUIET_ACTION_CLASS}>
              제목 수정
            </button>
            <button
              type="button"
              onClick={() => collectionDeleteConfirm.open('direct')}
              className={`${QUIET_ACTION_CLASS} hover:text-red-500`}
            >
              컬렉션 삭제
            </button>
          </div>
        )}
      </div>

      {/* 지도는 조작 대상이라 페이지 넘김에서 통째로 제외한다 — 지도를 끌어 옮기려다 장이
          넘어가면 안 된다(332부터의 규칙). 폴라로이드도 이 상자 안이라 함께 제외된다. */}
      <div data-page-turn="ignore" className="relative mt-6 flex min-h-0 flex-1 flex-col">
        <CollectionMapPoster
          collectionId={collectionId}
          places={isLoadingAllPlaces ? [] : mapPlaces}
          activeRecordId={currentRecord?.recordId ?? null}
          isLoadingAll={isLoadingAllPlaces}
          // 418-39: 목차 장이면 컬렉션 전체 핀, record 장이면 그 record의 핀으로 맞춘다.
          fitAllBounds={isTocOpen}
          onSelectPlace={handleSelectFromMap}
        />
        {/* 418-48: 목차 장에서는 사진을 띄우지 않는다 — 목차의 왼쪽 면은 컬렉션 전체 지도이고,
            거기 한 record의 사진이 걸쳐 있으면 그 장소가 목차를 대표하는 것처럼 읽힌다.
            record 장에서는 그대로 유지한다. */}
        {ownedByMe && !isTocOpen && currentRecord && (
          <CollectionRecordPhoto
            key={currentRecord.recordId}
            placeName={currentRecord.place.name}
            thumbnailUrl={currentRecord.place.thumbnailUrl}
            className="absolute -bottom-3 right-2 z-20 w-[46%]"
          />
        )}
      </div>

      <div className="mt-5 flex flex-none flex-wrap items-center justify-between gap-2">
        <p className="font-hand text-[21px] leading-none text-[#8a857e]">이 컬렉션의 장소들</p>
      </div>
    </div>
  );

  // ── 오른쪽 면: (목차 장) 장 목록 / 장소 + (소유자) 맥락 콜라주 / (타인) 폴라로이드 + 저장 진입점 ──
  let rightPage: ReactNode;
  if (isTocOpen) {
    // 418-39: 되살린 목차 장. 왼쪽 면은 그대로 표제 + 전체 지도이고, 오른쪽 면이 장 목록이다.
    // 항목이 많으면 이 목록 **안에서** 스크롤한다(인덱스 레일과 같은 규칙) — 펼침면은 자라지 않는다.
    rightPage = (
      <div className="flex min-h-0 flex-1 flex-col">
        <h2 className="flex-none text-[23px] font-extrabold leading-[1.12] tracking-[-0.02em] text-[#2c2a28] sm:text-[26px]">
          목차
        </h2>
        {flatRecords.length === 0 ? (
          <p className="mt-6 font-hand text-[20px] text-[#a29d95]">
            아직 이 책에 담긴 장소가 없어요
          </p>
        ) : (
          <div
            data-page-turn="ignore"
            className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#4f9b78]"
          >
            {flatRecords.map((record, index) => (
              <button
                key={record.recordId}
                type="button"
                onClick={() => handleSelectIndex(index)}
                className="flex w-full items-center gap-3 border-b border-dashed border-[#e4ded3] px-1 py-3 text-left transition-colors hover:bg-black/[0.03] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#4f9b78]"
              >
                <span className="w-5 flex-none text-[12px] font-extrabold text-[#4f9b78]">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-[#2c2a28]">
                  {record.place.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  } else if (!currentRecord) {
    rightPage = (
      <div className="m-auto flex flex-col items-center gap-3 text-center">
        <p className="font-hand text-[22px] text-[#a29d95]">아직 이 책에 담긴 장소가 없어요</p>
        {ownedByMe && (
          <button
            type="button"
            onClick={() => setIsAddRecordOpen(true)}
            disabled={isLoadingAllPlaces}
            className="rounded-full bg-[#4f9b78] px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-[#448a6a] disabled:opacity-40"
          >
            기록 담기
          </button>
        )}
      </div>
    );
  } else {
    // contexts는 ownedByMe일 때만 배열이고 타인 조회는 null이다 — null이면 접근조차 하지 않는다.
    const contexts = (ownedByMe && currentRecord.contexts) || [];

    rightPage = (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-none pr-12">
          <h2 className="text-[23px] font-extrabold leading-[1.12] tracking-[-0.02em] text-[#2c2a28] sm:text-[26px]">
            {currentRecord.place.name}
          </h2>
          <div className="mt-2.5 flex items-start gap-1.5 text-[13px] font-semibold text-[#3f7d5f]">
            <PlacePinIcon />
            <span className="min-w-0 break-keep">{currentRecord.place.address}</span>
          </div>

          {/* keywords: []는 AI 미완료 상태의 정상 응답이다 — 오류·로딩 실패로 다루지 않는다.
              label만 표시하고 식별에 쓰지 않는다(AGENTS.md 금지 2). label은 겹칠 수 있어 React key에
              순번을 붙인다. */}
          <div className="mt-4">
            {currentRecord.keywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {currentRecord.keywords.map((keyword, index) => (
                  <span
                    key={`${index}-${keyword}`}
                    className="rounded-full bg-[#dff0e4] px-3.5 py-1.5 text-[12px] font-bold text-[#3f7d5f]"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            ) : (
              // "없다"가 아니라 "아직 안 붙었다"이다. 없다고 적으면 영영 없는 것처럼 읽힌다.
              <p className="text-[12px] font-medium text-[#a29d95]">키워드를 정리하는 중이에요</p>
            )}
          </div>
        </div>

        {ownedByMe ? (
          <>
            <h3 className="mt-5 flex-none text-[12px] font-extrabold tracking-[0.14em] text-[#4f9b78]">
              기록한 맥락
            </h3>
            {/* 418-33: 맥락은 **포개 붙인다**. 밀도 사다리로도 안 담기면 스크롤이 아니라 겹침이
                깊어지고, 덮인 카드는 호버·포커스로 떠올라 전문을 드러낸다(CollectionContextCollage).
                포스트잇 무리는 조작 대상(✎/× 버튼)이라 페이지 넘김에서 제외한다(그 컴포넌트가
                data-page-turn="ignore"를 직접 단다). */}
            <CollectionContextCollage recordId={currentRecord.recordId} contexts={contexts} />

            {/* 파괴적 동작은 면의 오른쪽 아래 구석에, 작게(418 코멘트 2의 4번). */}
            <div className="mt-1 flex flex-none justify-end">
              <RecordRemoveButton collectionId={collectionId} recordId={currentRecord.recordId} />
            </div>
          </>
        ) : (
          <div className="mt-6 flex min-h-0 flex-1 flex-col justify-between gap-5">
            {/* 사진이 이 면의 주인공이다(시안 2 — 폴라로이드가 오른쪽 위로 올라온다). */}
            <div className="flex flex-none justify-center pt-4">
              <CollectionRecordPhoto
                key={currentRecord.recordId}
                placeName={currentRecord.place.name}
                thumbnailUrl={currentRecord.place.thumbnailUrl}
                className="w-[68%] max-w-[260px]"
              />
            </div>

            <div className="flex flex-none flex-col gap-2.5" data-page-turn="ignore">
              {/* 맥락이 비어 있는 이유를 말해 준다. 남의 기록에 맥락을 더할 수는 없으므로 여기에
                  '맥락 추가' 진입점을 두지 않는다(privacy-rules.md — 타인 응답의 contexts는 null). */}
              <p className="text-center text-[12px] text-[#a29d95]">
                맥락은 기록한 사람만 볼 수 있어요
              </p>
              {/* 시안의 점선 카드 자리 = **내 기록으로 담기**(418 코멘트 3의 5번).
                  새 흐름이 아니라 142의 저장(POST /records)과 SAVE 이벤트 큐잉을 그대로 쓴다.
                  ⚠️ feedRequestId/feedPosition은 Feed 경유 진입에서만 채워져 넘어온다 — 책장·직접
                  진입에서는 undefined라 SAVE 이벤트가 붙지 않는다(RecordSaveButton의 기존 가드). */}
              <RecordSaveButton
                variant="slot"
                place={currentRecord.place}
                collectionId={collectionId}
                feedRequestId={feedRequestId}
                feedPosition={feedPosition}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  const shelfPanel = showShelfPanel && (
    <AuthorShelfPanel
      collectionId={collectionId}
      onSelectCollection={() => setIsShelfOpen(false)}
    />
  );

  return (
    <SpreadFrame wide={showShelfPanel}>
      {/* 책장은 왼쪽, 책은 오른쪽이다 — 인덱스 레일이 책 오른쪽 가장자리에 붙어 있어서, 책이
          왼쪽이면 레일과 책장이 가운데서 맞부딪힌다(332 확정). */}
      {shelfPanel && (
        // 실렌더 확인: 이 패널을 셸의 어두운 스크림 위에 그냥 올려 두면 글자가 읽히지 않고
        // 책 옆에 떠 있는 미아처럼 보였다. 책과 같은 종이 위에 얹어 "책상에 함께 놓인 작은
        // 책꽂이"로 만든다.
        <aside className="hidden w-[300px] flex-none rounded-[14px] bg-[#faf7f6] p-5 shadow-[0_20px_44px_-24px_rgba(60,54,48,0.5)] lg:block xl:w-[340px]">
          {shelfPanel}
        </aside>
      )}

      <div className="flex min-w-0 flex-1 items-start">
        <div className="min-w-0 flex-1">
          <CollectionSpreadPage
            onClose={onClose}
            left={leftPage}
            right={rightPage}
            onPrevious={handlePrevious}
            onNext={handleNext}
            // 418-39: 목차가 첫 장이라 목차에서는 더 앞이 없고, 첫 record에서는 목차로 되돌아간다.
            canGoPrevious={!isTocOpen}
            canGoNext={isTocOpen ? flatRecords.length > 0 : canGoNext}
            footer={
              flatRecords.length > 0 &&
              (isTocOpen ? (
                <span className="text-[13px] font-extrabold text-[#2c2a28]">목차</span>
              ) : (
                <>
                  <span className="text-[13px] font-extrabold text-[#2c2a28]">
                    {currentIndex + 1}
                  </span>
                  {' / '}
                  {flatRecords.length}
                  {isLoadingAllPlaces ? '+' : ''}
                </>
              ))
            }
          />
        </div>

        {flatRecords.length > 0 && (
          <CollectionIndexRail
            records={flatRecords}
            activeIndex={currentIndex}
            isTocActive={isTocOpen}
            disabled={isRecordDeleteConfirmOpen}
            onSelect={handleSelectIndex}
            onSelectToc={() => setIsTocOpen(true)}
          />
        )}
      </div>

      {/* lg 미만: 책장을 서랍으로 연다. 진입점은 화면 왼쪽 아래에 고정한 작은 손잡이다. */}
      {shelfPanel && (
        <>
          <button
            type="button"
            onClick={() => setIsShelfOpen(true)}
            className="fixed bottom-5 left-5 z-30 rounded-full bg-white/90 px-4 py-2 text-[12px] font-bold text-[#2c2a28] shadow-[0_10px_24px_-12px_rgba(60,54,48,0.5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4f9b78] lg:hidden"
          >
            다른 컬렉션
          </button>
          {isShelfOpen && (
            <div
              className="fixed inset-0 z-30 bg-[#3a332c]/25 lg:hidden"
              onClick={() => setIsShelfOpen(false)}
              role="presentation"
            />
          )}
          <div
            aria-hidden={!isShelfOpen}
            className={`fixed inset-y-0 left-0 z-30 flex w-[340px] max-w-[88vw] flex-col gap-3 bg-[#faf7f6] p-5 shadow-[20px_0_50px_-20px_rgba(60,54,48,0.4)] transition-transform duration-300 ease-out lg:hidden ${
              isShelfOpen ? 'translate-x-0' : 'pointer-events-none -translate-x-full'
            }`}
          >
            <button
              type="button"
              onClick={() => setIsShelfOpen(false)}
              className={`${QUIET_ACTION_CLASS} self-end`}
            >
              닫기
            </button>
            <div className="min-h-0 flex-1">{shelfPanel}</div>
          </div>
        </>
      )}

      {/* 마지막 Context 삭제(409) 확인 모달. currentRecord는 이 컴포넌트가 관리하는 스프레드 상태의
          파생값이라 여기서 recordId를 직접 넘긴다 — 위 네비게이션 가드가 열려 있는 동안 currentRecord를
          고정하므로 recordId는 항상 confirm 대상과 일치한다. */}
      {ownedByMe && currentRecord && <DeleteConfirmDialog recordId={currentRecord.recordId} />}
      {addRecordDialog}
    </SpreadFrame>
  );
}
