import {
  goalSchema,
  isoDateSchema,
  passwordFormSchema,
  quickAddSchema,
  recurringRuleSchema,
  subscriptionSchema,
} from '@/lib/validation';

/**
 * docs/claude-fix-plan/05 — form doğrulama regresyon testleri.
 *
 * Eskiden tarih alanları yalnızca z.string() idi: '2026-02-31' gibi TAKVİMDE OLMAYAN
 * tarihler forma girip DB'ye gidiyor, kullanıcı ham constraint hatası görüyordu.
 */

const VALID_UUID = '11111111-2222-4333-8444-555555555555';

function futureISO(daysAhead = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

describe('isoDateSchema', () => {
  it('geçerli tarihleri kabul eder', () => {
    expect(isoDateSchema.safeParse('2026-07-18').success).toBe(true);
    expect(isoDateSchema.safeParse('2024-02-29').success).toBe(true); // artık yıl
  });

  it('takvimde olmayan tarihleri reddeder', () => {
    expect(isoDateSchema.safeParse('2026-02-31').success).toBe(false);
    expect(isoDateSchema.safeParse('2026-02-30').success).toBe(false);
    expect(isoDateSchema.safeParse('2025-02-29').success).toBe(false); // artık yıl DEĞİL
    expect(isoDateSchema.safeParse('2026-04-31').success).toBe(false); // 30 günlük ay
    expect(isoDateSchema.safeParse('2026-13-01').success).toBe(false);
    expect(isoDateSchema.safeParse('2026-00-10').success).toBe(false);
  });

  it('biçimsiz girdileri reddeder', () => {
    expect(isoDateSchema.safeParse('').success).toBe(false);
    expect(isoDateSchema.safeParse('abc').success).toBe(false);
    expect(isoDateSchema.safeParse('18-07-2026').success).toBe(false);
    expect(isoDateSchema.safeParse('2026-7-8').success).toBe(false);
  });

  it('hata mesajı i18n key’idir', () => {
    const res = isoDateSchema.safeParse('2026-02-31');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toBe('errors.validation.dateInvalid');
    }
  });
});

describe('recurringRuleSchema — endDate >= startDate', () => {
  const base = {
    frequency: 'monthly' as const,
    dayOfMonth: 15,
    startDate: '2026-07-01',
  };

  it('bitiş başlangıçtan sonraysa geçer', () => {
    expect(recurringRuleSchema.safeParse({ ...base, endDate: '2026-12-31' }).success).toBe(true);
  });

  it('bitiş = başlangıç geçer', () => {
    expect(recurringRuleSchema.safeParse({ ...base, endDate: '2026-07-01' }).success).toBe(true);
  });

  it('bitiş başlangıçtan ÖNCEyse reddeder', () => {
    const res = recurringRuleSchema.safeParse({ ...base, endDate: '2026-06-30' });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.message === 'errors.validation.endDateBeforeStart')).toBe(
        true
      );
    }
  });

  it('bitiş yoksa (süresiz) geçer', () => {
    expect(recurringRuleSchema.safeParse({ ...base, endDate: null }).success).toBe(true);
  });

  it('ayın 31’i kuralı kabul edilir (kısa aylarda DB tarafı ele alır)', () => {
    expect(
      recurringRuleSchema.safeParse({ ...base, dayOfMonth: 31, endDate: null }).success
    ).toBe(true);
  });

  it('geçersiz takvim tarihi startDate’te reddedilir', () => {
    expect(recurringRuleSchema.safeParse({ ...base, startDate: '2026-02-31' }).success).toBe(false);
  });
});

describe('subscriptionSchema — endDate >= startDate', () => {
  const base = {
    serviceName: 'Netflix',
    iconKey: 'tv',
    amount: 149.99,
    currency: 'TRY' as const,
    frequency: 'monthly' as const,
    dayOfMonth: 5,
    startDate: '2026-07-01',
  };

  it('bitiş başlangıçtan önceyse reddeder', () => {
    expect(subscriptionSchema.safeParse({ ...base, endDate: '2026-01-01' }).success).toBe(false);
  });

  it('geçerli aralığı kabul eder', () => {
    expect(subscriptionSchema.safeParse({ ...base, endDate: '2027-07-01' }).success).toBe(true);
  });
});

describe('goalSchema — hedef tarihi', () => {
  const base = {
    name: 'Tatil',
    iconKey: 'plane',
    targetAmount: 50000,
    currency: 'TRY' as const,
  };

  it('gelecekteki tarihi kabul eder', () => {
    expect(goalSchema.safeParse({ ...base, targetDate: futureISO() }).success).toBe(true);
  });

  it('geçmiş tarihi reddeder', () => {
    const res = goalSchema.safeParse({ ...base, targetDate: '2020-01-01' });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.message === 'goals.errors.targetDateInPast')).toBe(true);
    }
  });

  it('tarihsiz hedef geçer', () => {
    expect(goalSchema.safeParse({ ...base, targetDate: null }).success).toBe(true);
  });
});

describe('quickAddSchema', () => {
  const base = {
    kind: 'expense' as const,
    amount: 100,
    categoryId: VALID_UUID,
    currency: 'TRY' as const,
    date: '2026-07-18',
    recurring: false,
  };

  it('geçerli işlemi kabul eder', () => {
    expect(quickAddSchema.safeParse(base).success).toBe(true);
  });

  it('negatif tutarı reddeder', () => {
    expect(quickAddSchema.safeParse({ ...base, amount: -5 }).success).toBe(false);
    expect(quickAddSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
  });

  it('geçersiz UUID kategoriyi reddeder', () => {
    expect(quickAddSchema.safeParse({ ...base, categoryId: 'not-a-uuid' }).success).toBe(false);
  });

  it('sahte tarihi reddeder', () => {
    expect(quickAddSchema.safeParse({ ...base, date: '2026-02-31' }).success).toBe(false);
  });
});

describe('passwordFormSchema — yeniden doğrulama', () => {
  it('change modunda mevcut şifre zorunlu', () => {
    const schema = passwordFormSchema(true);
    const res = schema.safeParse({
      currentPassword: '',
      password: 'yenisifre1',
      confirmPassword: 'yenisifre1',
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(
        res.error.issues.some((i) => i.message === 'errors.validation.currentPasswordRequired')
      ).toBe(true);
    }
  });

  it('create modunda mevcut şifre istenmez', () => {
    const schema = passwordFormSchema(false);
    expect(
      schema.safeParse({
        currentPassword: '',
        password: 'yenisifre1',
        confirmPassword: 'yenisifre1',
      }).success
    ).toBe(true);
  });

  it('şifreler eşleşmiyorsa reddeder', () => {
    const schema = passwordFormSchema(true);
    const res = schema.safeParse({
      currentPassword: 'eski123a',
      password: 'yenisifre1',
      confirmPassword: 'baskasifre1',
    });
    expect(res.success).toBe(false);
  });
});
