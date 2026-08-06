import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { CoverFinalizationRunner } from '@/features/collections/components/CoverFinalizationRunner';
import type { CoverFinalizationJob } from '@/features/collections/hooks/useCoverFinalization';
import { CoverJobContext, type CoverJobQueueValue } from './CoverJobContext';

/**
 * 326: 백그라운드 표지 저장의 수명 경계. 자세한 배경은 CoverJobContext.ts 주석 참고.
 *
 * 여기가 하는 일은 목록 관리뿐이고, 폴링·저장은 잡마다 마운트되는 러너가 각자 한다. 러너는
 * 끝나면(저장 완료·잡 실패·상한 5분 초과) 스스로 물러나므로 목록은 저절로 비고, 결과를 화면에
 * 알리지 않는다 — 표지 없는 컬렉션은 정상 상태다(docs/api-contract.md).
 */
export function CoverJobProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<CoverFinalizationJob[]>([]);

  const enqueue = useCallback((job: CoverFinalizationJob) => {
    setJobs((prev) =>
      // 같은 요청을 두 번 맡기면 러너가 둘이 되어 같은 URL을 두 번 저장한다.
      prev.some((pending) => pending.coverRequestId === job.coverRequestId) ? prev : [...prev, job],
    );
  }, []);

  const dismiss = useCallback((coverRequestId: string) => {
    setJobs((prev) => prev.filter((pending) => pending.coverRequestId !== coverRequestId));
  }, []);

  const contextValue = useMemo<CoverJobQueueValue>(() => ({ enqueue }), [enqueue]);

  return (
    <CoverJobContext.Provider value={contextValue}>
      {children}
      {jobs.map((job) => (
        <CoverFinalizationRunner
          key={job.coverRequestId}
          job={job}
          onSettled={() => dismiss(job.coverRequestId)}
        />
      ))}
    </CoverJobContext.Provider>
  );
}
