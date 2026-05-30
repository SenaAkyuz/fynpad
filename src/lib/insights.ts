import {
  compareMonthlySavings,
  computeMonthlyNetSavings,
  computeMonthlySavingsRequired,
} from '@/lib/analytics';
import { computeGoalProgress } from '@/lib/goals';
import { formatAbsoluteDate, formatCurrency, fromISODate } from '@/lib/format';
import i18n from '@/locales/i18n';
import type { Profile } from '@/hooks/useProfile';
import type {
  BudgetStatus,
  Category,
  CategoryBudget,
  Goal,
  Insight,
  InsightSeverity,
  Locale,
  Subscription,
  Transaction,
} from '@/types';

const MS_DAY = 86_400_000;

/** Hedef/birikim kurallarının ihtiyaç duyduğu minimal bağlam (Goals ekranı bunu kullanır). */
export type GoalInsightContext = {
  transactions: Transaction[];
  goals: Goal[];
  profile?: Profile | null;
  locale: Locale;
  today: Date;
};

export type GenerateContext = GoalInsightContext & {
  categories: Category[];
  budgets: CategoryBudget[];
  subscriptions: Subscription[];
  budgetStatuses: BudgetStatus[];
};

function severityOrder(s: InsightSeverity): number {
  return { warning: 0, info: 1, suggestion: 2 }[s];
}

/** Kategori görünen adı: default ise i18n key çevrilir, custom ise literal. */
function categoryDisplay(cat: Category | undefined): string {
  if (!cat) return '';
  return cat.isDefault ? i18n.t(cat.name) : cat.name;
}

/** 'YYYY-MM' anahtarı. */
function yearMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Bu aydan önceki N ayın 'YYYY-MM' listesi (bu ay hariç). */
function previousMonths(today: Date, count: number): string[] {
  const out: string[] = [];
  for (let i = 1; i <= count; i++) {
    out.push(yearMonth(new Date(today.getFullYear(), today.getMonth() - i, 1)));
  }
  return out;
}

/** Bir kategorinin belirli ay(lar)daki toplam gideri. */
function sumExpense(transactions: Transaction[], categoryId: string, months: Set<string>): number {
  let total = 0;
  for (const tx of transactions) {
    if (tx.kind === 'expense' && tx.categoryId === categoryId && months.has(tx.date.slice(0, 7))) {
      total += tx.amount;
    }
  }
  return total;
}

/**
 * Kural 1 — Bütçe aşımı. Part 8'deki rozet görsel; buradaki insight ayrı uyarı listesi (tamamlayıcı).
 */
function ruleBudgetExceeded(ctx: GenerateContext): Insight[] {
  return ctx.budgetStatuses
    .filter((s) => s.isOver)
    .map((s) => {
      const cat = ctx.categories.find((c) => c.id === s.budget.categoryId);
      return {
        id: `budget:${s.budget.categoryId}`,
        kind: 'budget_exceeded' as const,
        severity: 'warning' as const,
        titleKey: 'insights.budgetExceeded.title',
        titleParams: { category: categoryDisplay(cat) },
        descKey: 'insights.budgetExceeded.desc',
        descParams: {
          amount: formatCurrency(s.overAmount, s.budget.currency, ctx.locale),
          pct: Math.round((s.spent / s.budget.amount - 1) * 100),
        },
        actionLabelKey: 'insights.viewBudget',
        actionTarget: '/(tabs)/analytics',
        iconName: 'alert-triangle',
      };
    });
}

/**
 * Kural 2 — Ortalamanın üzerinde harcama. Bu ayki gider, önceki 3 ayın ortalamasının %30+
 * üzerindeyse uyarı. 3 aylık geçmiş yoksa (avg=0) atla.
 */
