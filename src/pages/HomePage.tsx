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
        <div className="absolute inset-0">
          <HomeMapSection onMarkerClick={setOpenRecordId} />
        </div>

        {/* 히어로 쪽으로 갈수록 지도가 흐려지도록 하는 그라데이션+블러 오버레이. 클릭을 지도로
            그대로 통과시켜야 해서 pointer-events-none. backdrop-blur는 이 영역 전체에 균일하게
            적용되고(마스크로 블러 강도 자체를 점진적으로 줄이진 않는다), 위에 얹은
            bg-gradient-to-b가 시각적으로 "흐려지며 사라지는" 느낌을 만든다 — cross-browser
            mask-image 없이 pointer-events-none 오버레이 방식으로 구현.
            307 재조사: 이전 버전(from-paper-white via-paper-white/70 to-transparent, 스톱 위치
            미지정)은 DOM/CSS 자체는 정상이었다(빌드된 CSS에서 stacking·컬러스톱 모두 정상 확인) —
            다만 0%~100% 전 구간에 걸쳐 서서히 옅어지기만 해서, paper-white(#FAF7F6)가 카카오
            기본 지도 타일의 밝은 색과 명도 차이가 거의 없어 "옅어지는 흰 배경"이 육안으로 거의
            안 보였다. from-0%/via-55%로 스톱 위치를 명시해 0~55% 구간은 진하게 불투명을
            유지하다가 55~100% 구간에서만 빠르게 투명해지도록 바꿔, 지도 색상과 무관하게 위쪽에
            뚜렷한 불투명 밴드가 보이도록 했다. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-paper-white from-0% via-paper-white/90 via-55% to-transparent backdrop-blur-lg"
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
