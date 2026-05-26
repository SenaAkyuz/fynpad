import { z } from 'zod';

/**
 * Zod schemas. Hata mesajları i18n KEY'idir — form render'da `t(error.message)` ile çevrilir.
 */

const emailSchema = z.string().email('errors.validation.emailInvalid');

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

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

/** Tekrarlama yapılandırması (Part 6). Frequency'e göre ilgili gün alanı zorunlu. */
export const recurringRuleSchema = z
  .object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
    dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
    monthOfYear: z.number().int().min(1).max(12).nullable().optional(),
    startDate: z.string(),
    endDate: z.string().nullable().optional(),
  })
  .refine(
    (d) => {
      if (d.frequency === 'weekly' && d.dayOfWeek == null) return false;
      if ((d.frequency === 'monthly' || d.frequency === 'yearly') && d.dayOfMonth == null) return false;
      if (d.frequency === 'yearly' && d.monthOfYear == null) return false;
      return true;
    },
    { message: 'errors.validation.recurringConfigIncomplete' }
  );

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
    date: z.string(),
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
  date: z.string(),
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
    startDate: z.string(),
    endDate: z.string().nullable().optional(),
    note: z.string().max(200, 'errors.transaction.noteTooLong').nullable().optional(),
  })
  .refine((d) => d.frequency !== 'yearly' || d.monthOfYear != null, {
    message: 'errors.validation.recurringConfigIncomplete',
    path: ['monthOfYear'],
  });

export type SubscriptionForm = z.infer<typeof subscriptionSchema>;

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
