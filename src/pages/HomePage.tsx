import { useCallback, useMemo, useState } from 'react';
import { PlaceRecordSheetProvider } from '@/contexts/PlaceRecordSheetProvider';
import { PlaceRecordSheet } from '@/features/records/components/PlaceRecordSheet';
import { RecordDetailOverlay } from '@/features/records/components/RecordDetailOverlay';
import { useSearchRecordsMutation } from '@/features/search/hooks/useSearchRecordsMutation';
import { useRecordMapMarkersQuery } from '@/features/map/hooks/useRecordMapMarkersQuery';
import { HomeMapSection } from '@/features/home/components/HomeMapSection';
import { SearchResultGallery } from '@/features/home/components/SearchResultGallery';
import { PaperApertureStage } from '@/features/home/components/PaperApertureStage';
import { HomeSearchDock } from '@/features/home/components/HomeSearchDock';
import {
  HomeLeftType,
  HomeRightType,
  HomeTopType,
  HomeTopmark,
} from '@/features/home/components/HomeSheetPanels';
import { computeOpen, MAP_TOP_OBSTRUCTION_PX } from '@/features/home/lib/paperAperture';
import { PaperCornerNav } from '@/shared/ui/PaperCornerNav';

/**
 * 홈 화면 — "종이에 오려낸 창".
 *
 * 종이 네 판이 물러나며 지도를 드러내고, 그 개방률(--open)은 **검색어 길이**에서 나온다.
 * 스크롤도 타이머도 시간축이 아니라 사람이 치는 속도가 시간축이라, 화려한데도 기다리는
 * 시간이 없다. 지우면 그대로 되돌아간다. 근거: 디자인 시안 home-paper-aperture.html.
 *
 * 이전 구조(제목+검색바 히어로 + backdrop-blur 마스크 오버레이)는 종이 판이 대신하므로
 * SmartSearchPanel·heroMapOverlay와 함께 걷어냈다.
 *
 * 검색 mutation은 도크와 결과 갤러리가 같은 상태를 공유해야 해서 여기서 한 번만 호출해
 * 나눠 내려준다(기존과 동일). 지도 마커 클릭·결과 카드 클릭은 라우트 이동이 아니라
 * RecordDetailOverlay를 여는 같은 로컬 상태로 모인다(Jira S15P11A705-166).
 */
