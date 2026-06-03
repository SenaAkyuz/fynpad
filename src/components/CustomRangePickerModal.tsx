import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { DateRow } from '@/components/quick-add/DateRow';
import { Text } from '@/components/ui/Text';
import { toISODate } from '@/lib/format';
import { useAppStore } from '@/stores/useAppStore';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type CustomRangePickerModalProps = {
  visible: boolean;
  /** 'YYYY-MM-DD' — modal açıldığında başlangıç değeri */
  initialStart: string;
  /** 'YYYY-MM-DD' */
  initialEnd: string;
  onClose: () => void;
  onConfirm: (start: string, end: string) => void;
};

/** Bugün baz alınarak hızlı preset aralıkları üretir ('YYYY-MM-DD'). */
function thisMonthRange(): [string, string] {
  const now = new Date();
  return [toISODate(new Date(now.getFullYear(), now.getMonth(), 1)), toISODate(now)];
}
function lastNDaysRange(n: number): [string, string] {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - n);
  return [toISODate(from), toISODate(now)];
}

/**
 * Özel tarih aralığı seçici (bottom sheet). Mevcut DateRow + native DateTimePicker'ı
 * yeniden kullanır; iki tarih + hızlı preset'ler. Onayda start>end ise üst katman
 * (makeCustomPeriod) takas eder.
 */
export function CustomRangePickerModal({
  visible,
  initialStart,
  initialEnd,
  onClose,
  onConfirm,
}: CustomRangePickerModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const locale = useAppStore((s) => s.locale);

  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);

  // Modal her açılışta mevcut filtreyle senkron başlasın.
  useEffect(() => {
    if (visible) {
      setStart(initialStart);
      setEnd(initialEnd);
    }
  }, [visible, initialStart, initialEnd]);

  const presets: { key: string; range: () => [string, string] }[] = [
    { key: 'thisMonth', range: thisMonthRange },
    { key: 'last30Days', range: () => lastNDaysRange(30) },
    { key: 'last90Days', range: () => lastNDaysRange(90) },
  ];

  const applyPreset = (range: () => [string, string]) => {
    const [s, e] = range();
    setStart(s);
    setEnd(e);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surfaceContainerLow }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text variant="headlineSm" style={styles.title}>
            {t('period.customRange.title')}
          </Text>

          <View style={styles.rows}>
            <DateRow
              value={start}
              onChange={setStart}
              locale={locale}
              label={t('period.customRange.from')}
            />
            <DateRow
              value={end}
              onChange={setEnd}
              locale={locale}
              label={t('period.customRange.to')}
              minimumDate={start}
            />
          </View>

          <View style={styles.presets}>
            {presets.map((p) => (
              <Pressable
                key={p.key}
                accessibilityRole="button"
                onPress={() => applyPreset(p.range)}
                style={[styles.preset, { backgroundColor: colors.surfaceContainerHigh }]}
              >
                <Text variant="labelSm" color="onSurfaceVariant">
                  {t(`period.customRange.${p.key}`)}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={[styles.button, { backgroundColor: colors.surfaceContainerHigh }]}
            >
              <Text variant="labelMd" color="onSurfaceVariant">
                {t('common.cancel')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => onConfirm(start, end)}
              style={[styles.button, { backgroundColor: colors.primary }]}
            >
              <Text variant="labelMd" style={{ color: colors.onPrimary }}>
                {t('common.apply')}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.stackLg,
    gap: spacing.lg,
  },
  title: {
    textAlign: 'center',
  },
  rows: {
    gap: spacing.sm,
  },
  presets: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  preset: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.full,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.full,
  },
});
