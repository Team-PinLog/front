import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { PlaceRecordSheetProvider } from '@/contexts/PlaceRecordSheetProvider';
import { PlaceRecordSheet } from '@/features/records/components/PlaceRecordSheet';
import { RecordDetailOverlay } from '@/features/records/components/RecordDetailOverlay';
import { useSearchRecordsMutation } from '@/features/search/hooks/useSearchRecordsMutation';
import { SmartSearchPanel } from '@/features/home/components/SmartSearchPanel';
import { HomeMapSection } from '@/features/home/components/HomeMapSection';
import { SearchResultGallery } from '@/features/home/components/SearchResultGallery';
import { RecentRecordCardStack } from '@/features/home/components/RecentRecordCardStack';
import { useRecentRecordsQuery } from '@/features/records/hooks/useRecentRecordsQuery';
import {
  HERO_MAP_FADE_MASK,
  HERO_OVERLAY_HEIGHT_CLASS,
  HERO_OVERLAY_OPAQUE_PX,
} from '@/features/home/lib/heroMapOverlay';
import { PAGE_CONTAINER_CLASS, PAGE_MIN_HEIGHT_CLASS } from '@/shared/lib/shelfCabinetLayout';

/**
 * 377 정정: 지도 오른쪽 끝을 배경으로 스며들게 하는 마스크. 잘린 단면이 그대로 드러나면 지도가
 * "잘렸다"로 읽히는데, 여기서 필요한 것은 "지도가 여기까지고 그 너머는 배경"이라는 인상이다.
 * 값은 취향 조정 지점이다 — 더 부드럽게 하려면 6rem을 키운다.
 */
const MAP_RIGHT_FADE_MASK = 'linear-gradient(to right, black calc(100% - 6rem), transparent 100%)';

// 376(지역 뷰) — 롤백 지점 ①/②. 이 lazy import와 아래 토글 블록, 그리고
// src/features/home/regionView/ 폴더가 이 기능의 전부다(자세한 안내는 RegionViewPanel 주석).
// lazy인 이유는 코드 분할이다 — 경계 데이터(약 64KB)와 지역 뷰 코드가 별도 청크로 빠져, 기본값인
// 기존 지도만 쓰는 사용자는 내려받지 않는다.
const RegionViewPanel = lazy(() =>
  import('@/features/home/regionView/RegionViewPanel').then((module) => ({
    default: module.RegionViewPanel,
  })),
);

/**
 * 홈 화면: 스마트 검색(149)과 지도(150)를 한 화면에서 함께 보여준다.
 * 근거: Jira S15P11A705-165. 검색 mutation은 SmartSearchPanel·SearchResultGallery 형제
 * 컴포넌트가 같은 상태를 공유해야 해서 여기서 한 번만 호출해 나눠 내려준다.
 * 지도 마커 클릭 시 /records/$recordId로 이동하는 대신 RecordDetailOverlay를 연다
 * (Jira S15P11A705-166). openRecordId는 SearchResultGallery 카드 클릭과 동일한 상태를 공유한다.
 * 306: 우측 하단 고정 FAB(구 AddPlaceRecordButton)는 제거했다 — 첨부 디자인 이미지 기준으로
 * "+장소추가" 버튼이 SmartSearchPanel 히어로 안으로 옮겨갔고(usePlaceRecordSheet().open 재사용),
 * 같은 진입점을 화면에 중복 노출할 이유가 없다.
 * 307: 지도를 검색 결과 유무로 전환되는 카드가 아니라 페이지 전체의 배경 레이어로 바꿨다(첨부
 * 디자인 이미지 기준 — idle·검색 결과 상태 모두 지도가 배경에 항상 깔려 있다). <main>을
 * 배경(지도+그라데이션)과 컨텐츠(히어로+검색 결과/안내 문구) 두 레이어로 분리한다 — 컨텐츠 레이어만
 * PAGE_CONTAINER_CLASS(306에서 통일한 max-w-6xl 폭)를 쓰고, 배경 지도 레이어는 폭 제한 없이
 * AppLayout <main>(사이드바 제외 영역)을 꽉 채운다. min-h 값은 FeedPage.tsx와 동일하게
 * AppLayout의 sm·mdlg 고정 헤더(3.5rem)·xl 사이드바 오프셋에 맞춘 것이다.
 * SearchResultGallery(검색 결과 카드)는 이번 티켓 범위 밖이라 내부 로직·위치는 그대로 두고, 배경
 * 지도 위에 얹히는 컨텐츠 레이어 안에서 렌더 위치만 유지했다.
 */
