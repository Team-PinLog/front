import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { PlaceRecordSheetProvider } from '@/contexts/PlaceRecordSheetProvider';
import { usePlaceRecordSheet } from '@/contexts/usePlaceRecordSheet';
import { PlaceRecordSheet } from '@/features/records/components/PlaceRecordSheet';
import { RecordDetailOverlay } from '@/features/records/components/RecordDetailOverlay';
import { useSearchRecordsMutation } from '@/features/search/hooks/useSearchRecordsMutation';
import { SmartSearchPanel } from '@/features/home/components/SmartSearchPanel';
import { HomeMapSection } from '@/features/home/components/HomeMapSection';
import { SearchResultGallery } from '@/features/home/components/SearchResultGallery';

// 136: Place 검색·선택 시트 진입점. 목업 홈의 우측 하단 원형 FAB 위치로 옮겼다(기능은 그대로).
function AddPlaceRecordButton() {
  const sheet = usePlaceRecordSheet();
  return (
    <button
      type="button"
      onClick={sheet.open}
      aria-label="장소 기록 추가"
      title="장소 기록 추가"
      className="fixed bottom-8 right-8 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-pin-navy text-2xl font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
    >
      +
    </button>
  );
}

/**
 * 홈 화면: 스마트 검색(149)과 지도(150)를 하나의 화면에서 상호 배타적으로 전환한다.
 * 근거: Jira S15P11A705-165. 검색 mutation은 SearchPage.tsx(149)와 동일하게 여기서 한 번만
 * 호출해 SmartSearchPanel·SearchResultGallery 형제 컴포넌트에 나눠 내려준다.
 * 지도 마커 클릭 시 /records/$recordId로 이동하는 대신 RecordDetailOverlay를 연다
 * (Jira S15P11A705-166). openRecordId는 SearchResultGallery 카드 클릭과 동일한 상태를 공유한다.
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
      <main className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
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

      <AddPlaceRecordButton />
      <PlaceRecordSheet />

      {openRecordId !== null && (
        <RecordDetailOverlay recordId={openRecordId} onClose={() => setOpenRecordId(null)} />
      )}
    </PlaceRecordSheetProvider>
  );
}
