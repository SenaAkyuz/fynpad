import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { formatAbsoluteDate, fromISODate, toISODate } from '@/lib/format';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Locale } from '@/types';

export type DateRowProps = {
  /** 'YYYY-MM-DD' */
  value: string;
  onChange: (iso: string) => void;
  locale: Locale;
  /** opsiyonel etiket override (default: quickAdd.date). Recurring config'de "Başlangıç"/"Bitiş". */
  label?: string;
  /** 'YYYY-MM-DD' — seçilebilir minimum tarih (örn. bitiş ≥ başlangıç). */
  minimumDate?: string;
};

/**
 * Tarih satırı (design: etiketli liste satırı). Tap → native date picker.
 * Geçmiş ve gelecek tarih kabul edilir (brief 4.2).
 */
export function DateRow({ value, onChange, locale, label, minimumDate }: DateRowProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [show, setShow] = useState(false);

  const onPick = (event: DateTimePickerEvent, selected?: Date) => {
    // Android: dialog kapanır; iOS: inline spinner.
    if (Platform.OS === 'android') {
      setShow(false);
    }
    if (event.type === 'set' && selected) {
      onChange(toISODate(selected));
    }
  };

  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceContainerLow }]}>
      <View style={styles.left}>
        <Icon name="calendar" size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
        <Text variant="labelMd" color="onSurfaceVariant">
          {label ?? t('quickAdd.date')}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        style={styles.value}
        onPress={() => setShow((s) => !s)}
      >
        <Text variant="labelMd">{formatAbsoluteDate(value, locale)}</Text>
        <Icon name="chevron-right" size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
      </Pressable>

      {show ? (
        <DateTimePicker
          value={fromISODate(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'compact' : 'default'}
          minimumDate={minimumDate ? fromISODate(minimumDate) : undefined}
          onChange={onPick}
        />
      ) : null}
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
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  value: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
