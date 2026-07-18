import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '@/lib/categories';
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

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['createCategory'],
    mutationFn: createCategory,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: categoriesKey });
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['updateCategory'],
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<{ name: string; icon: string; color: string }>;
    }) => updateCategory(id, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: categoriesKey });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['deleteCategory'],
    mutationFn: deleteCategory,
    onSuccess: () => {
      // delete işlemleri Diğer'e taşıdığı için transactions da geçersiz kılınır
      void qc.invalidateQueries({ queryKey: categoriesKey });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
