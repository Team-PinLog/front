import { useEffect, useState, type ReactNode } from 'react';
import { useEditCollectionTitle } from '@/contexts/useEditCollectionTitle';
import { useCollectionDeleteConfirm } from '@/contexts/useCollectionDeleteConfirm';
import { useCollectionSpread } from '@/contexts/useCollectionSpread';
import { useDeleteConfirm } from '@/contexts/useDeleteConfirm';
import { ErrorState } from '@/shared/ui/ErrorState';
import { ShelfExploreSection } from '@/features/feed/components/ShelfExploreSection';
import { ContextCard } from '@/features/records/components/ContextCard';
import { DeleteConfirmDialog } from '@/features/records/components/DeleteConfirmDialog';
import { useCollectionDetailQuery } from '../hooks/useCollectionDetailQuery';
import { AddRecordToCollectionDialog } from './AddRecordToCollectionDialog';
import { CollectionSpreadMap } from './CollectionSpreadMap';
import { RecordRemoveButton } from './RecordRemoveButton';
import { RecordSaveButton } from './RecordSaveButton';

interface CollectionDetailViewProps {
  collectionId: number;
  // Feed(142) 경유 진입일 때만 채워진다 — 그 외 진입(내 책장·직접 URL 등)은 undefined다(하위 호환).
  feedRequestId?: string;
  feedPosition?: number;
}

