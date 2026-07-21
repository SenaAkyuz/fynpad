import {
  addTransactionToCache,
  deleteTransactionFromCache,
  filterTransactionsByRange,
  updateTransactionInCache,
} from '@/lib/transactionCache';
import type { Transaction } from '@/types';

const tx = (id: string, date: string, amount = 10): Transaction => ({
  id,
  userId: 'user-a',
  categoryId: 'cat',
  amount,
  currency: 'TRY',
  kind: 'expense',
  date,
  note: null,
  recurringRuleId: null,
  createdAt: `${date}T10:00:00.000Z`,
  updatedAt: `${date}T10:00:00.000Z`,
});

describe('canonical transaction cache', () => {
  const all = [tx('today', '2026-07-20'), tx('old', '2025-12-31')];

  it('filters the same cache for day, month and year ranges', () => {
    expect(filterTransactionsByRange(all, { from: '2026-07-20', to: '2026-07-20' })).toHaveLength(1);
    expect(filterTransactionsByRange(all, { from: '2026-07-01', to: '2026-07-31' })).toHaveLength(1);
    expect(filterTransactionsByRange(all, { from: '2026-01-01', to: '2026-12-31' })).toHaveLength(1);
  });

  it('seeds an empty offline cache and supports update/delete', () => {
    const created = addTransactionToCache(undefined, tx('temp_1', '2026-07-20'));
    expect(created).toHaveLength(1);
    expect(updateTransactionInCache(created, 'temp_1', { amount: 25 })[0].amount).toBe(25);
    expect(deleteTransactionFromCache(created, 'temp_1')).toEqual([]);
  });
});
