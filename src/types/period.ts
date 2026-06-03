/**
 * Takvim-bazlı dönem filtresi (rolling-window DEĞİL). 'week' tipi BİLİNÇLİ OLARAK YOK.
 * Tüm tarihler 'YYYY-MM-DD' yerel ISO string — transaction.date ve listTransactions
 * from/to ile aynı format, böylece dönüşüm gerekmez.
 */
export type PeriodType = 'day' | 'month' | 'year' | 'custom';

export type PeriodFilter =
  | { type: 'day'; anchorDate: string }
  | { type: 'month'; anchorDate: string }
  | { type: 'year'; anchorDate: string }
  | { type: 'custom'; start: string; end: string };

/** Sorgu için kapsayıcı (inclusive) tarih aralığı. */
export type PeriodRange = { from: string; to: string };