export function HomePage() {
  const navigate = useNavigate();
  const searchMutation = useSearchRecordsMutation();
  const [openRecordId, setOpenRecordId] = useState<number | null>(null);
  // 방금 저장한 Record. 마커 목록이 갱신되는 대로 지도가 그 좌표로 이동하고 값을 비운다.
  // 근거: Jira S15P11A705-325.
  const [savedRecordId, setSavedRecordId] = useState<number | null>(null);
  // 지도 쪽 effect의 deps에 들어가므로 참조를 고정한다 — 인라인 화살표로 두면 홈이 리렌더될 때마다
  // 이동 effect가 다시 돈다.
  const handleSavedRecordFocused = useCallback(() => setSavedRecordId(null), []);

  // 371: "요즘 붙여둔 것" 카드 스택. 쿼리와 앞장 인덱스를 스택 컴포넌트가 아니라 **여기서** 들고
  // 있는 이유는, 같은 "앞장"이라는 사실을 지도(마커 강조·센터링)도 함께 봐야 하기 때문이다.
  // 스택이 상태를 들고 콜백으로 올려주는 구조로 하면 자식 → 부모 setState를 effect로 동기화해야
  // 하는데, 그건 하나의 사실을 두 벌로 만드는 일이고 첫 렌더에 한 박자 늦게 반영된다.
  const recentRecordsQuery = useRecentRecordsQuery();
  /**
   * 앞장을 **인덱스가 아니라 recordId로** 들고 있는 것이 핵심이다. 목록은 저장·삭제로 언제든 다시
   * 조회되는데, 인덱스로 들면 같은 번호가 갱신 뒤에는 다른 기록을 가리킨다. 특히 저장 직후를
   * "0번(맨 앞)"으로 고정하면 CONTEXT_ADDED(기존 Record에 맥락만 추가)에서 어긋난다 — 그 경우
   * Record의 createdAt이 갱신되지 않아 목록 맨 앞이 아니라 원래 자리에 그대로 있고, 그러면
   * 카드 앞장과 지도가 강조·이동하는 대상이 서로 다른 기록이 된다.
   *
   * null이면 "아직 고른 적 없음"이라 가장 최근 기록(0번)이 앞장이다. 목록에서 사라진 id(삭제된
   * 기록)도 자연히 0번으로 돌아가므로 인덱스를 접는 보정이 따로 필요 없다.
   */
  const [frontRecentRecordId, setFrontRecentRecordId] = useState<number | null>(null);

  // data가 null이면 엔드포인트 미구현이라 영역 자체를 그리지 않는다(useRecentRecordsQuery 주석).
  // 빈 배열(7일 내 기록 없음)과 구분되는 지점이다 — 그쪽은 스택이 빈 상태 안내를 그린다.
  const recentPage = recentRecordsQuery.data ?? null;
  // useMemo인 이유는 성능이 아니라 **참조 안정성**이다. `?? []`는 매 렌더 새 배열을 만들어, 이 값을
  // deps로 쓰는 아래 useCallback이 렌더마다 새로 만들어진다(react-hooks/exhaustive-deps 경고).
  const recentItems = useMemo(() => recentPage?.items ?? [], [recentPage]);
  const frontRecentIndex = recentItems.findIndex((item) => item.recordId === frontRecentRecordId);
  // 저장 직후에는 목록이 아직 다시 오기 전이라 findIndex가 -1이다. 그때는 최신 카드를 앞장으로
  // 두고, 재조회가 도착하면 위 id가 있는 자리로 자연스럽게 옮겨간다.
  const activeRecentIndex = frontRecentIndex >= 0 ? frontRecentIndex : 0;
  const activeRecentRecordId = recentItems[activeRecentIndex]?.recordId ?? null;

  const handleActiveRecentIndexChange = useCallback(
    (nextIndex: number) => {
      setFrontRecentRecordId(recentItems[nextIndex]?.recordId ?? null);
    },
    [recentItems],
  );

  // 저장한 기록을 앞장으로 세운다. 새 Record면 목록 맨 앞에, CONTEXT_ADDED면 원래 자리에 있는데
  // id로 따라가므로 두 경우 모두 같은 코드로 맞는다. 지도 이동은 기존 focusRecordId 경로가 담당한다.
  // 376: 기본값은 **기존 지도**다. 지역 뷰는 팀원 피드백으로 롤백될 수 있어 대체가 아니라 토글이다.
  const [isRegionView, setIsRegionView] = useState(false);

  const handleRecordSaved = useCallback((recordId: number) => {
    setSavedRecordId(recordId);
    setFrontRecentRecordId(recordId);
  }, []);

  const hasResults = searchMutation.isSuccess && searchMutation.data.items.length > 0;
  // mockup의 homeSearchNoResults(검색은 했지만 0건)에 대응한다 — idle·pending·error와 달리
  // 지도 위에 "원하는 장소를 찾아보세요" 안내를 함께 보여준다(mockup 1058~1060행).
  const hasNoResults = searchMutation.isSuccess && searchMutation.data.items.length === 0;

  return (
    <PlaceRecordSheetProvider>
      <main className={`relative ${PAGE_MIN_HEIGHT_CLASS}`}>
        {/* 배경 레이어: 사이드바를 제외한 남은 영역 전체를 풀블리드로 채우는 지도. CSS 페인트 순서상
            position:absolute 요소(z-index:auto)는 아래 일반 흐름 컨텐츠보다 항상 위에 그려지므로,
            이 레이어를 배경으로 두려면 컨텐츠 레이어 쪽에 별도로 relative+z-10을 줘 쌓임 순서를
            뒤집어야 한다(아래 컨텐츠 레이어 참고). */}
        {/* isolate는 이 배경 레이어가 어떤 z-index도 바깥으로 새게 하지 않는다는 경계다. 실제
            누출원(카카오 SDK 내부 z-index)은 RecordMapView 컨테이너에서 이미 가두지만, 아래
            오버레이가 지도 위에 보이는 것은 이 레이어 구조 자체의 전제라 여기서도 명시한다. */}
        {/* 368: `absolute inset-0`의 containing block은 AppLayout `<main>`의 **content box**라서,
            330(하단 탭바)·364(셸 사방 여백)가 넣은 padding 영역을 지도가 덮지 못하고 그 자리에
            셸 배경(bg-paper-white)이 띠처럼 드러났다. 음수 마진으로 그 padding을 **정확히 상쇄**해
            padding box까지 넓힌다(HERO_MAP_FADE_MASK 오버레이도 같은 값을 쓴다 — 아래 참고).
            ⚠️ 값은 AppLayout `<main>`의 padding 리터럴과 쌍둥이다. 한쪽만 고치면 띠가 다시 생기거나
            (모자람) 스크롤이 생긴다(넘침). 아래 두 가지가 이 값 선택의 근거다:
            ① **padding box까지만** 넓히고 그 밖으로는 절대 나가지 않는다. `<main>`은 앱의 유일한
               스크롤 영역인데(359), abspos 자손이 padding box를 넘으면 그만큼이 scrollable overflow가
               되어 sm에서 5rem짜리 헛스크롤이 생긴다. 정확히 상쇄하면 오버플로가 0이다.
            ② md 이상 왼쪽은 셸 여백(1rem/1.5rem)만 상쇄하고 **사이드바 폭은 상쇄하지 않는다.**
               지도가 불투명한 고정 사이드바 뒤로 들어가면 보이지도 않는 영역을 렌더해 지도의 시각적
               중심이 왼쪽으로 밀린다. 이렇게 두면 지도 왼쪽 끝이 사이드바 오른쪽 끝과 정확히 만나
               "사이드바를 제외한 영역을 꽉 채운다"(307)는 원래 전제가 그대로 유지된다.
            `fixed inset-0`을 쓰지 않은 이유 — 뷰포트 전체를 덮으므로 위 ②가 성립하지 않고, 스크롤
            영역 밖으로 나가 검색 결과가 길어졌을 때의 스크롤 동작도 함께 바뀐다. 지금 필요한 것은
            "padding만큼 더 넓힌다"뿐이라 레이어의 위치 방식까지 바꿀 이유가 없다. */}
        {/* 377 정정: lg 이상에서 **지도 폭을 줄이고 오른쪽 가장자리를 페이드**한다.
            이유는 "맵과 레코드가 겹쳐 보여 정신없다"는 피드백이다 — '최근의 장소' 카드는 지도에
            꽂힌 것이 아니라 **페이지 배경에** 꽂혀 있어야 한다. 카드 밑에 판을 깔아 지도를 가리는
            대신 지도 자체를 비켜 세운다(판을 깔면 배경이 하나 더 생겨 층이 늘어난다).
            - `lg:right-[22rem]`이 자리를 비우고, `lg:mr-0`이 368의 음수 오른쪽 마진을 되돌린다
              (그 마진은 지도를 padding box까지 넓히려던 것이라 여기서는 반대로 작동한다).
            - 잘린 단면이 그대로 보이면 지도가 "잘렸다"로 읽히므로, 마지막 6rem을 알파로 떨어뜨려
              배경으로 스며들게 한다. 히어로 오버레이와 같은 mask 기법이다. */}
        <div
          className="isolate absolute inset-0 mb-[calc(-5rem-env(safe-area-inset-bottom))] md:-mb-4 md:-ml-4 md:-mr-4 md:-mt-4 lg:right-[22rem] lg:mr-0 xl:-mb-6 xl:-ml-6 xl:-mt-6 xl:mr-0"
          style={{ maskImage: MAP_RIGHT_FADE_MASK, WebkitMaskImage: MAP_RIGHT_FADE_MASK }}
        >
          {/* 376 — 롤백 지점 ③: 지역 뷰는 기존 지도를 **대체하지 않고** 같은 자리에서 갈아 끼운다.
              이 삼항 하나만 지우면 HomeMapSection만 남아 원래 화면이 된다. */}
          {isRegionView ? (
            <Suspense
              fallback={
                <div className="flex h-full w-full items-center justify-center bg-paper-white text-sm text-ink-gray">
                  지역 뷰를 불러오는 중입니다…
                </div>
              }
            >
              <RegionViewPanel
                onSelectRecord={setOpenRecordId}
                topObstructionPx={HERO_OVERLAY_OPAQUE_PX}
              />
            </Suspense>
          ) : (
            <HomeMapSection
              onMarkerClick={setOpenRecordId}
              topObstructionPx={HERO_OVERLAY_OPAQUE_PX}
              focusRecordId={savedRecordId}
              onFocusRecordHandled={handleSavedRecordFocused}
              highlightRecordId={activeRecentRecordId}
              selectedRecordId={openRecordId}
            />
          )}
        </div>

        {/* 히어로 쪽으로 갈수록 지도가 흐려지는 오버레이. 클릭은 지도로 통과시켜야 해서
            pointer-events-none.
            경계선(사각형 단차)의 근본 원인은 tint 그라데이션이 아니라 요소가 "고정 높이에서
            끝난다"는 사실 자체였다 — backdrop-filter는 요소 영역 안에서만 균일하게 적용되고
            영역 밖에서 즉시 사라지므로, tint가 이미 투명해진 지점에서도 "흐린 지도 / 선명한
            지도"가 맞닿는 가로줄이 남는다. 높이가 다른 여러 겹을 겹쳐 단차를 잘게 쪼개는 방식도
            써봤지만 단차를 줄일 뿐 없애지는 못한다.
            그래서 레이어는 하나만 두고, mask-image(알파 그라데이션)로 이 요소의 "보이는 정도"
            자체를 위에서 아래로 연속적으로 0까지 떨어뜨린다. 마스크는 요소의 합성 결과 전체에
            적용되므로 backdrop-blur와 bg-paper-white(tint)가 같은 곡선을 따라 함께 사라진다 —
            tint를 별도 레이어로 분리하지 않는 이유다. 알파가 0이 되는 지점에는 그릴 것이 남지
            않아 끊기는 경계가 원리적으로 생기지 않는다.
            Safari/구형 Chromium을 위해 -webkit-mask-image(WebkitMaskImage)를 함께 지정한다.
            근거: Jira S15P11A705-307 후속 디자인 피드백. */}
        {/* 368: 좌·우·위 음수 마진이 위 지도 레이어와 **같은 값**이어야 한다. 좌우가 다르면 넓어진
            지도의 가장자리만 블러 없이 선명하게 남고, 위가 다르면 지도와 오버레이의 시작점이 어긋나
            RecordMapView에 넘기는 topObstructionPx(HERO_OVERLAY_OPAQUE_PX)가 틀린 값이 된다 —
            둘을 같이 올리면 "지도 위 몇 px이 가려지는가"라는 관계는 그대로 보존된다.
            아래쪽은 이 오버레이가 고정 높이로 끝나는 레이어라 상쇄할 padding이 없다. */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-0 md:-ml-4 md:-mr-4 md:-mt-4 lg:right-[22rem] lg:mr-0 xl:-ml-6 xl:-mt-6 xl:mr-0 ${HERO_OVERLAY_HEIGHT_CLASS} bg-paper-white backdrop-blur-lg`}
          style={{ maskImage: HERO_MAP_FADE_MASK, WebkitMaskImage: HERO_MAP_FADE_MASK }}
        />

        {/* 컨텐츠 레이어: 기존 PAGE_CONTAINER_CLASS 폭을 그대로 유지한다.
            ⚠️ 377: **pointer-events-none이 반드시 있어야 한다.** 이 div는 max-w-6xl 폭에 컨텐츠
            전체 높이를 가진 블록이라, 눈에는 아무것도 없는 여백까지 포함해 그 사각형 전체가 클릭을
            받는다. 그 아래에 배경 레이어(지도·지역 뷰)가 깔려 있어서, 이게 없으면 화면 가운데
            상당 부분에서 지도가 **클릭도 드래그도 되지 않는다.**
            지역 뷰에서 "색칠된 서울을 눌러도 아무 일이 없다"고 보고된 증상의 원인이 이것이었다 —
            서울이 그려지는 자리가 정확히 이 사각형 아래였다.
            대신 실제로 눌려야 하는 자식에만 pointer-events-auto를 되돌려 준다. 자식 각각에 붙이는
            것이 번거로워 보여도, "레이어는 통과시키고 위젯만 받는다"가 지도 위 UI의 기본 구조다. */}
        <div
          className={`pointer-events-none relative z-10 ${PAGE_CONTAINER_CLASS} flex flex-col gap-6 py-8`}
        >
          {/* 376 — 롤백 지점 ②: 지도 ↔ 지역 뷰 토글. 이 블록과 위 lazy import, 그리고 아래 배경
              레이어의 삼항만 지우면 기능이 사라진다.
              세그먼트 두 칸으로 둔 이유는 "지금 무엇을 보고 있는지"와 "무엇으로 갈 수 있는지"가 한
              번에 보여야 하기 때문이다 — 단일 토글 버튼은 라벨이 현재 상태인지 목적지인지 늘 헷갈린다. */}
          <div className="pointer-events-auto flex justify-end">
            <div
              role="group"
              aria-label="홈 배경 보기 방식"
              className="inline-flex items-center gap-1 rounded-full border border-line-card bg-snow-white/90 p-1 shadow-sm backdrop-blur"
            >
              {[
                { label: '지도', active: !isRegionView, next: false },
                { label: '지역', active: isRegionView, next: true },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setIsRegionView(option.next)}
                  aria-pressed={option.active}
                  className={
                    option.active
                      ? 'rounded-full bg-log-mint px-3.5 py-1 text-xs font-bold text-paper-white'
                      : 'rounded-full px-3.5 py-1 text-xs font-semibold text-ink-gray transition-colors hover:text-log-mint'
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pointer-events-auto">
            <SmartSearchPanel
              onSubmit={(query) => searchMutation.mutate(query)}
              isPending={searchMutation.isPending}
            />
          </div>

          {/* 371: 지도 위 우측의 "요즘 붙여둔 것".
              - 검색 결과가 떠 있는 동안에는 감춘다. 결과 갤러리와 최근 카드가 같은 폭을 두고 세로로
                이어지면 어느 쪽이 지금 화면의 주인공인지 흐려진다. 검색은 사용자가 방금 요청한 일이라
                그때는 결과가 주인공이다(idle·0건 상태에서는 다시 나타난다).
              - 로딩 중과 미구현(recentPage === null)에는 자리표시자도 두지 않는다. 부가 영역이라
                스켈레톤이 지도 위에 떠 있으면 그 자체가 노이즈다. */}
          {!hasResults && recentPage && (
            <div className="pointer-events-auto flex justify-end">
              <RecentRecordCardStack
                items={recentItems}
                activeIndex={activeRecentIndex}
                onActiveIndexChange={handleActiveRecentIndexChange}
                hasNext={recentPage.hasNext}
                onSelectRecord={setOpenRecordId}
              />
            </div>
          )}

          {hasResults && (
            <div className="pointer-events-auto">
              <SearchResultGallery
                items={searchMutation.data.items}
                onSelectRecord={setOpenRecordId}
              />
            </div>
          )}
          {hasNoResults && (
            <p className="pointer-events-auto flex items-center justify-center gap-2.5 text-center text-[13px] text-ink-gray">
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
        </div>
      </main>

      <PlaceRecordSheet onRecordSaved={handleRecordSaved} />

      {openRecordId !== null && (
        <RecordDetailOverlay recordId={openRecordId} onClose={() => setOpenRecordId(null)} />
      )}
    </PlaceRecordSheetProvider>
  );
}
