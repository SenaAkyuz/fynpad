import type { Session, User } from '@supabase/supabase-js';

import type { BudgetPeriodType, BudgetStatus, CategoryBudget } from '@/types/budget';
import type { Goal, GoalProgress } from '@/types/goal';
import type { Insight, InsightKind, InsightSeverity } from '@/types/insight';
import type { AuthResult, DefaultCurrency } from '@/lib/auth';
import type { Locale, ThemeMode } from '@/stores/useAppStore';
import type { AuthState } from '@/stores/useAuthStore';
import type { ResolvedMode, Theme } from '@/theme/ThemeProvider';
import type { ThemeColors, TypographyVariant } from '@/theme/tokens';
import type {
  Category,
  CategoryKind,
  Currency,
  RecurringFrequency,
  RecurringRule,
  Subscription,
  Transaction,
} from '@/types/transaction';

export { isSubscription } from '@/types/transaction';

export type {
  AuthResult,
  AuthState,
  BudgetPeriodType,
  BudgetStatus,
  Category,
  CategoryBudget,
  CategoryKind,
  Currency,
  DefaultCurrency,
  Goal,
  GoalProgress,
  Insight,
  InsightKind,
  InsightSeverity,
  Locale,
  RecurringFrequency,
  RecurringRule,
  ResolvedMode,
  Session,
  Subscription,
  Theme,
  ThemeColors,
  ThemeMode,
  Transaction,
  TypographyVariant,
  User,
};
