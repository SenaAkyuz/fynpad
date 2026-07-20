import { deleteBudget, upsertBudget } from '@/lib/budgets';
import { createCategory, deleteCategory, updateCategory } from '@/lib/categories';
import {
  addToGoal,
  createGoal,
  deleteGoal,
  subtractFromGoal,
  updateGoal,
  type GoalPatch,
} from '@/lib/goals';
import { withOwner, type Owned } from '@/lib/mutationOwner';
import {
  createRecurringRule,
  deleteRecurringRule,
  updateRecurringRule,
  type RecurringRulePatch,
} from '@/lib/recurring';
import {
  createSubscription,
  deleteSubscription,
  updateSubscription,
  type SubscriptionPatch,
} from '@/lib/subscriptions';
import { createTransaction, deleteTransaction, updateTransaction } from '@/lib/transactions';

/**
 * Sahiplik-korumalı mutation fonksiyonları — TEK kaynak.
 *
 * Hem canlı hook'lar (hooks/use*.ts) hem de restore edilen kuyruk için kaydedilen
 * default'lar (lib/offlineMutations.ts) BURAYI kullanır. İki yerde ayrı sarmalama
 * yapılsaydı biri güncellenmeyi unutulduğunda sahiplik kontrolü sessizce düşerdi.
 *
 * Payload deseni: mutation değişkenleri her zaman `ownerUserId` taşır; `withOwner`
 * çalıştırmadan önce aktif oturumla karşılaştırır, sonra alanı ayıklayıp asıl servis
 * fonksiyonuna geçer. Servis imzaları değişmez.
 */

// — Transactions —
export type CreateTransactionVars = Owned<Parameters<typeof createTransaction>[0]>;
export type UpdateTransactionVars = Owned<{
  id: string;
  patch: Parameters<typeof updateTransaction>[1];
}>;
export type DeleteVars = Owned<{ id: string }>;

export const createTransactionOwned = withOwner(createTransaction);
export const updateTransactionOwned = withOwner(
  ({ id, patch }: { id: string; patch: Parameters<typeof updateTransaction>[1] }) =>
    updateTransaction(id, patch)
);
export const deleteTransactionOwned = withOwner(({ id }: { id: string }) => deleteTransaction(id));

// — Categories —
export type CreateCategoryVars = Owned<Parameters<typeof createCategory>[0]>;
export type UpdateCategoryVars = Owned<{
  id: string;
  patch: Parameters<typeof updateCategory>[1];
}>;

export const createCategoryOwned = withOwner(createCategory);
export const updateCategoryOwned = withOwner(
  ({ id, patch }: { id: string; patch: Parameters<typeof updateCategory>[1] }) =>
    updateCategory(id, patch)
);
export const deleteCategoryOwned = withOwner(({ id }: { id: string }) => deleteCategory(id));

// — Recurring rules —
export type CreateRecurringRuleVars = Owned<Parameters<typeof createRecurringRule>[0]>;
export type UpdateRecurringRuleVars = Owned<{ id: string; patch: RecurringRulePatch }>;

export const createRecurringRuleOwned = withOwner(createRecurringRule);
export const updateRecurringRuleOwned = withOwner(
  ({ id, patch }: { id: string; patch: RecurringRulePatch }) => updateRecurringRule(id, patch)
);
export const deleteRecurringRuleOwned = withOwner(({ id }: { id: string }) =>
  deleteRecurringRule(id)
);

// — Subscriptions —
export type CreateSubscriptionVars = Owned<Parameters<typeof createSubscription>[0]>;
export type UpdateSubscriptionVars = Owned<{ id: string; patch: SubscriptionPatch }>;

export const createSubscriptionOwned = withOwner(createSubscription);
export const updateSubscriptionOwned = withOwner(
  ({ id, patch }: { id: string; patch: SubscriptionPatch }) => updateSubscription(id, patch)
);
export const deleteSubscriptionOwned = withOwner(({ id }: { id: string }) => deleteSubscription(id));

// — Goals —
export type CreateGoalVars = Owned<Parameters<typeof createGoal>[0]>;
export type UpdateGoalVars = Owned<{ id: string } & GoalPatch>;
export type GoalAmountVars = Owned<{ id: string; amount: number }>;

export const createGoalOwned = withOwner(createGoal);
export const updateGoalOwned = withOwner((input: { id: string } & GoalPatch) => updateGoal(input));
export const deleteGoalOwned = withOwner(({ id }: { id: string }) => deleteGoal(id));
export const addToGoalOwned = withOwner(({ id, amount }: { id: string; amount: number }) =>
  addToGoal(id, amount)
);
export const subtractFromGoalOwned = withOwner(({ id, amount }: { id: string; amount: number }) =>
  subtractFromGoal(id, amount)
);

// — Budgets —
export type UpsertBudgetVars = Owned<Parameters<typeof upsertBudget>[0]>;

export const upsertBudgetOwned = withOwner(upsertBudget);
export const deleteBudgetOwned = withOwner(({ id }: { id: string }) => deleteBudget(id));
