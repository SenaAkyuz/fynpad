import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Insight, InsightSeverity } from '@/types';

export type InsightCardProps = {
  insight: Insight;
};

/**
 * Akıllı uyarı kartı — tasarım advanced_analytics "Strategic Insights": sol-kenar vurgulu glass
 * kart, tinted ikon kutusu + başlık + açıklama, action varsa sağda chevron. Tap → ilgili ekran.
 * Severity: warning (tertiary/Coral) > info (primary/Violet) > suggestion (nötr).
 */
export function InsightCard({ insight }: InsightCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const palette: Record<InsightSeverity, { icon: string; tint: string; accent: string }> = {
    warning: { icon: colors.onTertiaryContainer, tint: colors.tertiaryContainer, accent: colors.tertiary },
    info: { icon: colors.onPrimaryContainer, tint: colors.primaryContainer, accent: colors.primary },
    suggestion: { icon: colors.onSurfaceVariant, tint: colors.surfaceContainerHigh, accent: colors.outline },
  };
  const sev = palette[insight.severity];
  const hasAction = !!insight.actionTarget;

  const onPress = () => {
    if (insight.actionTarget) {
      router.push(insight.actionTarget as never);
    }
  };

  return (
    <Pressable accessibilityRole={hasAction ? 'button' : undefined} disabled={!hasAction} onPress={onPress}>
      <GlassCard style={{ borderLeftWidth: 4, borderLeftColor: sev.accent }}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: sev.tint }]}>
            <Icon name={(insight.iconName as IconName) ?? 'activity'} size={20} color={sev.icon} strokeWidth={2} />
          </View>
          <View style={styles.body}>
            <Text variant="labelMd" numberOfLines={2}>
              {t(insight.titleKey, insight.titleParams)}
            </Text>
            <Text variant="bodyMd" color="onSurfaceVariant">
              {t(insight.descKey, insight.descParams)}
            </Text>
          </View>
          {hasAction ? (
            <Icon name="chevron-right" size={20} color={colors.onSurfaceVariant} strokeWidth={2} />
          ) : null}
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
});
