import type { Currency } from '@/types/transaction';

/**
 * Finansal hedef (Part 14, brief v1.2 #13). Kullanıcı ad + hedef tutar + (opsiyonel) son tarih +
 * ikon tanımlar; current_amount manuel +/- ile artar. completed_at DB trigger'ı ile otomatik
 * set/clear edilir (current >= target → set, altına düşünce → null).
 */
export type Goal = {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: Currency;
  /** ISO 'YYYY-MM-DD' veya süresiz hedefte null */
  targetDate: string | null;
  /** GoalIconPicker key'i (örn. 'plane', 'home') */
  iconKey: string | null;
  /** Hedefe ulaşılınca DB trigger'ı doldurur; altına düşünce null'a döner */
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Computed: hedef + türetilmiş ilerleme/durum (GoalCard + insight için). */
export type GoalProgress = {
  goal: Goal;
  /** 0-100, 100'de clamp */
  percent: number;
  /** max(0, target - current) */
  remaining: number;
  isCompleted: boolean;
  /** targetDate yoksa null; bugünden son tarihe gün farkı (geçtiyse negatif) */
  daysUntilDeadline: number | null;
  /** son tarih ≤ 30 gün + ilerleme < %50 + tamamlanmamış */
  isUrgent: boolean;
  /** kalan tutarı son tarihe kadar bölünce gereken aylık birikim; deadline yoksa/tamamsa null */
  monthlyNeeded: number | null;
};
