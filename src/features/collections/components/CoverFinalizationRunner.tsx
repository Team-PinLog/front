import { useCoverFinalization, type CoverFinalizationJob } from '../hooks/useCoverFinalization';

/**
 * 326: 화면에 아무것도 그리지 않는 컴포넌트. 존재 이유는 **훅 인스턴스를 하나 갖는 것** 하나다.
 *
 * 훅은 컴포넌트당 한 벌이라, 진행 중인 표지 잡 여러 개를 한 훅으로 다루려면 폴링·저장 상태를
 * 배열로 직접 관리해야 한다. 잡 하나에 러너 하나를 마운트하면 그 관리가 통째로 사라진다 —
 * 각 잡이 자기 폴링·자기 상한(5분)·자기 저장 뮤테이션을 갖고, 끝나면 자기만 언마운트된다.
 *
 * 사용자가 컬렉션을 연달아 만들 때 먼저 시작한 표지가 뒤엣것에 밀려 사라지지 않는 것도 이 구조
 * 덕분이다(공유 상태가 없으니 덮어쓸 것도 없다).
 */
export function CoverFinalizationRunner({
  job,
  onSettled,
}: {
  job: CoverFinalizationJob;
  onSettled: () => void;
}) {
  useCoverFinalization(job, onSettled);
  return null;
}
