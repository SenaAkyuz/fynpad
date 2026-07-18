import { z } from 'zod';

/**
 * Zod schemas. Hata mesajları i18n KEY'idir — form render'da `t(error.message)` ile çevrilir.
 */

const emailSchema = z.string().email('errors.validation.emailInvalid');

/**
 * Ortak ISO tarih şeması — 'YYYY-MM-DD'.
 *
 * Eskiden tarih alanları yalnızca `z.string()` idi: '2026-02-31', 'abc' veya boş string
 * form doğrulamasından geçip DB'ye gidiyor, kullanıcı ham/generic bir constraint hatası
 * görüyordu. Bu şema hem formatı hem GERÇEK TAKVİM tarihini kontrol eder.
 *
 * Takvim kontrolü Date round-trip ile yapılır: Date(2026,1,31) → 3 Mart'a taşar, geri
 * biçimlendirildiğinde girdiyle eşleşmez → reddedilir.
 */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'errors.validation.dateInvalid')
  .refine((value) => {
    const [y, m, d] = value.split('-').map(Number);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const parsed = new Date(y, m - 1, d);
    return (
      parsed.getFullYear() === y && parsed.getMonth() === m - 1 && parsed.getDate() === d
    );
  }, 'errors.validation.dateInvalid');

/** Bugünün yerel ISO tarihi — geçmiş/gelecek karşılaştırmaları için. */
function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

/**
 * endDate >= startDate kuralı. ISO 'YYYY-MM-DD' sözlüksel sıralaması takvim
 * sıralamasıyla aynı olduğu için string karşılaştırması yeterli ve TZ'den bağımsızdır.
 */
function endNotBeforeStart(d: { startDate: string; endDate?: string | null }): boolean {
  if (!d.endDate) return true;
  return d.endDate >= d.startDate;
}

const passwordSchema = z
  .string()
  .min(8, 'errors.validation.passwordTooShort')
  .regex(/[A-Za-z]/, 'errors.validation.passwordNeedsLetter')
  .regex(/[0-9]/, 'errors.validation.passwordNeedsNumber');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'errors.validation.passwordRequired'),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'errors.validation.passwordsDoNotMatch',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'errors.validation.passwordsDoNotMatch',
    path: ['confirmPassword'],
  });

/**
 * Şifre DEĞİŞTİRME (mevcut şifresi olan hesap). Yeniden doğrulama için mevcut şifre
 * zorunlu — bkz. lib/auth.ts reauthenticateWithPassword. Şifre EKLEME ('create' modu,
 * Google-only hesap) bu şemayı kullanmaz: doğrulanacak mevcut şifre yoktur.
 */
/**
 * Alan ŞEKLİ her iki modda aynıdır (react-hook-form resolver tipi tek bir form tipine
 * bağlanmak zorunda); fark yalnızca `currentPassword`'ün zorunlu olup olmamasıdır.
 *
 * - requireCurrent = true  → 'change' modu: mevcut şifre zorunlu (yeniden doğrulama).
 * - requireCurrent = false → 'create' modu: Google-only hesaba ilk şifre; doğrulanacak
 *   mevcut şifre yoktur, alan gizlenir ve boş geçilir.
 */
export function passwordFormSchema(requireCurrent: boolean) {
  return z
    .object({
      currentPassword: requireCurrent
        ? z.string().min(1, 'errors.validation.currentPasswordRequired')
        : z.string().optional().default(''),
      password: passwordSchema,
      confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: 'errors.validation.passwordsDoNotMatch',
      path: ['confirmPassword'],
    });
}

export type ChangePasswordForm = {
  currentPassword: string;
  password: string;
  confirmPassword: string;
};

/** OTP tabanlı şifre sıfırlama: 6 haneli kod + yeni şifre (e-posta route param'dan gelir). */
export const resetPasswordOtpSchema = z
  .object({
    // Supabase OTP uzunluğu projeye göre 6–10 hane olabilir (Dashboard ayarı). Sabit
    // 6 yerine aralık kabul et ki konfigürasyon değişse de bozulmasın.
    token: z.string().regex(/^\d{6,10}$/, 'errors.validation.otpInvalid'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'errors.validation.passwordsDoNotMatch',
    path: ['confirmPassword'],
  });

/** Kayıt (signup) e-posta doğrulama: yalnızca 6–10 haneli OTP kodu (şifre kayıtta belirlendi). */
export const verifyEmailOtpSchema = z.object({
  token: z.string().regex(/^\d{6,10}$/, 'errors.validation.otpInvalid'),
});

export type VerifyEmailOtpForm = z.infer<typeof verifyEmailOtpSchema>;

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;
export type ResetPasswordOtpForm = z.infer<typeof resetPasswordOtpSchema>;

/** Tekrarlama yapılandırması (Part 6). Frequency'e göre ilgili gün alanı zorunlu. */
export const recurringRuleSchema = z
  .object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
    dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
    monthOfYear: z.number().int().min(1).max(12).nullable().optional(),
    startDate: isoDateSchema,
    endDate: isoDateSchema.nullable().optional(),
  })
  .refine(
    (d) => {
      if (d.frequency === 'weekly' && d.dayOfWeek == null) return false;
      if ((d.frequency === 'monthly' || d.frequency === 'yearly') && d.dayOfMonth == null) return false;
      if (d.frequency === 'yearly' && d.monthOfYear == null) return false;
      return true;
    },
    { message: 'errors.validation.recurringConfigIncomplete' }
  )
  .refine(endNotBeforeStart, {
    message: 'errors.validation.endDateBeforeStart',
    path: ['endDate'],
  });

