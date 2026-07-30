import { FeedList } from '@/features/feed/components/FeedList';

export function FeedPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-extrabold text-pin-navy">피드</h1>
      <FeedList />
    </main>
  );
}
