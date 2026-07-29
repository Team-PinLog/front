import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCreateCollection } from '@/contexts/useCreateCollection';
import { useCreateCollectionMutation } from '../hooks/useCreateCollectionMutation';

const TITLE_MAX_LENGTH = 20;

// 근거: docs/reference/08_API_명세.md 7.1 — 제목 필수, 최대 20자.
const createCollectionFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, '제목을 입력해 주세요.')
    .max(TITLE_MAX_LENGTH, `제목은 최대 ${TITLE_MAX_LENGTH}자까지 입력할 수 있어요.`),
});

type CreateCollectionFormValues = z.infer<typeof createCollectionFormSchema>;

interface CreateCollectionDialogProps {
  recordId: number;
}

/**
 * 단일 Record 기반 Collection 생성 모달.
 * 근거: Jira S15P11A705-139, docs/reference/08_API_명세.md 7.1.
 * 생성 즉시 자동 발행되며, Collection 상세 화면이 아직 없어 성공해도 페이지 이동은 하지 않는다.
 */
export function CreateCollectionDialog({ recordId }: CreateCollectionDialogProps) {
  const createCollectionState = useCreateCollection();
  const createCollectionMutation = useCreateCollectionMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCollectionFormValues>({
    resolver: zodResolver(createCollectionFormSchema),
    defaultValues: { title: '' },
  });

  if (!createCollectionState.isOpen) {
    return null;
  }

  const handleClose = () => {
    reset();
    createCollectionMutation.reset();
    createCollectionState.close();
  };

  const onSubmit = handleSubmit(({ title }) => {
    createCollectionMutation.mutate(
      { title, recordIds: [recordId] },
      {
        onSuccess: () => {
          reset();
          createCollectionState.close();
        },
      },
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pin-navy/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6">
        <h2 className="text-sm font-bold text-pin-navy">새 컬렉션 만들기</h2>

        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2">
          <label htmlFor="create-collection-title" className="sr-only">
            컬렉션 제목
          </label>
          <input
            id="create-collection-title"
            type="text"
            maxLength={TITLE_MAX_LENGTH}
            placeholder="컬렉션 제목을 입력해 주세요"
            disabled={createCollectionMutation.isPending}
            className="h-11 rounded-lg border border-pin-navy/15 bg-white px-3 text-sm text-pin-navy outline-none placeholder:text-ink-gray-light focus:border-log-mint focus:ring-2 focus:ring-log-mint/20 disabled:opacity-40"
            {...register('title')}
          />

          {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}

          {createCollectionMutation.isError && (
            <p className="text-xs text-red-600">{createCollectionMutation.error.message}</p>
          )}

          {createCollectionMutation.isSuccess && (
            <p className="text-xs text-log-mint">컬렉션이 만들어졌어요.</p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={createCollectionMutation.isPending}
              className="h-11 flex-1 rounded-lg border border-pin-navy/15 text-sm font-bold text-pin-navy disabled:opacity-40"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={createCollectionMutation.isPending}
              className="h-11 flex-1 rounded-lg bg-log-mint text-sm font-bold text-pin-navy disabled:opacity-40"
            >
              {createCollectionMutation.isPending ? '만드는 중…' : '만들기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
