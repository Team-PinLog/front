import { useParams } from '@tanstack/react-router';
import { RecordDetailContent } from '@/features/records/components/RecordDetailContent';

/**
 * /records/$recordId 딥링크. 홈 오버레이와 같은 노트 페이지(373)를 쓰되, 셸은 모달이 아니라
 * 가운데 정렬된 페이지다 — 닫을 대상이 없어 ✕(onClose)는 넘기지 않는다.
 */
export function RecordDetailPage() {
  const { recordId } = useParams({ from: '/records/$recordId' });
  return (
    <div className="flex justify-center px-6 py-8">
      <div className="w-[min(1120px,100%)]">
        <RecordDetailContent recordId={recordId} />
      </div>
    </div>
  );
}
