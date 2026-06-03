import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { DateRow } from '@/components/quick-add/DateRow';
import { Text } from '@/components/ui/Text';
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

/**
 * Özel tarih aralığı seçici (bottom sheet). Mevcut DateRow + native DateTimePicker'ı
 * yeniden kullanır; başlangıç + bitiş tarihi. Onayda start>end ise üst katman
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
