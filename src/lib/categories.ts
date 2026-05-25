import { supabase } from '@/lib/supabase';
import type { Category, CategoryKind } from '@/types';

/** DB satırı (snake_case) → app tipi (camelCase). */
type CategoryRow = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  kind: CategoryKind;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function rowToCategory(r: CategoryRow): Category {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    icon: r.icon,
    color: r.color,
    kind: r.kind,
    isDefault: r.is_default,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) {
    throw new Error('Not authenticated');
  }
  return userId;
}

/** RLS sayesinde sadece kullanıcının kendi kategorileri döner. */
export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('kind', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) {
    throw error;
  }
  return (data as CategoryRow[]).map(rowToCategory);
}

export async function createCategory(input: {
  name: string;
  icon: string;
  color: string;
  kind: CategoryKind;
}): Promise<Category> {
  const userId = await requireUserId();

  // sort_order = aynı kind içindeki max + 1
  const { data: existing, error: exErr } = await supabase
    .from('categories')
    .select('sort_order')
    .eq('kind', input.kind)
    .order('sort_order', { ascending: false })
    .limit(1);
  if (exErr) {
    throw exErr;
  }
  const nextOrder = ((existing as { sort_order: number }[])?.[0]?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      name: input.name,
      icon: input.icon,
      color: input.color,
      kind: input.kind,
      is_default: false,
      sort_order: nextOrder,
    })
    .select('*')
    .single();
  if (error) {
    throw error;
  }
  return rowToCategory(data as CategoryRow);
}

export async function updateCategory(
  id: string,
  patch: Partial<{ name: string; icon: string; color: string }>
): Promise<Category> {
  const dbPatch: Record<string, string> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.icon !== undefined) dbPatch.icon = patch.icon;
  if (patch.color !== undefined) dbPatch.color = patch.color;

  const { data, error } = await supabase
    .from('categories')
    .update(dbPatch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) {
    throw error;
  }
  return rowToCategory(data as CategoryRow);
}

/**
 * Kategoriyi siler. RLS is_default=false şartını zorlar. Önce bu kategorideki
 * tüm işlemleri kullanıcının "Diğer" kategorisine taşır, sonra siler.
 * App-level sıralı (transactional değil) — MVP için yeterli, sıra doğru.
 */
export async function deleteCategory(id: string): Promise<void> {
  const categories = await listCategories();
  const other = categories.find(
    (c) => c.isDefault && c.name === 'dashboard.categories.other'
  );
  if (!other) {
    throw new Error('No "Other" category to reassign transactions to');
  }

  // 1) işlemleri Diğer'e taşı
  const { error: reassignErr } = await supabase
    .from('transactions')
    .update({ category_id: other.id })
    .eq('category_id', id);
  if (reassignErr) {
    throw reassignErr;
  }

  // 2) kategoriyi sil
  const { error: delErr } = await supabase.from('categories').delete().eq('id', id);
  if (delErr) {
    throw delErr;
  }
}
