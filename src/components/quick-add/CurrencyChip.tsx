import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Currency } from '@/types';

export type CurrencyChipProps = {
  value: Currency;
  onPress: () => void;
  /** Erişilebilirlik etiketi (ör. "Para Birimi"). */
  label: string;
};

/**
 * Tutarın altındaki kompakt para birimi seçici: `TRY ⌄`.
 *
 * Tam genişlikteki 3 butonluk CurrencyRow'un yerine geçer (Quick Add'e özel — diğer
 * ekranlar CurrencyRow'u kullanmaya devam eder). Dokununca projedeki yerleşik
 * <PreferencePicker /> alt-sheet'i açılır; yeni bir seçim pattern'i getirilmez.
 *
 * Dokunma alanı min 44x44 (erişilebilirlik); renkler tema token'larından geldiği için
 * light/dark ikisinde de doğru görünür.
 */
export function CurrencyChip({ value, onPress, label }: CurrencyChipProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value }}
        onPress={onPress}
        hitSlop={8}
        style={({ pressed }) => [
          styles.chip,
          {
            backgroundColor: pressed ? colors.surfaceContainerHigh : colors.surfaceContainerHighest,
          },
        ]}
      >
        <Text variant="labelMd" color="onSurfaceVariant">
          {value}
        </Text>
        <Icon name="chevron-down" size={16} color={colors.onSurfaceVariant} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
    minWidth: 88,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
  },
});
