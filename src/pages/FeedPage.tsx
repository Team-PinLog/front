import { FeedList } from '@/features/feed/components/FeedList';

export function FeedPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-extrabold text-pin-navy">새로운 장소를 발견해 보세요</h1>
      <FeedList />
    </main>
  );
}
