import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { DateRow } from '@/components/quick-add/DateRow';
import { Text } from '@/components/ui/Text';
import { fromISODate, toISODate } from '@/lib/format';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Locale, RecurringFrequency } from '@/types';
import type { RecurringRuleForm } from '@/lib/validation';

export type RecurringConfigProps = {
  value: RecurringRuleForm;
  onChange: (next: RecurringRuleForm) => void;
  locale: Locale;
};

const FREQUENCIES: { value: RecurringFrequency; labelKey: string }[] = [
  { value: 'daily', labelKey: 'recurring.freqDaily' },
  { value: 'weekly', labelKey: 'recurring.freqWeekly' },
  { value: 'monthly', labelKey: 'recurring.freqMonthly' },
  { value: 'yearly', labelKey: 'recurring.freqYearly' },
];

// Gösterim sırası Pzt→Pzr; değerler Postgres DOW (0=Pazar).
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const DAYS = Array.from({ length: 30 }, (_, i) => i + 1); // 1..30, 31 = "Son gün"
const LAST_DAY = 31;

/**
 * Tekrarlama yapılandırması (Part 6) — recurring toggle açıkken görünür.
 * Tasarım kaynağı yok; sistem-içi (DESIGN.md tokenları + quick-add chip pattern'i).
 * Sıklığa göre koşullu picker: weekly→gün, monthly→ayın günü, yearly→ay + gün.
 */
export function RecurringConfig({ value, onChange, locale }: RecurringConfigProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const patch = (next: Partial<RecurringRuleForm>) => onChange({ ...value, ...next });

  const onFrequency = (frequency: RecurringFrequency) => {
    // Sıklık değişince ilgili olmayan gün alanlarını temizle, gerekli olanlara makul varsayılan ver.
    const start = fromISODate(value.startDate);
    patch({
      frequency,
      dayOfWeek: frequency === 'weekly' ? (value.dayOfWeek ?? start.getDay()) : null,
      dayOfMonth:
        frequency === 'monthly' || frequency === 'yearly'
          ? (value.dayOfMonth ?? start.getDate())
          : null,
      monthOfYear: frequency === 'yearly' ? (value.monthOfYear ?? start.getMonth() + 1) : null,
    });
  };

  const Chip = ({
    label,
    active,
    onPress,
    wide = false,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
    wide?: boolean;
  }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.chip,
        wide && styles.chipWide,
        { backgroundColor: active ? colors.primary : colors.surfaceContainerHighest },
      ]}
    >
      <Text variant="labelMd" style={{ color: active ? colors.onPrimary : colors.onSurfaceVariant }}>
        {label}
      </Text>
    </Pressable>
  );

  const noEndDate = value.endDate == null;

  return (
    <View style={styles.container}>
      {/* Sıklık */}
      <View style={styles.field}>
        <Text variant="labelSm" color="onSurfaceVariant" style={styles.label}>
          {t('recurring.frequency')}
        </Text>
        <View style={styles.chips}>
          {FREQUENCIES.map((f) => (
            <Chip
              key={f.value}
              label={t(f.labelKey)}
              active={value.frequency === f.value}
              onPress={() => onFrequency(f.value)}
            />
          ))}
        </View>
      </View>

      {/* weekly → hangi gün */}
      {value.frequency === 'weekly' ? (
        <View style={styles.field}>
          <Text variant="labelSm" color="onSurfaceVariant" style={styles.label}>
            {t('recurring.dayOfWeek')}
          </Text>
          <View style={styles.chips}>
            {WEEKDAYS.map((d) => (
              <Chip
                key={d}
                label={t(`recurring.weekdays.${d}`)}
                active={value.dayOfWeek === d}
                onPress={() => patch({ dayOfWeek: d })}
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* yearly → hangi ay */}
      {value.frequency === 'yearly' ? (
        <View style={styles.field}>
          <Text variant="labelSm" color="onSurfaceVariant" style={styles.label}>
            {t('recurring.monthOfYear')}
          </Text>
          <View style={styles.chips}>
            {MONTHS.map((m) => (
              <Chip
                key={m}
                label={t(`recurring.months.${m}`)}
                active={value.monthOfYear === m}
                onPress={() => patch({ monthOfYear: m })}
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* monthly + yearly → ayın günü */}
      {value.frequency === 'monthly' || value.frequency === 'yearly' ? (
        <View style={styles.field}>
          <Text variant="labelSm" color="onSurfaceVariant" style={styles.label}>
            {t('recurring.dayOfMonth')}
          </Text>
          <View style={styles.chips}>
            {DAYS.map((d) => (
              <Chip
                key={d}
                label={String(d)}
                active={value.dayOfMonth === d}
                onPress={() => patch({ dayOfMonth: d })}
              />
            ))}
            <Chip
              label={t('recurring.lastDayOfMonth')}
              active={value.dayOfMonth === LAST_DAY}
              onPress={() => patch({ dayOfMonth: LAST_DAY })}
              wide
            />
          </View>
        </View>
      ) : null}

      {/* Başlangıç */}
      <DateRow
        label={t('recurring.startDate')}
        value={value.startDate}
        onChange={(iso) => {
          // Bitiş başlangıçtan önce kalmasın.
          const fixEnd = value.endDate && value.endDate < iso ? iso : value.endDate;
          patch({ startDate: iso, endDate: fixEnd });
        }}
        locale={locale}
      />

      {/* Bitiş — "Süresiz" toggle; kapalıyken date picker */}
      <View style={[styles.endRow, { backgroundColor: colors.surfaceContainerLow }]}>
        <Text variant="labelMd" color="onSurfaceVariant">
          {t('recurring.noEndDate')}
        </Text>
        <Switch
          value={noEndDate}
          onValueChange={(noEnd) =>
            patch({ endDate: noEnd ? null : value.startDate })
          }
          trackColor={{ false: colors.surfaceContainerHighest, true: colors.primary }}
          thumbColor={noEndDate ? colors.onPrimary : colors.surfaceContainerLowest}
          ios_backgroundColor={colors.surfaceContainerHighest}
        />
      </View>

      {!noEndDate ? (
        <DateRow
          label={t('recurring.endDate')}
          value={value.endDate ?? value.startDate}
          minimumDate={value.startDate}
          onChange={(iso) => patch({ endDate: iso })}
          locale={locale}
        />
      ) : null}
    </View>
  );
}

/** Form için makul varsayılan kural (transaction tarihinden türetilir). */
export function defaultRecurringRule(startISO: string): RecurringRuleForm {
  const start = fromISODate(startISO);
  return {
    frequency: 'monthly',
    dayOfWeek: null,
    dayOfMonth: start.getDate(),
    monthOfYear: null,
    startDate: startISO,
    endDate: null,
  };
}

/** Bugünün ISO tarihi (default startDate). */
export function todayISO(): string {
  return toISODate(new Date());
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    minWidth: 44,
    alignItems: 'center',
  },
  chipWide: {
    paddingHorizontal: spacing.lg,
  },
  endRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    minHeight: 56,
  },
});
