import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { CustomRangePickerModal } from '@/components/CustomRangePickerModal';
import { Icon } from '@/components/ui/Icon';
import { SegmentedControl, type SegmentOption } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { formatPeriodLabel, getPeriodRange, isCurrentPeriod } from '@/lib/period';
import { useAppStore } from '@/stores/useAppStore';
import { usePeriodStore } from '@/stores/usePeriodStore';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * Takvim-bazlı dönem seçici: tip chip'leri (Gün/Ay/Yıl/Özel — HAFTA YOK), önceki/sonraki
 * navigasyon ve "bugüne dön". Özel chip → CustomRangePickerModal. Durum usePeriodStore'da.
 */
export function PeriodSelector() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const locale = useAppStore((s) => s.locale);

  const filter = usePeriodStore((s) => s.filter);
  const setType = usePeriodStore((s) => s.setType);
  const setCustomRange = usePeriodStore((s) => s.setCustomRange);
  const goPrevious = usePeriodStore((s) => s.goPrevious);
  const goNext = usePeriodStore((s) => s.goNext);
  const goToday = usePeriodStore((s) => s.goToday);

  const [pickerOpen, setPickerOpen] = useState(false);

  const options: SegmentOption[] = [
    { value: 'day', label: t('dashboard.period.day') },
    { value: 'month', label: t('dashboard.period.month') },
    { value: 'year', label: t('dashboard.period.year') },
    { value: 'custom', label: t('dashboard.period.custom') },
  ];

  const onChangeType = (value: string) => {
    if (value === 'custom') {
      setPickerOpen(true);
    } else {
      setType(value as 'day' | 'month' | 'year');
    }
  };

  const isCurrent = isCurrentPeriod(filter);
  const todayKey = filter.type === 'custom' ? 'month' : filter.type;
  const { from, to } = getPeriodRange(filter);

  return (
    <View style={styles.container}>
      <SegmentedControl options={options} value={filter.type} onChange={onChangeType} />

      <View style={styles.navRow}>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={goPrevious} style={styles.navButton}>
          <Icon name="chevron-left" size={22} color={colors.onSurface} strokeWidth={2} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={styles.label}
          onPress={() => filter.type === 'custom' && setPickerOpen(true)}
        >
          <Text variant="headlineSm" numberOfLines={1}>
            {formatPeriodLabel(filter, locale)}
          </Text>
          {filter.type === 'custom' ? (
            <Icon name="calendar" size={14} color={colors.onSurfaceVariant} strokeWidth={2} />
          ) : null}
        </Pressable>

        <Pressable accessibilityRole="button" hitSlop={8} onPress={goNext} style={styles.navButton}>
          <Icon name="chevron-right" size={22} color={colors.onSurface} strokeWidth={2} />
        </Pressable>
      </View>

      {!isCurrent ? (
        <Pressable accessibilityRole="button" onPress={goToday} style={styles.today}>
          <Icon name="rotate-ccw" size={14} color={colors.primary} strokeWidth={2} />
          <Text variant="labelSm" style={{ color: colors.primary }}>
            {t(`period.goToCurrent.${todayKey}`)}
          </Text>
        </Pressable>
      ) : null}

      <CustomRangePickerModal
        visible={pickerOpen}
        initialStart={from}
        initialEnd={to}
        onClose={() => setPickerOpen(false)}
        onConfirm={(s, e) => {
          setCustomRange(s, e);
          setPickerOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    padding: spacing.xs,
  },
  label: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  today: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
});
