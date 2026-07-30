import { MyShelfList } from '@/features/collections/components/MyShelfList';
import { FollowedShelfList } from '@/features/follows/components/FollowedShelfList';

/**
 * Library: "내 책장"(141)과 "팔로우한 책장"(144)을 한 화면에서 조회한다.
 * 근거: Jira S15P11A705-144, docs/reference/08_API_명세.md 9장 — 전용 Endpoint 없이 GET /collections +
 * GET /follows + GET /follows/{followId}/collections 조합으로 구성한다.
 */
export function LibraryPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 p-8">
      <section className="flex flex-col gap-6">
        <h1 className="text-2xl font-extrabold text-pin-navy">내 책장</h1>
        <MyShelfList />
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-2xl font-extrabold text-pin-navy">팔로우한 책장</h2>
        <FollowedShelfList />
      </section>
    </main>
  );
}