export type RecurringRuleForm = z.infer<typeof recurringRuleSchema>;

/** Quick Add işlem formu. Transfer submit edilmez (UI'da disabled). */
export const quickAddSchema = z
  .object({
    kind: z.enum(['income', 'expense']),
    amount: z
      .number({ message: 'errors.transaction.amountRequired' })
      .positive('errors.transaction.amountPositive'),
    categoryId: z.string().uuid('errors.transaction.categoryRequired'),
    currency: z.enum(['TRY', 'USD', 'EUR']),
    date: isoDateSchema,
    note: z.string().max(200, 'errors.transaction.noteTooLong').nullable().optional(),
    recurring: z.boolean(),
    recurringRule: recurringRuleSchema.nullable().optional(),
  })
  .refine((d) => !d.recurring || d.recurringRule != null, {
    message: 'errors.validation.recurringConfigIncomplete',
    path: ['recurringRule'],
  });

export type QuickAddForm = z.infer<typeof quickAddSchema>;

/** İşlem düzenleme formu — Quick Add'in transaction alanları (recurring YOK, sadece tek işlem). */
export const transactionEditSchema = z.object({
  kind: z.enum(['income', 'expense']),
  amount: z
    .number({ message: 'errors.transaction.amountRequired' })
    .positive('errors.transaction.amountPositive'),
  categoryId: z.string().uuid('errors.transaction.categoryRequired'),
  currency: z.enum(['TRY', 'USD', 'EUR']),
  date: isoDateSchema,
  note: z.string().max(200, 'errors.transaction.noteTooLong').nullable().optional(),
});

export type TransactionEditForm = z.infer<typeof transactionEditSchema>;

/** Abonelik formu (Part 7). Subscription = recurring_rules'un is_subscription alt türü. */
export const subscriptionSchema = z
  .object({
    serviceName: z.string().trim().min(1, 'subscriptions.errors.serviceNameRequired'),
    planName: z.string().max(60).nullable().optional(),
    iconKey: z.string().min(1),
    amount: z
      .number({ message: 'subscriptions.errors.amountRequired' })
      .positive('subscriptions.errors.amountPositive'),
    currency: z.enum(['TRY', 'USD', 'EUR']),
    frequency: z.enum(['monthly', 'yearly']),
    dayOfMonth: z.number().int().min(1).max(31),
    monthOfYear: z.number().int().min(1).max(12).nullable().optional(),
    startDate: isoDateSchema,
    endDate: isoDateSchema.nullable().optional(),
    note: z.string().max(200, 'errors.transaction.noteTooLong').nullable().optional(),
  })
  .refine((d) => d.frequency !== 'yearly' || d.monthOfYear != null, {
    message: 'errors.validation.recurringConfigIncomplete',
    path: ['monthOfYear'],
  })
  .refine(endNotBeforeStart, {
    message: 'errors.validation.endDateBeforeStart',
    path: ['endDate'],
  });

export type SubscriptionForm = z.infer<typeof subscriptionSchema>;

/** Finansal hedef formu (Part 14, brief #13). */
export const goalSchema = z.object({
  name: z.string().trim().min(1, 'goals.errors.nameRequired').max(100),
  description: z.string().max(200, 'goals.errors.descriptionTooLong').nullable().optional(),
  iconKey: z.string().min(1),
  targetAmount: z
    .number({ message: 'goals.errors.amountRequired' })
    .positive('goals.errors.amountPositive'),
  currency: z.enum(['TRY', 'USD', 'EUR']),
  // Hedef tarihi geçmişte olamaz: geçmiş bir tarih "gereken aylık birikim" hesabını
  // anlamsız kılar (kalan ay sayısı ≤ 0). Bugün kabul edilir.
  targetDate: isoDateSchema
    .refine((v) => v >= todayISO(), 'goals.errors.targetDateInPast')
    .nullable()
    .optional(),
  currentAmount: z.number().min(0).optional(),
});

export type GoalForm = z.infer<typeof goalSchema>;

/** Yeni/düzenlenen kategori formu. */
export const categoryEditSchema = z.object({
  name: z.string().trim().min(1, 'errors.category.nameRequired'),
  icon: z.string().min(1),
  color: z.string().min(1),
  kind: z.enum(['income', 'expense']),
});

export type CategoryEditForm = z.infer<typeof categoryEditSchema>;

/** Kategori bazlı bütçe formu (Part 8, brief 4.5). Sadece expense kategoriler. */
export const budgetSchema = z.object({
  categoryId: z.string().uuid('errors.budget.categoryRequired'),
  amount: z
    .number({ message: 'errors.budget.amountRequired' })
    .positive('errors.budget.amountPositive'),
  currency: z.enum(['TRY', 'USD', 'EUR']),
});

export type BudgetForm = z.infer<typeof budgetSchema>;
