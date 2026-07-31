import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEditCollectionTitle } from '@/contexts/useEditCollectionTitle';
import { useCollectionDetailQuery } from '../hooks/useCollectionDetailQuery';
import { useUpdateCollectionTitleMutation } from '../hooks/useUpdateCollectionTitleMutation';

const TITLE_MAX_LENGTH = 20;

// 근거: docs/reference/08_API_명세.md 7.1 — 제목 필수, 최대 20자. 7.4 제목 수정도 동일 규칙을 따른다.
const editCollectionTitleFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, '제목을 입력해 주세요.')
    .max(TITLE_MAX_LENGTH, `제목은 최대 ${TITLE_MAX_LENGTH}자까지 입력할 수 있어요.`),
});

type EditCollectionTitleFormValues = z.infer<typeof editCollectionTitleFormSchema>;

interface EditCollectionTitleDialogProps {
  collectionId: number;
}

/**
 * Collection 제목 수정 모달. RHF+Zod로 폼을 검증한다.
 * 근거: Jira S15P11A705-140, docs/reference/08_API_명세.md 7.4.
 * 상세 쿼리는 CollectionDetailView가 이미 구독 중이라 여기서 다시 호출해도 캐시를 공유해 추가 요청이 없다
 * — 현재 제목을 defaultValue로 채우는 용도로만 읽는다.
 */
export function EditCollectionTitleDialog({ collectionId }: EditCollectionTitleDialogProps) {
  const editTitleState = useEditCollectionTitle();
  const detailQuery = useCollectionDetailQuery(collectionId);
  const updateTitleMutation = useUpdateCollectionTitleMutation(collectionId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditCollectionTitleFormValues>({
    resolver: zodResolver(editCollectionTitleFormSchema),
    defaultValues: { title: detailQuery.data?.pages[0]?.title ?? '' },
  });

  if (!editTitleState.isOpen) {
    return null;
  }

  const handleClose = () => {
    reset();
    updateTitleMutation.reset();
    editTitleState.close();
  };

  const onSubmit = handleSubmit(({ title }) => {
    updateTitleMutation.mutate(title, {
      onSuccess: () => {
        reset();
        editTitleState.close();
      },
    });
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pin-navy/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6">
        <h2 className="text-sm font-bold text-pin-navy">컬렉션 제목 수정</h2>

        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2">
          <label htmlFor="edit-collection-title" className="sr-only">
            컬렉션 제목
          </label>
          <input
            id="edit-collection-title"
            type="text"
            maxLength={TITLE_MAX_LENGTH}
            placeholder="컬렉션 제목을 입력해 주세요"
            disabled={updateTitleMutation.isPending}
            className="h-11 rounded-lg border border-pin-navy/15 bg-white px-3 text-sm text-pin-navy outline-none placeholder:text-ink-gray-light focus:border-log-mint focus:ring-2 focus:ring-log-mint/20 disabled:opacity-40"
            {...register('title')}
          />

          {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}

          {updateTitleMutation.isError && (
            <p className="text-xs text-red-600">{updateTitleMutation.error.message}</p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={updateTitleMutation.isPending}
              className="h-11 flex-1 rounded-lg border border-pin-navy/15 text-sm font-bold text-pin-navy disabled:opacity-40"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={updateTitleMutation.isPending}
              className="h-11 flex-1 rounded-lg bg-log-mint text-sm font-bold text-pin-navy disabled:opacity-40"
            >
              {updateTitleMutation.isPending ? '저장 중…' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
