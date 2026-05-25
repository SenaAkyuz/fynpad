import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Currency } from '@/types';

export type CurrencyRowProps = {
  value: Currency;
  onChange: (currency: Currency) => void;
};

const CURRENCIES: Currency[] = ['TRY', 'USD', 'EUR'];

/** Para birimi satırı: etiket + 3 chip (TRY/USD/EUR). Default profil currency'sinden gelir. */
export function CurrencyRow({ value, onChange }: CurrencyRowProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceContainerLow }]}>
      <Text variant="labelMd" color="onSurfaceVariant">
        {t('quickAdd.currency')}
      </Text>
      <View style={styles.chips}>
        {CURRENCIES.map((currency) => {
          const active = currency === value;
          return (
            <Pressable
              key={currency}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(currency)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.surfaceContainerHighest,
                },
              ]}
            >
              <Text variant="labelMd" style={{ color: active ? colors.onPrimary : colors.onSurfaceVariant }}>
                {currency}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    minHeight: 56,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    minWidth: 52,
    alignItems: 'center',
  },
});
