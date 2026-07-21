import { countOccurrencesUpTo, nextOccurrenceDate } from '@/lib/recurring';

/**
 * `nextOccurrenceDate`, Quick Add'de "Sonraki tekrar: X" metnini üretir.
 *
 * Bu metin scheduler'ın GERÇEKTE üreteceği tarihle aynı olmalı; aksi halde kullanıcıya
 * yanlış söz verilir. Beklentiler DB'deki `recurring_rule_fires_on` (0003) semantiğinden
 * türetilmiştir: weekly → dow eşleşmesi (0=Pazar), monthly → min(dayOfMonth, ayın son günü).
 */

const base = { startDate: '2026-01-01', endDate: null as string | null };

describe('nextOccurrenceDate', () => {
  it('daily: ertesi gün (bugünü DAHİL ETMEZ)', () => {
    expect(
      nextOccurrenceDate({ ...base, frequency: 'daily' }, new Date(2026, 6, 20))
    ).toBe('2026-07-21');
  });

  it('monthly: ayın 1 seçiliyken 20 Temmuz sonrası ilk tekrar 1 Ağustos', () => {
    expect(
      nextOccurrenceDate({ ...base, frequency: 'monthly', dayOfMonth: 1 }, new Date(2026, 6, 20))
    ).toBe('2026-08-01');
  });

  it('monthly: ayın 31 seçiliyken 30 çeken ayda son güne sığdırılır', () => {
    // Nisan 30 gün çeker → 31 yerine 30 Nisan.
    expect(
      nextOccurrenceDate({ ...base, frequency: 'monthly', dayOfMonth: 31 }, new Date(2026, 3, 1))
    ).toBe('2026-04-30');
  });

  it('monthly: şubat 28/29 sığdırma (artık yıl)', () => {
    expect(
      nextOccurrenceDate({ ...base, frequency: 'monthly', dayOfMonth: 31 }, new Date(2028, 1, 1))
    ).toBe('2028-02-29');
  });

  it('weekly: dayOfWeek 0=Pazar (JS getDay ile aynı)', () => {
    // 20 Temmuz 2026 Pazartesi → sonraki Pazar 26 Temmuz.
    const next = nextOccurrenceDate(
      { ...base, frequency: 'weekly', dayOfWeek: 0 },
      new Date(2026, 6, 20)
    );
    expect(next).toBe('2026-07-26');
    expect(new Date(`${next}T00:00:00`).getDay()).toBe(0);
  });

  it('yearly: ay + gün eşleşmesi, gelecek yıla taşar', () => {
    expect(
      nextOccurrenceDate(
        { ...base, frequency: 'yearly', monthOfYear: 3, dayOfMonth: 15 },
        new Date(2026, 6, 20)
      )
    ).toBe('2027-03-15');
  });

  it('startDate gelecekteyse aramaya oradan başlar', () => {
    expect(
      nextOccurrenceDate(
        { startDate: '2026-12-01', endDate: null, frequency: 'daily' },
        new Date(2026, 6, 20)
      )
    ).toBe('2026-12-01');
  });

  it('endDate geçilmişse null döner (sonsuz döngüye girmez)', () => {
    expect(
      nextOccurrenceDate(
        { startDate: '2026-01-01', endDate: '2026-07-19', frequency: 'daily' },
        new Date(2026, 6, 20)
      )
    ).toBeNull();
  });

  it('bir sonraki occurrence bulunamazsa null (kapalı aralık)', () => {
    expect(
      nextOccurrenceDate(
        { startDate: '2026-01-01', endDate: '2026-07-25', frequency: 'monthly', dayOfMonth: 1 },
        new Date(2026, 6, 20)
      )
    ).toBeNull();
  });
});

/**
 * `countOccurrencesUpTo`, geçmiş başlangıçta bilgi satırındaki "N işlem oluşturulacak"
 * sayısını üretir; catch-up'ın gerçekte üreteceği occurrence sayısıyla birebir olmalı.
 */
describe('countOccurrencesUpTo', () => {
  it('kira senaryosu: 6 Mayıs başlangıç, aylık 6, bugün 20 Temmuz → 3 işlem', () => {
    // 6 May, 6 Haz, 6 Tem = 3 (fires_on ayın 6'sı).
    const count = countOccurrencesUpTo(
      { startDate: '2026-05-06', endDate: null, frequency: 'monthly', dayOfMonth: 6 },
      new Date(2026, 6, 20)
    );
    expect(count).toBe(3);
  });

  it('başlangıç bugün (occurrence bugün) → 1', () => {
    expect(
      countOccurrencesUpTo(
        { startDate: '2026-07-20', endDate: null, frequency: 'monthly', dayOfMonth: 20 },
        new Date(2026, 6, 20)
      )
    ).toBe(1);
  });

  it('gelecek başlangıç → bugüne kadar 0', () => {
    expect(
      countOccurrencesUpTo(
        { startDate: '2026-08-01', endDate: null, frequency: 'monthly', dayOfMonth: 1 },
        new Date(2026, 6, 20)
      )
    ).toBe(0);
  });

  it('daily: 10 gün önce başlangıç → 11 işlem (dahil)', () => {
    expect(
      countOccurrencesUpTo(
        { startDate: '2026-07-10', endDate: null, frequency: 'daily' },
        new Date(2026, 6, 20)
      )
    ).toBe(11);
  });

  it('catch-up penceresi: çok eski başlangıç 400 günle sınırlı', () => {
    // 3 yıl önce başlayan günlük kural → yalnızca son 400 gün + bugün sayılır (≈401).
    const count = countOccurrencesUpTo(
      { startDate: '2023-01-01', endDate: null, frequency: 'daily' },
      new Date(2026, 6, 20)
    );
    expect(count).toBeLessThanOrEqual(401);
    expect(count).toBeGreaterThan(390);
  });
});
