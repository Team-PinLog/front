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
 * 배경 지도 위 히어로 오버레이의 알파 마스크. 위 48%는 검정(=오버레이 100% 표시)으로 유지해
 * 제목부터 검색바까지를 완전히 불투명하게 덮고, 거기서부터 100%까지 transparent로 떨어뜨려
 * 블러와 흰 tint가 함께 서서히 사라지게 한다. 색이 같은 두 스톱(black 0%/48%) 사이라 정지
 * 구간에서 단차는 생기지 않는다.
 *
 * 48%를 고른 근거: 오버레이 높이가 h-[28rem](448px)이라 불투명 구간이 448 * 0.48 ≈ 215px다.
 * 실측상 SmartSearchPanel의 검색바 아래끝이 약 184px(1440x900, xl)이라 30px 남짓 여유가
 * 남는다 — 검색바 텍스트가 흐려진 지도 위에 걸치지 않는다. 나머지 233px이 감쇠 구간이라
 * 이전(384px 중 115px 불투명)보다 불투명 구간과 감쇠 구간이 함께 늘어났다.
 */
const HERO_MAP_FADE_MASK = 'linear-gradient(to bottom, black 0%, black 48%, transparent 100%)';

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

  const hasResults = searchMutation.isSuccess && searchMutation.data.items.length > 0;
  // mockup의 homeSearchNoResults(검색은 했지만 0건)에 대응한다 — idle·pending·error와 달리
  // 지도 위에 "원하는 장소를 찾아보세요" 안내를 함께 보여준다(mockup 1058~1060행).
  const hasNoResults = searchMutation.isSuccess && searchMutation.data.items.length === 0;

  return (
    <PlaceRecordSheetProvider>
      <main className="relative min-h-[calc(100dvh-3.5rem)] xl:min-h-[100dvh]">
        {/* 배경 레이어: 사이드바를 제외한 남은 영역 전체를 풀블리드로 채우는 지도. CSS 페인트 순서상
            position:absolute 요소(z-index:auto)는 아래 일반 흐름 컨텐츠보다 항상 위에 그려지므로,
            이 레이어를 배경으로 두려면 컨텐츠 레이어 쪽에 별도로 relative+z-10을 줘 쌓임 순서를
            뒤집어야 한다(아래 컨텐츠 레이어 참고). */}
        {/* isolate는 이 배경 레이어가 어떤 z-index도 바깥으로 새게 하지 않는다는 경계다. 실제
            누출원(카카오 SDK 내부 z-index)은 RecordMapView 컨테이너에서 이미 가두지만, 아래
            오버레이가 지도 위에 보이는 것은 이 레이어 구조 자체의 전제라 여기서도 명시한다. */}
        <div className="isolate absolute inset-0">
          <HomeMapSection onMarkerClick={setOpenRecordId} />
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
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-paper-white backdrop-blur-lg"
          style={{ maskImage: HERO_MAP_FADE_MASK, WebkitMaskImage: HERO_MAP_FADE_MASK }}
        />

        {/* 컨텐츠 레이어: 기존 PAGE_CONTAINER_CLASS 폭을 그대로 유지한다. */}
        <div className={`relative z-10 ${PAGE_CONTAINER_CLASS} flex flex-col gap-6 py-8`}>
          <SmartSearchPanel
            onSubmit={(query) => searchMutation.mutate(query)}
            isPending={searchMutation.isPending}
          />

          {hasResults && (
            <SearchResultGallery
              items={searchMutation.data.items}
              onSelectRecord={setOpenRecordId}
            />
          )}
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
        </div>
      </main>

      <PlaceRecordSheet />

      {openRecordId !== null && (
        <RecordDetailOverlay recordId={openRecordId} onClose={() => setOpenRecordId(null)} />
      )}
    </PlaceRecordSheetProvider>
  );
}
