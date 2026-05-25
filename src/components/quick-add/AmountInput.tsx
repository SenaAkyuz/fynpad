import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { currencySymbol } from '@/lib/format';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Currency, Locale } from '@/types';

export type AmountInputProps = {
  value: number;
  onChange: (value: number) => void;
  currency: Currency;
  locale: Locale;
};

/** Metin → sayı. Hem ',' hem '.' ondalık ayraç kabul; geçersiz → 0. */
function parseAmount(text: string): number {
  const normalized = text.replace(/[^0-9.,]/g, '').replace(',', '.');
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Quick Add tutar girişi (design: ortalanmış büyük headline-xl, currency sembol prefix,
 * altında primary gradient çizgi). keyboardType decimal-pad, validation pozitif > 0.
 */
export function AmountInput({ value, onChange, currency, locale }: AmountInputProps) {
  const { colors } = useTheme();
  const [text, setText] = useState(value > 0 ? String(value) : '');

  // Dışarıdan sıfırlanırsa (form reset) input'u da temizle.
  useEffect(() => {
    if (value === 0 && parseAmount(text) !== 0) {
      setText('');
    }
  }, [value, text]);

  const placeholder = locale === 'tr' ? '0,00' : '0.00';

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text variant="headlineLg" style={[styles.symbol, { color: colors.onSurfaceVariant }]}>
          {currencySymbol(currency)}
        </Text>
        <TextInput
          value={text}
          onChangeText={(next) => {
            setText(next);
            onChange(parseAmount(next));
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.outlineVariant}
          keyboardType="decimal-pad"
          inputMode="decimal"
          style={[styles.input, { color: colors.primary }]}
        />
      </View>
      <View style={[styles.divider, { backgroundColor: colors.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.stackSm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  symbol: {
    opacity: 0.6,
  },
  input: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.8,
    textAlign: 'center',
    minWidth: 140,
    maxWidth: 240,
    padding: 0,
  },
  divider: {
    height: 2,
    width: 128,
    borderRadius: 1,
    opacity: 0.4,
  },
});
