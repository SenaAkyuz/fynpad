import type { Currency } from '@/types/transaction';

/** MVP'de tek seçenek (DB check constraint de kısıtlıyor). İleride weekly/yearly eklenebilir. */
export type BudgetPeriodType = 'monthly';

export type CategoryBudget = {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  currency: Currency;
  periodType: BudgetPeriodType;
  createdAt: string;
  updatedAt: string;
};

/** Computed: bütçe + o ayki harcama + durum (brief 4.5: "Over by $X" uyarısı için). */
export type BudgetStatus = {
  budget: CategoryBudget;
  spent: number;
  remaining: number; // budget.amount - spent (negatif olabilir)
  percent: number; // (spent / budget.amount) * 100
  isOver: boolean; // spent > budget.amount
  overAmount: number; // isOver ? spent - budget.amount : 0
};