function ruleAboveAverageSpending(ctx: GenerateContext): Insight[] {
  const result: Insight[] = [];
  const thisMonth = new Set([yearMonth(ctx.today)]);
  const prev3 = new Set(previousMonths(ctx.today, 3));

  for (const cat of ctx.categories.filter((c) => c.kind === 'expense')) {
    const thisMonthSpend = sumExpense(ctx.transactions, cat.id, thisMonth);
    if (thisMonthSpend === 0) continue;

    const avgSpend = sumExpense(ctx.transactions, cat.id, prev3) / 3;
    if (avgSpend === 0) continue; // geçmiş yok → atla

    const ratio = thisMonthSpend / avgSpend;
    if (ratio < 1.3) continue; // %30+ üstü olmalı (altı noise)

    result.push({
      id: `above-avg:${cat.id}`,
      kind: 'above_average_spending',
      severity: 'info',
      titleKey: 'insights.aboveAverage.title',
      titleParams: { category: categoryDisplay(cat) },
      descKey: 'insights.aboveAverage.desc',
      descParams: { pct: Math.round((ratio - 1) * 100) },
      actionLabelKey: 'insights.viewAnalytics',
      actionTarget: '/(tabs)/analytics',
      iconName: 'trending-up',
    });
  }
  return result;
}

/**
 * Kural 3 — Eski abonelik review. Kullanım verisi yok; yorumlanabilir kural: abonelik 60+ gündür
 * aktifse "hâlâ kullanıyor musun?" hatırlatması (60-90 / 180-210 / 365-395 gün pencereleri).
 */
function ruleSubscriptionReview(ctx: GenerateContext): Insight[] {
  const result: Insight[] = [];

  for (const sub of ctx.subscriptions) {
    const days = Math.floor((ctx.today.getTime() - fromISODate(sub.startDate).getTime()) / MS_DAY);
    const shouldRemind =
      (days >= 60 && days < 90) || (days >= 180 && days < 210) || (days >= 365 && days < 395);
    if (!shouldRemind) continue;

    const months = Math.floor(days / 30);
    result.push({
      id: `sub-review:${sub.id}:${months}`,
      kind: 'subscription_review',
      severity: 'suggestion',
      titleKey: 'insights.subscriptionReview.title',
      titleParams: { name: sub.serviceName },
      descKey: 'insights.subscriptionReview.desc',
      descParams: { months },
      actionLabelKey: 'insights.viewSubscription',
      actionTarget: '/subscriptions',
      iconName: 'rotate-ccw',
    });
  }
  return result;
}

/**
 * Kural 4 — Hedef son tarihi yaklaşıyor (Part 14, brief #13 "tarih yaklaştığında uyarı verilir").
 * Son tarih ≤ 30 gün + ilerleme < %50 + tamamlanmamış → uyarı.
 */
function ruleGoalDeadline(ctx: GoalInsightContext): Insight[] {
  const result: Insight[] = [];

  for (const goal of ctx.goals) {
    if (!goal.targetDate || goal.completedAt) continue;
    const progress = computeGoalProgress(goal, ctx.today);
    if (
      progress.daysUntilDeadline !== null &&
      progress.daysUntilDeadline > 0 &&
      progress.daysUntilDeadline <= 30 &&
      progress.percent < 50
    ) {
      result.push({
        id: `goal-urgent:${goal.id}`,
        kind: 'goal_deadline',
        severity: 'warning',
        titleKey: 'insights.goalDeadline.title',
        titleParams: { name: goal.name },
        descKey: 'insights.goalDeadline.desc',
        descParams: { percent: Math.round(progress.percent), days: progress.daysUntilDeadline },
        actionLabelKey: 'insights.viewGoals',
        actionTarget: '/(tabs)/goals',
        iconName: 'target',
      });
    }
  }
  return result;
}

/**
 * Kural 5 — Hedef için gereken aylık birikim (Part 14 ek). Son tarihi olan, tamamlanmamış ve
 * eksiği olan hedefler için "ayda X biriktir" önerisi. Fake bilgi yok — monthlyNeeded yalnızca
 * kalan tutar / kalan ay'dan türetilir (computeGoalProgress).
 */
