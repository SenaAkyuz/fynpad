/**
 * Paylaşılan React Query key sabitleri. useSubscriptions ↔ useRecurringRules arasındaki
 * dairesel import'u kırmak için buraya taşındı — her iki hook (ve offlineMutations) key'leri
 * birbirinden değil buradan import eder.
 */
export const subscriptionsKey = ['subscriptions'] as const;
export const recurringRulesKey = ['recurring-rules'] as const;
