import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { CategoryKind } from '@/types';

export type KindToggleProps = {
  value: CategoryKind;
  onChange: (kind: CategoryKind) => void;
};

const PAD = 4;

/**
 * Quick Add kind seçici (design: segmented control). Brief 7.3 gereği aktif segment
 * semantik renkli: Gelir → yeşil (secondary), Gider → kırmızı (tertiary).
 * Transfer v1.2'ye ertelendi → disabled + kilit + "Yakında" rozeti (submit edilmez).
 */
export function KindToggle({ value, onChange }: KindToggleProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const segment = (kind: CategoryKind, label: string, activeBg: string, activeFg: string) => {
    const active = value === kind;
    return (
      <Pressable
        key={kind}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={[styles.segment, active && { backgroundColor: activeBg }]}
        onPress={() => onChange(kind)}
      >
        <Text variant="labelMd" style={{ color: active ? activeFg : colors.onSurfaceVariant }}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.track, { backgroundColor: colors.surfaceContainer }]}>
      {segment('income', t('quickAdd.kindIncome'), colors.secondary, colors.onSecondary)}
      {segment('expense', t('quickAdd.kindExpense'), colors.tertiary, colors.onTertiary)}

      {/* Transfer — disabled (Part v1.2). no-op. */}
      <View
        accessibilityState={{ disabled: true }}
        style={[styles.segment, styles.transfer]}
        pointerEvents="none"
      >
        <Icon name="lock" size={14} color={colors.onSurfaceVariant} strokeWidth={2} />
        <Text variant="labelMd" color="onSurfaceVariant" numberOfLines={1} style={styles.transferLabel}>
          {t('quickAdd.kindTransfer')}
        </Text>
        <View style={[styles.soonBadge, { backgroundColor: colors.surfaceContainerHighest }]}>
          <Text variant="labelSm" color="onSurfaceVariant">
            {t('quickAdd.kindTransferSoon')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radii.full,
    padding: PAD,
    gap: PAD,
  },
  segment: {
    flex: 1,
    height: 44,
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  transfer: {
    opacity: 0.5,
  },
  transferLabel: {
    flexShrink: 1,
  },
  soonBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radii.full,
  },
});
