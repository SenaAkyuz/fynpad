import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import type { CashFlowBucket } from '@/lib/analytics';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type CashFlowChartProps = {
  data: CashFlowBucket[];
  height?: number;
};

// Dahili viewBox koordinatları (preserveAspectRatio="none" ile genişliğe esner).
const VB_W = 320;
const VB_H = 180;
const PAD_X = 6;
const PAD_Y = 14;
const MAX_LABELS = 7;

type Pt = { x: number; y: number };

/** Catmull-Rom → cubic bezier ile yumuşak çizgi (tasarım: smooth area chart). */
function smoothPath(points: Pt[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

/** Hangi label index'lerinin gösterileceği (kalabalıksa seyreltilir). */
function visibleLabelIndices(n: number): Set<number> {
  if (n <= MAX_LABELS) return new Set(Array.from({ length: n }, (_, i) => i));
  const step = (n - 1) / (MAX_LABELS - 1);
  const set = new Set<number>();
  for (let i = 0; i < MAX_LABELS; i++) set.add(Math.round(i * step));
  return set;
}

/**
 * Nakit akışı grafiği — tasarım advanced_analytics: glass kart içinde alan dolgulu (gradient)
 * çift çizgi. Gelir = secondary (Emerald) düz çizgi + glow; gider = tertiary (Coral) kesik çizgi
 * (FynPad'in app-geneli gelir/gider renk semantiğiyle tutarlı). Subtle dikey grid + X ekseni.
 */
export function CashFlowChart({ data, height = 200 }: CashFlowChartProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const rawMax = Math.max(0, ...data.map((d) => Math.max(d.income, d.expense)));
  const isEmpty = data.length === 0 || rawMax <= 0;

  const buildPoints = (key: 'income' | 'expense'): Pt[] => {
    const max = rawMax * 1.1 || 1;
    const baseY = VB_H - PAD_Y;
    const plotH = VB_H - PAD_Y * 2;
    const xAt = (i: number) =>
      data.length > 1 ? PAD_X + (i / (data.length - 1)) * (VB_W - PAD_X * 2) : VB_W / 2;
    const yAt = (v: number) => baseY - (v / max) * plotH;

    if (data.length === 1) {
      const y = yAt(data[0][key]);
      // tek bucket (day) → düz çizgi olarak göster
      return [
        { x: PAD_X, y },
        { x: VB_W - PAD_X, y },
      ];
    }
    return data.map((d, i) => ({ x: xAt(i), y: yAt(d[key]) }));
  };

  const incomePts = isEmpty ? [] : buildPoints('income');
  const expensePts = isEmpty ? [] : buildPoints('expense');
  const baseY = VB_H - PAD_Y;

  const incomeLine = smoothPath(incomePts);
  const expenseLine = smoothPath(expensePts);
  const incomeArea =
    incomePts.length > 1
      ? `${incomeLine} L ${incomePts[incomePts.length - 1].x},${baseY} L ${incomePts[0].x},${baseY} Z`
      : '';
  const expenseArea =
    expensePts.length > 1
      ? `${expenseLine} L ${expensePts[expensePts.length - 1].x},${baseY} L ${expensePts[0].x},${baseY} Z`
      : '';

  const gridCount = Math.min(Math.max(data.length, 2), 7);
  const labelVisible = visibleLabelIndices(data.length);
  const lastIncome = incomePts[incomePts.length - 1];

  return (
    <GlassCard>
      <View style={styles.header}>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.secondary }]} />
            <Text variant="labelSm" color="onSurfaceVariant">
              {t('analytics.income')}
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.tertiary }]} />
            <Text variant="labelSm" color="onSurfaceVariant">
              {t('analytics.expense')}
            </Text>
          </View>
        </View>
      </View>

      {isEmpty ? (
        <View style={[styles.empty, { height }]}>
          <Text variant="bodyMd" color="onSurfaceVariant">
            {t('analytics.empty.noTransactions')}
          </Text>
        </View>
      ) : (
        <>
          <Svg width="100%" height={height} viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="cfIncome" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.secondary} stopOpacity={0.25} />
                <Stop offset="1" stopColor={colors.secondary} stopOpacity={0} />
              </LinearGradient>
              <LinearGradient id="cfExpense" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.tertiary} stopOpacity={0.18} />
                <Stop offset="1" stopColor={colors.tertiary} stopOpacity={0} />
              </LinearGradient>
            </Defs>

            {/* subtle dikey grid */}
            {Array.from({ length: gridCount }, (_, i) => {
              const x = PAD_X + (i / (gridCount - 1)) * (VB_W - PAD_X * 2);
              return (
                <Line
                  key={i}
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={VB_H}
                  stroke={colors.onSurfaceVariant}
                  strokeOpacity={0.06}
                  strokeWidth={1}
                />
              );
            })}

            {expenseArea ? <Path d={expenseArea} fill="url(#cfExpense)" /> : null}
            {incomeArea ? <Path d={incomeArea} fill="url(#cfIncome)" /> : null}

            {/* gider — kesik çizgi */}
            <Path
              d={expenseLine}
              fill="none"
              stroke={colors.tertiary}
              strokeWidth={2.5}
              strokeDasharray="7 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* gelir — glow underlay + düz çizgi */}
            <Path d={incomeLine} fill="none" stroke={colors.secondary} strokeOpacity={0.25} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
            <Path
              d={incomeLine}
              fill="none"
              stroke={colors.secondary}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {lastIncome ? <Circle cx={lastIncome.x} cy={lastIncome.y} r={4} fill={colors.secondary} /> : null}
          </Svg>

          <View style={styles.labels}>
            {data.map((b, i) => (
              <View key={b.date} style={styles.labelSlot}>
                {labelVisible.has(i) ? (
                  <Text variant="labelSm" color="onSurfaceVariant" numberOfLines={1}>
                    {b.label}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labels: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  labelSlot: {
    flex: 1,
    alignItems: 'center',
  },
});
