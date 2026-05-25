import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type RecurringToggleProps = {
  value: boolean;
  onChange: (next: boolean) => void;
};

/**
 * "Tekrarla" anahtarı (Part 6). Açıldığında altına <RecurringConfig /> gelir.
 * Part 5'te brief 7.3 kararıyla gizliydi; Part 6'da etkinleştirildi.
 */
export function RecurringToggle({ value, onChange }: RecurringToggleProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceContainerLow }]}>
      <View style={styles.left}>
        <Icon name="repeat" size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
        <Text variant="labelMd" color="onSurfaceVariant">
          {t('recurring.toggle')}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.surfaceContainerHighest, true: colors.primary }}
        thumbColor={value ? colors.onPrimary : colors.surfaceContainerLowest}
        ios_backgroundColor={colors.surfaceContainerHighest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    minHeight: 56,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
