import { useState } from 'react';
import { useParams, useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { CollectionDeleteConfirmProvider } from '@/contexts/CollectionDeleteConfirmProvider';
import { EditCollectionTitleProvider } from '@/contexts/EditCollectionTitleProvider';
import { CollectionSpreadProvider } from '@/contexts/CollectionSpreadProvider';
import { DeleteConfirmProvider } from '@/contexts/DeleteConfirmProvider';
import { CollectionDetailView } from '@/features/collections/components/CollectionDetailView';
import {
  CollectionFullscreenCloseButton,
  CollectionOverlayShell,
} from '@/features/collections/components/CollectionOverlayShell';
import { CollectionDeleteConfirmDialog } from '@/features/collections/components/CollectionDeleteConfirmDialog';
import { EditCollectionTitleDialog } from '@/features/collections/components/EditCollectionTitleDialog';
import { consumeCollectionOverlayIntent } from '@/features/collections/lib/collectionOverlayIntent';

export function CollectionDetailPage() {
  const { collectionId } = useParams({ from: '/collections/$collectionId' });
  const { feedRequestId, feedPosition } = useSearch({ from: '/collections/$collectionId' });
  const router = useRouter();
  // Feed·내 책장·팔로우한 책장 등 내부 진입은 navigate({ state: { collectionOverlay: true } })로 이
  // 라우트에 진입한다(207) — 직접 URL 진입·공유 링크는 이 state가 없어 평범한 풀페이지로 남는다.
  const hasOverlayState = useRouterState({
    select: (state) => state.location.state.collectionOverlay === true,
  });
  // location.state는 새로고침해도 브라우저가 보존해 hasOverlayState만으로는 "방금 클릭해서 왔는지"와
  // "새로고침으로 재진입했는지"를 구분할 수 없다 — 인메모리 플래그(collectionOverlayIntent)를 mount
  // 시점에 한 번만 소비해 판단한다. 새로고침이면 모듈이 다시 로드돼 플래그가 이미 false다. useState
  // lazy initializer라 최초 렌더에서 딱 한 번만 호출되고, 이후 리렌더에서는 다시 호출되지 않는다.
  const [cameFromInAppClick] = useState(() => consumeCollectionOverlayIntent());

  const content = (
    <CollectionDeleteConfirmProvider>
      <EditCollectionTitleProvider>
        {/* collectionId로 key를 걸어 다른 Collection으로 이동(예: ShelfExploreSection 클릭)할 때 스프레드
            인덱스를 0으로 리셋한다 — 이 라우트는 params만 바뀌고 컴포넌트가 재마운트되지 않는다. */}
        <CollectionSpreadProvider key={collectionId}>
          {/* ContextCard(소유 Collection의 record 안)가 useDeleteContextMutation → useDeleteConfirm을
              쓰므로 DeleteConfirmProvider가 필요하다. 짝이 되는 DeleteConfirmDialog(Record 강제 삭제
              확인 모달)는 recordId로 스프레드 상태의 currentRecord가 필요해 여기가 아니라
              CollectionDetailView 내부(그 값이 이미 계산되는 지점)에서 렌더링한다. */}
          <DeleteConfirmProvider>
            <CollectionDetailView
              collectionId={collectionId}
              feedRequestId={feedRequestId}
              feedPosition={feedPosition}
            />
          </DeleteConfirmProvider>
        </CollectionSpreadProvider>
        <CollectionDeleteConfirmDialog collectionId={collectionId} />
        <EditCollectionTitleDialog collectionId={collectionId} />
      </EditCollectionTitleProvider>
    </CollectionDeleteConfirmProvider>
  );

  if (!hasOverlayState) {
    // 직접 URL 진입·공유 링크: 기존과 동일한 풀스크린, 닫기 버튼 없음.
    return content;
  }

  const handleClose = () => router.history.back();

  if (cameFromInAppClick) {
    // 방금 클릭해서 진입: dimmed backdrop + 중앙 카드.
    return <CollectionOverlayShell onClose={handleClose}>{content}</CollectionOverlayShell>;
  }

  // state는 있지만 방금 클릭한 게 아님(새로고침으로 재진입): 풀스크린 + 우측 상단 X 닫기 버튼.
  return (
    <>
      <CollectionFullscreenCloseButton onClose={handleClose} />
      {content}
    </>
  );
}