// 스프레드 전환 시 내용이 바로 뒤바뀌지 않고 살짝 페이드인하도록 하는 래퍼. 목업의 모바일 전용
// corner-flip 애니메이션은 가져오지 않고, Tailwind transition 유틸 수준으로만 처리한다(171 지시사항 7).
function SpreadFadeIn({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className={`transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {children}
    </div>
  );
}

/**
 * Collection 상세: 펼친 책(플립북) 스타일. 근거: Jira S15P11A705-171, 목업 book-spread/openBook(UI만 참고).
 * 스프레드 하나 = record 하나. 왼쪽 페이지는 로드된 모든 record 위치를 지도에 고정 표시하고 현재 record만
 * 강조하며(CollectionSpreadMap), 오른쪽 페이지는 그 record의 place·keywords·(ownedByMe면) Context를 보여준다.
 * ownedByMe로 소유자/타인을 구분한다(privacy-rules.md 1장) — 타인 조회는 contexts가 null이라 렌더링하지 않는다.
 */
export function CollectionDetailView({
  collectionId,
  feedRequestId,
  feedPosition,
}: CollectionDetailViewProps) {
  const detailQuery = useCollectionDetailQuery(collectionId);
  const editTitleState = useEditCollectionTitle();
  const collectionDeleteConfirm = useCollectionDeleteConfirm();
  const spreadState = useCollectionSpread();
  // Record의 마지막 Context 삭제 확인(409) 상태. 스프레드 네비게이션과 레이스가 나지 않도록
  // 이 상태가 열려 있는 동안은 다음/이전 이동을 막는다(아래 handleNext/handlePrevious, 203 논의).
  const recordDeleteConfirm = useDeleteConfirm();
  // 217: "내 레코드 추가" 다이얼로그 open 상태. AddToCollectionDialog(216)와 달리 이 화면에서만 열리므로
  // 전역 Context 없이 로컬 state로 둔다(NewCollectionModal과 동일 패턴).
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);

  // 진입 시 hasNextPage가 false가 될 때까지 자동으로 순차 로드한다 — 왼쪽 지도가 Collection의 모든 record를
  // 한 번에 보여줘야 하기 때문이다(넘길 때마다 핀이 하나씩 느는 방식이 아님). 사용자 조작(다음 버튼)과
  // 무관하게 백그라운드에서 진행되고, 우측 페이지 넘김은 이미 로드된 record 안에서 로컬 인덱스 이동만
  // 한다(아래 handleNext/handlePrevious). isFetchNextPageError면 더 재시도하지 않고 로드된 만큼만 쓴다.
  // detailQuery 전체가 아니라 실제로 쓰는 필드만 분해해 의존성으로 둔다 — detailQuery는 매 렌더 새
  // 객체라 통째로 deps에 넣으면 매번 effect가 도는 것과 다르지 않다(react-hooks/exhaustive-deps 대응).
  const { data, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } =
    detailQuery;
  useEffect(() => {
    if (data && hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [data, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  if (detailQuery.isPending) {
    return <p className="p-8 text-sm text-ink-gray">불러오는 중…</p>;
  }

  if (detailQuery.isError) {
    // 08_API_명세: 존재하지 않거나 비공개인 Collection은 404 RESOURCE_NOT_FOUND로 응답한다(소유 여부 은닉).
    const isNotFound = detailQuery.error.code === 'RESOURCE_NOT_FOUND';
    return (
      <div className="p-8">
        <ErrorState
          title={isNotFound ? '컬렉션을 찾을 수 없어요' : '컬렉션을 불러오지 못했어요'}
          description={
            isNotFound ? '삭제되었거나 접근할 수 없는 컬렉션이에요.' : '잠시 후 다시 시도해 주세요.'
          }
        />
      </div>
    );
  }

  const pages = detailQuery.data.pages;
  const { title, ownedByMe } = pages[0];
  // pages를 flatMap해 하나의 목록으로만 쓰지 않는다(레코드 목록 렌더링 용도가 아니라, 지도 마커 전체 목록과
  // 순서 있는 인덱싱 용도다). 전체 로드는 위 useEffect가 자동으로 끝내므로, 여기서는 로드 완료 여부만
  // 판단한다(isLoadingAllPlaces) — hasNext 기반으로 다음 페이지를 직접 요청하는 로직은 없다.
  const flatRecords = pages.flatMap((page) => page.records.items);
  const isLoadingAllPlaces = detailQuery.hasNextPage && !detailQuery.isFetchNextPageError;
  // 217: 전체 로드가 끝나기 전에는 이 목록이 불완전해 "이미 담김" 필터링을 신뢰할 수 없다 —
  // 그동안은 아래 titleHeader의 "레코드 추가" 버튼 자체를 막는다(isLoadingAllPlaces).
  const excludedRecordIds = new Set(flatRecords.map((record) => record.recordId));

  const titleHeader = (
    <header className="flex items-center justify-between gap-4 rounded-2xl bg-pin-navy px-6 py-5">
      <h1 className="text-xl font-extrabold text-paper-white">{title}</h1>

      {ownedByMe && (
        <div className="flex flex-none gap-2">
          <button
            type="button"
            onClick={() => setIsAddRecordOpen(true)}
            disabled={isLoadingAllPlaces}
            className="h-9 rounded-lg border border-paper-white/30 px-3 text-xs font-bold text-paper-white disabled:opacity-40"
          >
            {isLoadingAllPlaces ? '목록 불러오는 중…' : '레코드 추가'}
          </button>
          <button
            type="button"
            onClick={editTitleState.open}
            className="h-9 rounded-lg border border-paper-white/30 px-3 text-xs font-bold text-paper-white"
          >
            제목 수정
          </button>
          <button
            type="button"
            onClick={() => collectionDeleteConfirm.open('direct')}
            className="h-9 rounded-lg border border-red-400/50 px-3 text-xs font-bold text-red-300"
          >
            삭제
          </button>
        </div>
      )}
    </header>
  );

  const addRecordDialog = ownedByMe && (
    <AddRecordToCollectionDialog
      collectionId={collectionId}
      excludedRecordIds={excludedRecordIds}
      isOpen={isAddRecordOpen}
      onClose={() => setIsAddRecordOpen(false)}
    />
  );

  if (flatRecords.length === 0) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
        {titleHeader}
        <p className="rounded-2xl border border-line-card bg-white p-8 text-center text-sm text-ink-gray">
          아직 담긴 기록이 없어요.
        </p>
        {!ownedByMe && <ShelfExploreSection collectionId={collectionId} />}
        {addRecordDialog}
      </main>
    );
  }

  const currentIndex = spreadState.spreadIndex;
  const currentRecord = flatRecords[currentIndex];
  // 전체 자동 로드(위 useEffect)가 서버 페이지네이션을 전담하므로, 여기서는 이미 로드된 record 범위
  // 안에서만 이동한다 — 서버 요청은 발생하지 않는다. 아직 로드 중인 다음 record는 배경에서 도착하는
  // 대로 flatRecords가 늘어나 자동으로 다음 버튼이 활성화된다.
  const canGoNext = currentIndex < flatRecords.length - 1;
  const canGoPrevious = currentIndex > 0;

  // Record 강제 삭제 확인(409) 모달이 열려 있는 동안 스프레드를 넘기면 confirm 상태(targetContextId·impact)는
  // 이전 record 것인데 DeleteConfirmDialog에 넘기는 recordId는 새 record 것이 되는 레이스가 생긴다
  // (203 논의). 확인/취소로 닫히기 전까지 이동 자체를 막아 차단한다.
  const isRecordDeleteConfirmOpen = recordDeleteConfirm.isOpen;

  const handleNext = () => {
    if (canGoNext && !isRecordDeleteConfirmOpen) {
      spreadState.goToNext();
    }
  };

  const handlePrevious = () => {
    if (canGoPrevious && !isRecordDeleteConfirmOpen) {
      spreadState.goToPrevious();
    }
  };

  const mapPlaces = flatRecords.map((record) => ({
    recordId: record.recordId,
    name: record.place.name,
    lat: record.place.lat,
    lng: record.place.lng,
  }));

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      {titleHeader}

      <div className="relative flex flex-col overflow-hidden rounded-2xl border border-line-card bg-paper-white shadow-lg md:h-[520px] md:flex-row md:divide-x md:divide-line-card">
        <div className="h-72 flex-none p-4 md:h-auto md:flex-1 md:p-6">
          {/* 전체 로드가 끝나기 전에는 마커를 하나도 그리지 않고 로딩 표시만 한다(가벼운 표시, 화면
              전체를 막지 않음) — 넘길 때마다 핀이 하나씩 느는 방식을 피하기 위함. */}
          <CollectionSpreadMap
            places={isLoadingAllPlaces ? [] : mapPlaces}
            activeRecordId={currentRecord.recordId}
            isLoadingAll={isLoadingAllPlaces}
          />
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          <SpreadFadeIn key={currentRecord.recordId}>
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-bold text-pin-navy">{currentRecord.place.name}</p>
                  <p className="text-xs font-semibold text-log-mint">
                    {currentRecord.place.address}
                  </p>
                </div>
                {ownedByMe ? (
                  <RecordRemoveButton
                    collectionId={collectionId}
                    recordId={currentRecord.recordId}
                  />
                ) : (
                  <RecordSaveButton
                    place={currentRecord.place}
                    collectionId={collectionId}
                    feedRequestId={feedRequestId}
                    feedPosition={feedPosition}
                  />
                )}
              </div>

              {currentRecord.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {currentRecord.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full bg-log-mint/10 px-3 py-1.5 text-xs font-bold text-log-mint"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              )}

              {/* contexts는 ownedByMe일 때만 배열이고 타인 조회는 null이다(privacy-rules.md 1장) — null이면
                  이 영역 자체를 렌더하지 않는다(런타임 접근도 하지 않는다). */}
              {ownedByMe && currentRecord.contexts && (
                <div className="flex flex-col gap-3">
                  {currentRecord.contexts.length === 0 ? (
                    <p className="text-xs text-ink-gray-light">아직 기록된 맥락이 없어요.</p>
                  ) : (
                    currentRecord.contexts.map((context) => (
                      <ContextCard
                        key={context.contextId}
                        recordId={currentRecord.recordId}
                        context={context}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </SpreadFadeIn>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={!canGoPrevious || isRecordDeleteConfirmOpen}
          className="h-10 rounded-lg border border-pin-navy/15 px-4 text-sm font-bold text-pin-navy disabled:opacity-40"
        >
          ‹ 이전
        </button>
        <p className="text-xs font-semibold text-ink-gray">
          {currentIndex + 1} / {flatRecords.length}
          {isLoadingAllPlaces ? '+' : ''}
        </p>
        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext || isRecordDeleteConfirmOpen}
          className="h-10 rounded-lg border border-pin-navy/15 px-4 text-sm font-bold text-pin-navy disabled:opacity-40"
        >
          다음 ›
        </button>
      </div>

      {/* 타인 Collection에서만 책장 탐색·Follow를 노출한다(143) — 자기 자신 책장 탐색은 대상이 아니다. */}
      {!ownedByMe && <ShelfExploreSection collectionId={collectionId} />}

      {/* 마지막 Context 삭제(409) 확인 모달. currentRecord는 이 컴포넌트가 관리하는 스프레드 상태의
          파생값이라 여기서 recordId를 직접 넘긴다 — 페이지(CollectionDetailPage)까지 끌어올리려면
          currentRecord를 새 전역 상태로 만들어야 해서(203 지시사항) 하지 않았다. 위 네비게이션 가드가
          열려 있는 동안 currentRecord 자체를 고정하므로 recordId는 항상 confirm 대상과 일치한다. */}
      {ownedByMe && <DeleteConfirmDialog recordId={currentRecord.recordId} />}
      {addRecordDialog}
    </main>
  );
}
