import { MyShelfList } from '@/features/collections/components/MyShelfList';

export function MyShelfPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-extrabold text-pin-navy">내 책장</h1>
      <MyShelfList />
    </main>
  );
}
