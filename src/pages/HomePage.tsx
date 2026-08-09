import { useCallback, useMemo, useState } from 'react';
import { PlaceRecordSheetProvider } from '@/contexts/PlaceRecordSheetProvider';
import { PlaceRecordSheet } from '@/features/records/components/PlaceRecordSheet';
import { RecordDetailOverlay } from '@/features/records/components/RecordDetailOverlay';
import { useSearchRecordsMutation } from '@/features/search/hooks/useSearchRecordsMutation';
import { useRecordMapMarkersQuery } from '@/features/map/hooks/useRecordMapMarkersQuery';
import { HomeMapSection } from '@/features/home/components/HomeMapSection';
import {
  SearchEmptyModal,
  SearchResultGallery,
} from '@/features/home/components/SearchResultGallery';
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
 * 이전 구조(제목+검색바 히어로 + backdrop-blur 마스크 오버레이 + 지도 포스터 + 최근 카드 스택 +
 * 지역 뷰 토글)는 종이 판·메모지·표지가 대신하므로 이 화면에서 전부 걷어냈다.
 * ⚠️ 그 자산 파일들(SmartSearchPanel·heroMapOverlay·deskPoster·RecentRecordCardStack·regionView)은
 * **지우지 않았다.** 참조만 끊긴 상태이고 정리는 후속 티켓이 한다(S15P11A705-410 보고).
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
  // hasNoResults일 때는 이 줄을 채우지 않는다 — S15P11A705-426으로 SearchEmptyModal이
  // 화면 중앙에서 같은 안내를 맡았고, 도크 아래 한 줄과 모달 표제가 동시에 뜨면 같은
  // "결과 없음"을 두 자리에서 중복 전달한다(실렌더로 확인). 모달이 포커스를 가져가며
  // 내용을 설명하므로 이 줄은 비운다.
  let status: string | null = null;
  if (searchMutation.isPending) {
    status = '찾는 중입니다…';
  } else if (searchMutation.isError) {
    status = '검색하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  } else if (hasResults) {
    status = `${searchMutation.data.items.length}곳을 찾았습니다`;
  }

  return (
    <PlaceRecordSheetProvider>
      {/* 다른 화면과 달리 PAGE_MIN_HEIGHT_CLASS를 쓰지 않는다 — 그 상수는 "뷰포트에서 셸 크롬을
          뺀 최소 높이"를 min-h로 잡는 값이라 내용이 넘치면 그만큼 자라는데, 이 종이는 자라면 안
          된다(무대가 absolute inset:0이라 늘어난 만큼 창의 비율이 무너진다).
          h-full로 셸 <main>의 content box 높이를 **그대로** 받는다. 그쪽이 h-[100dvh] flex 열의
          flex-1 + min-h-0이라 높이가 확정돼 있어 %가 해석된다(AppLayout 359 주석).

          414: 셸 <main>의 padding이 전부 사라져(좌측 네비 예약 5.5/16.5rem + 364의 사방 여백)
          이제 이 무대가 **화면 가장자리까지** 간다 — 원본(design-ver2)의 전제와 같아졌다.
          410에서 여백 안쪽에 앉아 있던 것을 음수 마진으로 상쇄하지 않고 미뤄 둔 이유가 이것이다:
          상쇄하면 그때까지 살아 있던 네비 카드 뒤로 종이가 들어가 무대 왼쪽이 통째로 가렸다.
          셸에서 여백을 걷는 쪽이 옳은 수정이었다. */}
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
            {/* dev의 HomeMapSection은 design-ver2보다 prop이 넓다(371 강조·377 선택 핀·377 우측
                페이드·394 좌측 가림). 그 화면 요소들이 이 구조에서 사라졌으므로 값도 그에 맞춘다:
                · highlightRecordId — 최근 기록 카드 스택이 없어져 "앞장"이라는 사실 자체가 없다.
                · selectedRecordId — 상세 오버레이는 그대로 있으므로 유지한다. 열려 있는 기록의
                  핀만 또렷해지는 377 동작이 종이 창 안에서도 그대로 맞는다.
                · rightFadePx — 우측 곁열은 종이 판이 아니라 지도 위에 놓인 책이라, 지도를 그
                  자리에서 지우면 책이 빈 종이 위에 뜬다. 넘기지 않아 페이드가 없다.
                · leftObstructionEdgeXPx — 414에서 네비 카드 자체가 사라져 지도를 가리는 크롬이
                  없다(appChrome.ts getNavCardRightEdgePx도 항상 0이다). 넘기면 있지도 않은 가림을
                  피해 지도가 오른쪽으로 치우친다. */}
            <HomeMapSection
              onMarkerClick={setOpenRecordId}
              topObstructionPx={MAP_TOP_OBSTRUCTION_PX}
              focusRecordId={savedRecordId}
              onFocusRecordHandled={handleSavedRecordFocused}
              highlightRecordId={null}
              selectedRecordId={openRecordId}
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

          <SearchEmptyModal
            isOpen={hasNoResults}
            query={query}
            onClose={resetSearch}
            onRetry={resetSearch}
          />
        </PaperApertureStage>

        {/* 지면 오른쪽 어깨. 이 화면에서 설정(계정·로그아웃·탈퇴)으로 가는 종이 쪽 진입점이고,
            우측 곁열이 사라지는 좁은 폭에서는 화면 이동도 여기서 맡는다
            (index.css .paper-corner-nav--rails — 넓은 폭에서는 표지 두 권이 하므로 링크만 접힌다).
            무대(.pl-stage) 바깥에 두는 이유: 그쪽은 overflow:hidden에 종이 판이 쓸려 나가는
            자리라, 항상 제자리에 있어야 하는 이 줄이 개폐에 휩쓸리면 안 된다.

            414: 셸의 네비 카드가 사라져 이 줄이 md 이상에서 **유일한 길**이 됐다(sm은 하단 탭바가
            함께 남아 있다). 그래서 탐색·책장도 같은 부품을 자기 화면에 마운트한다.
            같은 티켓에서 <main>의 좌측 예약 폭이 0이 되어 무대 컨테이너 폭 = 뷰포트 폭이 됐으므로,
            .paper-corner-nav--rails의 접힘 경계(뷰포트 1081px)와 곁열이 사라지는 경계(컨테이너
            1080px)가 이제 같은 지점을 가리킨다 — 410에서 관찰한 "둘 다 없는 구간"이 사라졌다. */}
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
