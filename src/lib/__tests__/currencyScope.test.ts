import { cashFlowSeries, netSavings, topCategories } from '@/lib/analytics';
import { computeBudgetStatus } from '@/lib/budgets';
import { getTotals } from '@/lib/transactions';
import type { CategoryBudget, Transaction } from '@/types';

/**
 * docs/claude-fix-plan/02 — para birimi güvenliği regresyon testleri.
 *
 * Kök sorun: özet fonksiyonları `currency`'yi yok sayıp ham `amount` topluyordu
 * (1000 TRY gelir + 100 USD gider → "900 TRY"). Bu testler farklı para birimlerinin
 * BİR DAHA birbirine karışmamasını garanti eder.
 */

let seq = 0;
function tx(over: Partial<Transaction>): Transaction {
  seq += 1;
  return {
    id: `tx_${seq}`,
    userId: 'u1',
    categoryId: 'cat_a',
    amount: 100,
    currency: 'TRY',
    kind: 'expense',
    date: '2026-07-10',
    note: null,
    recurringRuleId: null,
    createdAt: '2026-07-10T00:00:00Z',
    updatedAt: '2026-07-10T00:00:00Z',
    ...over,
  };
}

describe('getTotals — para birimi izolasyonu', () => {
  it('1) TRY toplamına USD/EUR dahil edilmez', () => {
    const totals = getTotals(
      [
        tx({ kind: 'income', amount: 1000, currency: 'TRY' }),
        tx({ kind: 'expense', amount: 100, currency: 'USD' }),
        tx({ kind: 'expense', amount: 50, currency: 'EUR' }),
      ],
      'TRY'
    );
    expect(totals.income).toBe(1000);
    expect(totals.expense).toBe(0);
    // Hatalı davranışta net 900 (veya 850) çıkıyordu.
    expect(totals.net).toBe(1000);
  });

  it('2) USD toplamına TRY dahil edilmez', () => {
    const totals = getTotals(
      [
        tx({ kind: 'income', amount: 1000, currency: 'TRY' }),
        tx({ kind: 'income', amount: 200, currency: 'USD' }),
        tx({ kind: 'expense', amount: 80, currency: 'USD' }),
      ],
      'USD'
    );
    expect(totals.income).toBe(200);
    expect(totals.expense).toBe(80);
    expect(totals.net).toBe(120);
  });

  it('7) tek para birimi kullanan mevcut kullanıcının davranışı değişmez', () => {
    const only = [
      tx({ kind: 'income', amount: 5000, currency: 'TRY' }),
      tx({ kind: 'expense', amount: 1200, currency: 'TRY' }),
      tx({ kind: 'expense', amount: 300, currency: 'TRY', categoryId: 'cat_b' }),
    ];
    const totals = getTotals(only, 'TRY');
    expect(totals.income).toBe(5000);
    expect(totals.expense).toBe(1500);
    expect(totals.net).toBe(3500);
    expect(totals.byCategory.cat_a.total).toBe(1200);
    expect(totals.byCategory.cat_b.total).toBe(300);
  });

  it('8) sıfır işlem ve sıfır gelirde NaN/Infinity oluşmaz', () => {
    const empty = getTotals([], 'TRY');
    expect(empty.income).toBe(0);
    expect(empty.expense).toBe(0);
    expect(empty.net).toBe(0);
    expect(Number.isFinite(empty.net)).toBe(true);

    // Gelir 0, gider var → net negatif ama sonlu olmalı.
    const noIncome = getTotals([tx({ kind: 'expense', amount: 250, currency: 'TRY' })], 'TRY');
    expect(Number.isFinite(noIncome.net)).toBe(true);
    expect(noIncome.net).toBe(-250);
  });
});

describe('computeBudgetStatus — bütçe para birimi', () => {
  const budget: CategoryBudget = {
    id: 'b1',
    userId: 'u1',
    categoryId: 'cat_a',
    amount: 1000,
    currency: 'TRY',
    periodType: 'monthly',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  };

  it('3) aynı kategoride 500 TRY + 50 USD → TRY bütçede yalnızca 500 harcanmış sayılır', () => {
    const ym = new Date();
    const thisMonth = `${ym.getFullYear()}-${String(ym.getMonth() + 1).padStart(2, '0')}-10`;

    const status = computeBudgetStatus(budget, [
      tx({ amount: 500, currency: 'TRY', categoryId: 'cat_a', date: thisMonth }),
      tx({ amount: 50, currency: 'USD', categoryId: 'cat_a', date: thisMonth }),
    ]);

    expect(status.spent).toBe(500);
    expect(status.remaining).toBe(500);
    expect(status.isOver).toBe(false);
  });

  it('bütçe tutarı 0 iken yüzde NaN/Infinity olmaz', () => {
    const zero = { ...budget, amount: 0 };
    const status = computeBudgetStatus(zero, []);
    expect(Number.isFinite(status.percent)).toBe(true);
    expect(status.percent).toBe(0);
  });
});

describe('analytics — para birimi izolasyonu', () => {
  it('4) cash-flow bucket’ları para birimi karıştırmaz', () => {
    const { buckets } = cashFlowSeries(
      [
        tx({ kind: 'income', amount: 1000, currency: 'TRY', date: '2026-07-05' }),
        tx({ kind: 'income', amount: 400, currency: 'USD', date: '2026-07-05' }),
        tx({ kind: 'expense', amount: 200, currency: 'USD', date: '2026-07-06' }),
      ],
      { type: 'custom', start: '2026-07-01', end: '2026-07-31' },
      'TRY'
    );
    const income = buckets.reduce((s, b) => s + b.income, 0);
    const expense = buckets.reduce((s, b) => s + b.expense, 0);
    expect(income).toBe(1000);
    expect(expense).toBe(0);
  });

  it('5) top categories para birimi karıştırmaz', () => {
    const top = topCategories(
      [
        tx({ amount: 300, currency: 'TRY', categoryId: 'cat_a' }),
        tx({ amount: 900, currency: 'USD', categoryId: 'cat_b' }),
      ],
      'TRY'
    );
    expect(top).toHaveLength(1);
    expect(top[0].categoryId).toBe('cat_a');
    expect(top[0].total).toBe(300);
    // Tek kategori kaldığı için oran %100 olmalı — USD kaydı paydaya girmemeli.
    expect(top[0].percent).toBe(100);
  });

  it('6) savings rate yalnızca aynı para birimindeki gelir/giderden hesaplanır', () => {
    const list = [
      tx({ kind: 'income', amount: 1000, currency: 'TRY' }),
      tx({ kind: 'expense', amount: 250, currency: 'TRY' }),
      tx({ kind: 'expense', amount: 900, currency: 'USD' }),
    ];
    // netSavings TRY: 1000 - 250 = 750. USD gideri düşülmemeli.
    expect(netSavings(list, 'TRY')).toBe(750);

    const totals = getTotals(list, 'TRY');
    const savingsRate = totals.income > 0 ? totals.net / totals.income : null;
    expect(savingsRate).toBeCloseTo(0.75, 10);
  });

  it('hiç işlem yokken analytics NaN üretmez', () => {
    expect(netSavings([], 'TRY')).toBe(0);
    expect(topCategories([], 'TRY')).toEqual([]);
  });
});