export function HomePage() {
  const searchMutation = useSearchRecordsMutation();
  const [query, setQuery] = useState('');
  const [openRecordId, setOpenRecordId] = useState<number | null>(null);
  // 방금 저장한 Record. 마커 목록이 갱신되는 대로 지도가 그 좌표로 이동하고 값을 비운다.
  // 근거: Jira S15P11A705-325.
  const [savedRecordId, setSavedRecordId] = useState<number | null>(null);
  const handleSavedRecordFocused = useCallback(() => setSavedRecordId(null), []);

  // RecordMapView가 쓰는 것과 **같은 쿼리 키**라 요청이 한 번 더 나가지 않는다(캐시 공유).
  // 좌판의 대형 숫자와 하판 목록이 이 데이터를 쓴다.
  const { data: mapData } = useRecordMapMarkersQuery();
  const places = useMemo(() => mapData?.items ?? [], [mapData]);

  // 검색어를 지우면 창만 닫히는 게 아니라 **결과도 함께 되돌린다.**
  // reset()이 없으면 mutation이 isSuccess인 채로 남아, 창이 닫힌 뒤에도 결과 카드가 계속 떠 있다
  // (검색어를 비웠는데 그 검색의 결과만 화면에 남는 상태). 창의 개폐와 결과의 수명이 같은 입력에
  // 묶여 있어야 "지우면 처음으로 돌아간다"가 성립한다.
  const { reset: resetSearch } = searchMutation;
  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (!value.trim()) {
        resetSearch();
      }
    },
    [resetSearch],
  );

  const open = computeOpen(query);

  const hasResults = searchMutation.isSuccess && searchMutation.data.items.length > 0;
  const hasNoResults = searchMutation.isSuccess && searchMutation.data.items.length === 0;

  // 창이 열린 뒤 검색바 아래에 뜨는 한 줄. 결과 개수를 여기서 말하고, 결과 자체는 아래
  // 갤러리가 보여준다. items: []는 오류가 아니라 정상 응답이다(AGENTS.md 절대 금지 4).
  let status: string | null = null;
  if (searchMutation.isPending) {
    status = '찾는 중입니다…';
  } else if (searchMutation.isError) {
    status = '검색하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  } else if (hasResults) {
    status = `${searchMutation.data.items.length}곳을 찾았습니다`;
  } else if (hasNoResults) {
    status = '그 문장으로는 아직 찾지 못했습니다. 다르게 적어 보세요.';
  }

  return (
    <PlaceRecordSheetProvider>
      {/* 다른 화면과 달리 PAGE_MIN_HEIGHT_CLASS·PAGE_INSET_CLASS를 쓰지 않는다 — 그 상수들은
          페이지가 사방에 여백을 둔다는 전제인데, 이 종이는 화면을 가장자리까지 채워야 한다.
          셸 <main>의 content box 높이가 정확히 100dvh라(h-[100dvh] flex 열의 flex-1, 여백 없음)
          h-full이면 그대로 들어맞는다. */}
      <main className="relative h-full">
        <PaperApertureStage
          open={open}
          top={<HomeTopType />}
          left={<HomeLeftType places={places} onSelectRecord={setOpenRecordId} />}
          right={<HomeRightType />}
          topmark={<HomeTopmark />}
          dock={
            <HomeSearchDock
              query={query}
              onQueryChange={handleQueryChange}
              onSubmit={(value) => searchMutation.mutate(value)}
              isPending={searchMutation.isPending}
              status={status}
            />
          }
        >
          {/* 창 아래로 흐르는 층. isolate는 카카오 SDK 내부 z-index가 종이 위로 새지
              않게 가둔다 — 이 경계가 없으면 지도 타일이 종이를 덮는다(S15P11A705-307). */}
          <div className="isolate absolute inset-0">
            <HomeMapSection
              onMarkerClick={setOpenRecordId}
              topObstructionPx={MAP_TOP_OBSTRUCTION_PX}
              focusRecordId={savedRecordId}
              onFocusRecordHandled={handleSavedRecordFocused}
            />
          </div>

          {hasResults && (
            <div className="pl-results">
              <SearchResultGallery
                items={searchMutation.data.items}
                onSelectRecord={setOpenRecordId}
              />
            </div>
          )}
        </PaperApertureStage>

        {/* 지면 오른쪽 어깨. 네비게이션 바를 지운 뒤 이 화면에서 설정(계정·로그아웃·탈퇴)으로
            가는 유일한 길이고, 우측 곁열이 사라지는 좁은 폭에서는 화면 이동도 여기서 맡는다
            (index.css .paper-corner-nav--rails — 넓은 폭에서는 표지 두 권이 하므로 링크만 접힌다).
            무대(.pl-stage) 바깥에 두는 이유: 그쪽은 overflow:hidden에 종이 판이 쓸려 나가는
            자리라, 항상 제자리에 있어야 하는 이 줄이 개폐에 휩쓸리면 안 된다. */}
        <PaperCornerNav
          className="paper-corner-nav--rails absolute right-6 top-6 z-30"
          items={[
            { to: '/feed', label: '탐색' },
            { to: '/library', label: '책장' },
          ]}
        />
      </main>

      <PlaceRecordSheet onRecordSaved={setSavedRecordId} />

      {openRecordId !== null && (
        <RecordDetailOverlay recordId={openRecordId} onClose={() => setOpenRecordId(null)} />
      )}
    </PlaceRecordSheetProvider>
  );
}
