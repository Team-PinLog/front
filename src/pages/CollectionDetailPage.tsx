import { useParams, useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { CollectionDeleteConfirmProvider } from '@/contexts/CollectionDeleteConfirmProvider';
import { EditCollectionTitleProvider } from '@/contexts/EditCollectionTitleProvider';
import { CollectionSpreadProvider } from '@/contexts/CollectionSpreadProvider';
import { DeleteConfirmProvider } from '@/contexts/DeleteConfirmProvider';
import { CollectionDetailView } from '@/features/collections/components/CollectionDetailView';
import { CollectionOverlayShell } from '@/features/collections/components/CollectionOverlayShell';
import { CollectionDeleteConfirmDialog } from '@/features/collections/components/CollectionDeleteConfirmDialog';
import { EditCollectionTitleDialog } from '@/features/collections/components/EditCollectionTitleDialog';

export function CollectionDetailPage() {
  const { collectionId } = useParams({ from: '/collections/$collectionId' });
  const { feedRequestId, feedPosition } = useSearch({ from: '/collections/$collectionId' });
  const router = useRouter();
  // Feed·내 책장·팔로우한 책장 등 내부 진입은 navigate({ state: { collectionOverlay: true } })로 이
  // 라우트에 진입한다(207) — 직접 URL 진입·공유 링크는 이 state가 없어 닫기 버튼을 붙이지 않는다.
  // 332: 딤·카드 패널을 없애면서 화면 자체는 세 진입 경로가 모두 같아졌다. 남은 차이는 "돌아갈
  // 앱 내 지점이 있는가"뿐이라, 이 state 하나만 보고 닫기 버튼 노출을 정한다 — 새로고침 재진입을
  // 따로 가려내던 collectionOverlayIntent 소비는 더 이상 필요하지 않아 걷어냈다.
  const hasOverlayState = useRouterState({
    select: (state) => state.location.state.collectionOverlay === true,
  });
  // 332: 오른쪽 책장에서 다른 Collection으로 넘어왔다는 마커(router.tsx HistoryState). Feed 경유
  // 진입(feedRequestId)과 함께 "오른쪽 책장을 세울지"를 결정한다 — 책장에서 책장으로 넘나드는
  // 동안 책장이 사라지지 않게 하기 위한 것이다.
  const hasShelfContext = useRouterState({
    select: (state) => state.location.state.shelfContext === true,
  });

  // 닫기 버튼은 책 우상단에 붙으므로(332 피드백) 화면이 아니라 View가 그린다 — 위치를 아는 쪽이
  // 책 래퍼이기 때문이다. 오버레이 진입이 아닐 때는 넘기지 않아 버튼 자체가 나오지 않는다.
  const handleClose = hasOverlayState ? () => router.history.back() : undefined;

  const content = (
    <CollectionDeleteConfirmProvider>
      <EditCollectionTitleProvider>
        {/* collectionId로 key를 걸어 다른 Collection으로 이동(예: 오른쪽 책장 클릭)할 때 스프레드
            인덱스를 0으로 리셋한다 — 이 라우트는 params만 바뀌고 컴포넌트가 재마운트되지 않는다. */}
        <CollectionSpreadProvider key={collectionId}>
          {/* ContextStickyNoteCard(소유 Collection의 record 안)가 useDeleteContextMutation → useDeleteConfirm을
              쓰므로 DeleteConfirmProvider가 필요하다. 짝이 되는 DeleteConfirmDialog(Record 강제 삭제
              확인 모달)는 recordId로 스프레드 상태의 currentRecord가 필요해 여기가 아니라
              CollectionDetailView 내부(그 값이 이미 계산되는 지점)에서 렌더링한다. */}
          <DeleteConfirmProvider>
            <CollectionDetailView
              collectionId={collectionId}
              feedRequestId={feedRequestId}
              feedPosition={feedPosition}
              hasShelfContext={hasShelfContext}
              onClose={handleClose}
            />
          </DeleteConfirmProvider>
        </CollectionSpreadProvider>
        <CollectionDeleteConfirmDialog
          collectionId={collectionId}
          hasOverlayState={hasOverlayState}
        />
        <EditCollectionTitleDialog collectionId={collectionId} />
      </EditCollectionTitleProvider>
    </CollectionDeleteConfirmProvider>
  );

  // 418: **어느 경로로 들어와도 책 펼침면 모달이다**(코멘트 2의 3번). 332에서는 내부 진입만
  // 오버레이였고 직접 URL은 풀페이지였는데, 그러면 같은 컬렉션이 진입 경로에 따라 다른 화면으로
  // 보인다. 남는 차이는 "돌아갈 앱 내 지점이 있는가"뿐이라(hasOverlayState) 그것만 onClose로
  // 갈라 셸에 넘긴다 — 직접 URL·공유 링크 진입에는 ✕도 ESC 닫기도 걸리지 않는다.
  // URL은 그대로 유지한다(사용자 확정 (a)안) — 라우트가 모달을 렌더하는 형태다.
  return <CollectionOverlayShell onClose={handleClose}>{content}</CollectionOverlayShell>;
}
