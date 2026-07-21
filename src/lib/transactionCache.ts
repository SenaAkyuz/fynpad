import type { Transaction } from '@/types';

export type TransactionRange = { from?: string; to?: string };

/** Canonical kullanıcı cache'inden istenen takvim aralığını türetir. */
export function filterTransactionsByRange(
  transactions: Transaction[],
  range?: TransactionRange
): Transaction[] {
  if (!range?.from && !range?.to) return transactions;
  return transactions.filter(
    (tx) => (!range.from || tx.date >= range.from) && (!range.to || tx.date <= range.to)
  );
}

export function addTransactionToCache(
  transactions: Transaction[] | undefined,
  transaction: Transaction
): Transaction[] {
  return [transaction, ...(transactions ?? [])];
}

export function updateTransactionInCache(
  transactions: Transaction[] | undefined,
  id: string,
  patch: Partial<Transaction>
): Transaction[] {
  return (transactions ?? []).map((tx) => (tx.id === id ? { ...tx, ...patch } : tx));
}

export function deleteTransactionFromCache(
  transactions: Transaction[] | undefined,
  id: string
): Transaction[] {
  return (transactions ?? []).filter((tx) => tx.id !== id);
}
