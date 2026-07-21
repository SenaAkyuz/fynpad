import {
  monthlySpendHistory,
  monthOverMonthPct,
  totalMonthlySpend,
} from '@/lib/subscriptions';
import type { Currency, Subscription } from '@/types';

/**
 * FynPad para birimi modeli — FIX 1 regresyon testleri.
 *
 * Kök sorun: abonelik özet fonksiyonları `currency`'yi yok sayıp ham `amount` topluyordu
 * (500 TRY + 10 USD → "510 TRY"). Bu testler farklı para birimlerinin BİR DAHA aynı
 * toplama karışmamasını garanti eder. Abonelik LİSTESİ ayrıca tüm para birimlerini
 * göstermeye devam eder (liste toplama yapmadığı için güvenli, ayrı test gerekmez).
 */

let seq = 0;
function sub(over: Partial<Subscription>): Subscription {
  seq += 1;
  return {
    id: `sub_${seq}`,
    userId: 'u1',
    categoryId: 'cat_subs',
    amount: 100,
    currency: 'TRY',
    kind: 'expense',
    note: null,
    frequency: 'monthly',
    dayOfWeek: null,
    dayOfMonth: 1,
    monthOfYear: null,
    startDate: '2020-01-01',
    endDate: null,
    lastGeneratedDate: null,
    active: true,
    isSubscription: true,
    serviceName: 'Service',
    planName: null,
    iconKey: null,
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: '2020-01-01T00:00:00Z',
    ...over,
  } as Subscription;
}

describe('totalMonthlySpend — abonelik para birimi izolasyonu', () => {
  it('500 TRY + 10 USD → TRY toplamı 500 (asla 510)', () => {
    const subs = [
      sub({ amount: 500, currency: 'TRY' }),
      sub({ amount: 10, currency: 'USD' }),
    ];
    expect(totalMonthlySpend(subs, 'TRY')).toBe(500);
    expect(totalMonthlySpend(subs, 'USD')).toBe(10);
    expect(totalMonthlySpend(subs, 'EUR')).toBe(0);
  });

  it('yıllık abonelik yalnızca kendi para biriminde /12 olarak eklenir', () => {
    const subs = [
      sub({ amount: 120, currency: 'USD', frequency: 'yearly', monthOfYear: 1 }),
      sub({ amount: 300, currency: 'TRY', frequency: 'monthly' }),
    ];
    expect(totalMonthlySpend(subs, 'USD')).toBe(10);
    expect(totalMonthlySpend(subs, 'TRY')).toBe(300);
  });
});

describe('monthlySpendHistory / monthOverMonthPct — para birimi izolasyonu', () => {
  it('geçmiş serisi diğer para birimlerini toplama katmaz', () => {
    const subs = [
      sub({ amount: 500, currency: 'TRY' }),
      sub({ amount: 10, currency: 'USD' }),
    ];
    const history = monthlySpendHistory(subs, 'TRY', 3);
    expect(history).toHaveLength(3);
    // Her ay (start_date çok eski → hepsinde aktif) yalnızca TRY = 500 olmalı.
    for (const point of history) {
      expect(point.total).toBe(500);
    }
  });

  it('değişim yüzdesi karışık para biriminde sıfır/NaN üretmez', () => {
    const subs: Subscription[] = [
      sub({ amount: 500, currency: 'TRY' }),
      sub({ amount: 10, currency: 'USD' }),
    ];
    const pct = monthOverMonthPct(subs, 'TRY');
    // Sabit tutar → değişim 0 (veya yeni başlangıçta null); her hâlde sonlu olmalı.
    if (pct !== null) {
      expect(Number.isFinite(pct)).toBe(true);
    }
    const missing: Currency = 'EUR';
    // Hiç EUR aboneliği yok → geçen ay 0 → null (NaN değil).
    expect(monthOverMonthPct(subs, missing)).toBeNull();
  });
});
