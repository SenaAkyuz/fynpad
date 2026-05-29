export type InsightKind =
  | 'budget_exceeded'
  | 'above_average_spending'
  | 'subscription_review'
  | 'goal_deadline'
  | 'required_monthly_savings'
  | 'monthly_savings_check';

export type InsightSeverity = 'warning' | 'info' | 'suggestion';

/**
 * Akıllı uyarı (Part 9, brief 5/3). Deterministic kural çıktısı — DB'ye yazılmaz, on-demand
 * compute edilir. titleKey/descKey i18n anahtarı; *Params interpolasyon değerleri (ör. kategori
 * adı, formatlanmış tutar). actionTarget varsa kart tap'lenebilir.
 */
export type Insight = {
  id: string; // deterministic, ör. 'budget:${categoryId}'
  kind: InsightKind;
  severity: InsightSeverity;
  titleKey: string;
  titleParams?: Record<string, string | number>;
  descKey: string;
  descParams?: Record<string, string | number>;
  actionLabelKey?: string;
  actionTarget?: string; // route path
  iconName?: string; // Icon adı (severity'ye göre rule'da set edilir)
};
