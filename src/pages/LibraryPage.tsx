import { MyShelfList } from '@/features/collections/components/MyShelfList';
import { FollowedShelfList } from '@/features/follows/components/FollowedShelfList';

/**
 * Library: "내 책장"(141)과 "팔로우한 책장"(144)을 한 화면에서 조회한다.
 * 근거: Jira S15P11A705-144/169, docs/reference/08_API_명세.md 9장 — 전용 Endpoint 없이 GET /collections +
 * GET /follows + GET /follows/{followId}/collections 조합으로 구성한다.
 * 비주얼은 mockup(PinLog.responsive.dc.html)의 책장(cabinet-shell) 스타일을 따른다 — 제목은 목업의
 * pageHeading('나의 책장')을 그대로 쓴다.
 */
export function LibraryPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 p-8">
      <h1 className="text-[27px] font-bold tracking-tight text-pin-navy">나의 책장</h1>

      <section className="flex flex-col gap-4">
        <MyShelfList />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-bold text-ink-gray">팔로우한 책장</h2>
        <FollowedShelfList />
      </section>
    </main>
  );
}
