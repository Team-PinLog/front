import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { PlaceRecordSheetProvider } from '@/contexts/PlaceRecordSheetProvider';
import { PlaceRecordSheet } from '@/features/records/components/PlaceRecordSheet';
import { RecordDetailOverlay } from '@/features/records/components/RecordDetailOverlay';
import { useSearchRecordsMutation } from '@/features/search/hooks/useSearchRecordsMutation';
import { SmartSearchPanel } from '@/features/home/components/SmartSearchPanel';
import { HomeMapSection } from '@/features/home/components/HomeMapSection';
import { SearchResultGallery } from '@/features/home/components/SearchResultGallery';
import { PAGE_CONTAINER_CLASS } from '@/shared/lib/shelfCabinetLayout';

/**
 * 홈 화면: 스마트 검색(149)과 지도(150)를 하나의 화면에서 상호 배타적으로 전환한다.
 * 근거: Jira S15P11A705-165. 검색 mutation은 SmartSearchPanel·SearchResultGallery 형제
 * 컴포넌트가 같은 상태를 공유해야 해서 여기서 한 번만 호출해 나눠 내려준다.
 * 지도 마커 클릭 시 /records/$recordId로 이동하는 대신 RecordDetailOverlay를 연다
 * (Jira S15P11A705-166). openRecordId는 SearchResultGallery 카드 클릭과 동일한 상태를 공유한다.
 * 306: 우측 하단 고정 FAB(구 AddPlaceRecordButton)는 제거했다 — 첨부 디자인 이미지 기준으로
 * "+장소추가" 버튼이 SmartSearchPanel 히어로 안으로 옮겨갔고(usePlaceRecordSheet().open 재사용),
 * 같은 진입점을 화면에 중복 노출할 이유가 없다.
 */
export function HomePage() {
  const navigate = useNavigate();
  const searchMutation = useSearchRecordsMutation();
  const [openRecordId, setOpenRecordId] = useState<number | null>(null);

  const hasResults = searchMutation.isSuccess && searchMutation.data.items.length > 0;
  // mockup의 homeSearchNoResults(검색은 했지만 0건)에 대응한다 — idle·pending·error와 달리
  // 지도 위에 "원하는 장소를 찾아보세요" 안내를 함께 보여준다(mockup 1058~1060행).
  const hasNoResults = searchMutation.isSuccess && searchMutation.data.items.length === 0;

  return (
    <PlaceRecordSheetProvider>
      <main className={`${PAGE_CONTAINER_CLASS} flex flex-col gap-6 py-8`}>
        <SmartSearchPanel
          onSubmit={(query) => searchMutation.mutate(query)}
          isPending={searchMutation.isPending}
        />

        {hasResults ? (
          <SearchResultGallery items={searchMutation.data.items} onSelectRecord={setOpenRecordId} />
        ) : (
          <>
            {hasNoResults && (
              <p className="flex items-center justify-center gap-2.5 text-center text-[13px] text-ink-gray">
                원하는 장소를 찾아보세요.
                <button
                  type="button"
                  onClick={() => void navigate({ to: '/feed' })}
                  className="font-bold text-log-mint underline"
                >
                  탐색 탭으로 이동 →
                </button>
              </p>
            )}
            <HomeMapSection onMarkerClick={setOpenRecordId} />
          </>
        )}
      </main>

      <PlaceRecordSheet />

      {openRecordId !== null && (
        <RecordDetailOverlay recordId={openRecordId} onClose={() => setOpenRecordId(null)} />
      )}
    </PlaceRecordSheetProvider>
  );
}