function ruleRequiredMonthlySavings(ctx: GoalInsightContext): Insight[] {
  const result: Insight[] = [];
  for (const goal of ctx.goals) {
    if (!goal.targetDate || goal.completedAt || goal.currentAmount >= goal.targetAmount) continue;
    const progress = computeGoalProgress(goal, ctx.today);
    if (progress.monthlyNeeded === null || progress.monthlyNeeded <= 0) continue;

    result.push({
      id: `goal-required-monthly:${goal.id}`,
      kind: 'required_monthly_savings',
      severity: 'info',
      titleKey: 'insights.requiredMonthlySavings.title',
      titleParams: { name: goal.name },
      descKey: 'insights.requiredMonthlySavings.desc',
      descParams: {
        amount: formatCurrency(progress.monthlyNeeded, goal.currency, ctx.locale),
        deadline: formatAbsoluteDate(goal.targetDate, ctx.locale),
      },
      actionLabelKey: 'insights.viewGoals',
      actionTarget: '/(tabs)/goals',
      iconName: 'trending-up',
    });
  }
  return result;
}

/**
 * Kural 6 — Aylık birikim kontrolü (Part 14, tasarım revizyonu). Kullanıcı manuel hedef SET ETMEZ:
 * gereken aylık birikim hedeflerden otomatik hesaplanır, bu ayki gerçek net birikimle (gelir−gider)
 * para birimi başına kıyaslanır. Son tarihli hedef yoksa insight üretilmez. Kur dönüşümü yok.
 */
function ruleMonthlySavingsCheck(ctx: GoalInsightContext): Insight[] {
  const required = computeMonthlySavingsRequired(ctx.goals, ctx.today);
  if (!required.hasAnyDeadline) return [];

  const actual = computeMonthlyNetSavings(ctx.transactions, ctx.today);
  const comparisons = compareMonthlySavings(required, actual);

  return comparisons.map((c): Insight => {
    const isPositive = c.status === 'over' || c.status === 'on-track';
    return {
      id: `monthly-savings-check:${c.currency}`,
      kind: 'monthly_savings_check',
      severity: isPositive ? 'info' : 'warning',
      titleKey: isPositive
        ? 'insights.monthlySavingsCheck.titlePositive'
        : 'insights.monthlySavingsCheck.titleNegative',
      descKey: 'insights.monthlySavingsCheck.desc',
      descParams: {
        actual: formatCurrency(c.actual, c.currency, ctx.locale),
        required: formatCurrency(c.required, c.currency, ctx.locale),
        diff: Math.abs(c.percent - 100).toFixed(1),
      },
      actionLabelKey: 'insights.viewGoals',
      actionTarget: '/(tabs)/goals',
      iconName: isPositive ? 'check' : 'alert-triangle',
    };
  });
}

/**
 * Basit kural seti → akıllı uyarılar (brief 5/3). Deterministic, AI yok. Severity'ye göre sıralanır
 * (warning > info > suggestion), en fazla 5 gösterilir.
 */
export function generateInsights(ctx: GenerateContext): Insight[] {
  const insights: Insight[] = [
    ...ruleBudgetExceeded(ctx),
    ...ruleGoalDeadline(ctx),
    ...ruleMonthlySavingsCheck(ctx),
    ...ruleRequiredMonthlySavings(ctx),
    ...ruleAboveAverageSpending(ctx),
    ...ruleSubscriptionReview(ctx),
  ];
  insights.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));
  return insights.slice(0, 5);
}

/**
 * Goals ekranı için yalnızca hedef/birikim ilişkili insight'lar (deadline + gereken aylık birikim +
 * aylık hedef kontrolü). Genel listenin 5'lik üst sınırından bağımsız hesaplanır.
 */
export function generateGoalInsights(ctx: GoalInsightContext): Insight[] {
  const insights: Insight[] = [
    ...ruleGoalDeadline(ctx),
    ...ruleMonthlySavingsCheck(ctx),
    ...ruleRequiredMonthlySavings(ctx),
  ];
  insights.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));
  return insights.slice(0, 5);
}
