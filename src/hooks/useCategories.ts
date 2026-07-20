import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ownedById, useOwnedMutation } from '@/hooks/useOwnedMutation';
import { createCategory, listCategories, updateCategory } from '@/lib/categories';
import {
  createCategoryOwned,
  deleteCategoryOwned,
  updateCategoryOwned,
  type CreateCategoryVars,
  type UpdateCategoryVars,
} from '@/lib/ownedMutations';
import { useAuthStore } from '@/stores/useAuthStore';

/** ÖNEK key — invalidation'lar bunu kullanır; gerçek key userId taşır (bkz. useTransactions). */
export const categoriesKey = ['categories'] as const;

export function useCategories() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [...categoriesKey, userId],
    queryFn: listCategories,
    enabled: !!userId,
  });
}

type CreateInput = Parameters<typeof createCategory>[0];
type UpdateArgs = { id: string; patch: Parameters<typeof updateCategory>[1] };

export function useCreateCategory() {
  const qc = useQueryClient();
  return useOwnedMutation(
    (input: CreateInput, ownerUserId): CreateCategoryVars => ({ ...input, ownerUserId }),
    {
      mutationKey: ['createCategory'],
      mutationFn: createCategoryOwned,
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: categoriesKey });
      },
    }
  );
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useOwnedMutation(
    (args: UpdateArgs, ownerUserId): UpdateCategoryVars => ({ ...args, ownerUserId }),
    {
      mutationKey: ['updateCategory'],
      mutationFn: updateCategoryOwned,
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: categoriesKey });
      },
    }
  );
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useOwnedMutation(ownedById, {
    mutationKey: ['deleteCategory'],
    mutationFn: deleteCategoryOwned,
    onSuccess: () => {
      // delete işlemleri Diğer'e taşıdığı için transactions da geçersiz kılınır
      void qc.invalidateQueries({ queryKey: categoriesKey });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
