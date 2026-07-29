import { PlaceRecordSheetProvider } from '@/contexts/PlaceRecordSheetProvider';
import { usePlaceRecordSheet } from '@/contexts/usePlaceRecordSheet';
import { PlaceRecordSheet } from '@/features/records/components/PlaceRecordSheet';

// 홈 화면 전체 레이아웃(목업 지도·서가 등)은 별도 티켓 대상. 여기서는 Place 검색·선택 시트(S15P11A705-136) 진입점만 연결한다.
function AddPlaceRecordButton() {
  const sheet = usePlaceRecordSheet();
  return (
    <button
      type="button"
      onClick={sheet.open}
      className="rounded-full bg-pin-navy px-5 py-3 text-sm font-bold text-white"
    >
      + 장소 기록
    </button>
  );
}

export function HomePage() {
  return (
    <PlaceRecordSheetProvider>
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper-white">
        <p className="text-lg font-bold text-pin-navy">PinLog</p>
        <AddPlaceRecordButton />
      </main>
      <PlaceRecordSheet />
    </PlaceRecordSheetProvider>
  );
}
