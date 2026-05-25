import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { DateRow } from '@/components/quick-add/DateRow';
import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/ErrorText';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useTransactions } from '@/hooks/useTransactions';
import { ExportError, exportTransactions, type ExportFormat, type QuickPick } from '@/lib/export';
import { toISODate } from '@/lib/format';
import { useAppStore } from '@/stores/useAppStore';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** Hızlı seçim → {from, to} ISO aralığı (yerel saat). */
function rangeFor(pick: QuickPick): { from: string; to: string } {
  const now = new Date();
  const today = toISODate(now);
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (pick) {
    case 'thisMonth':
      return { from: toISODate(new Date(y, m, 1)), to: today };
    case 'lastMonth':
      return { from: toISODate(new Date(y, m - 1, 1)), to: toISODate(new Date(y, m, 0)) };
    case 'thisYear':
      return { from: toISODate(new Date(y, 0, 1)), to: today };
    case 'last3Months':
      return { from: toISODate(new Date(y, m - 3, now.getDate())), to: today };
    case 'allTime':
      return { from: '2000-01-01', to: today };
  }
}

const QUICK_PICKS: QuickPick[] = ['thisMonth', 'lastMonth', 'thisYear', 'last3Months', 'allTime'];

/**
 * Veri dışa aktarma modal'ı (brief 5 madde 2). Tarih aralığı + format → CSV/PDF üret → share sheet.
 */
export default function ExportScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const locale = useAppStore((s) => s.locale);

  const initial = rangeFor('thisYear');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [activePick, setActivePick] = useState<QuickPick | null>('thisYear');
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const invalidRange = to < from;

  const { data: transactions = [] } = useTransactions(
    invalidRange ? undefined : { from, to }
  );
  const countLabel = useMemo(() => {
    if (invalidRange) return null;
    return transactions.length === 0
      ? t('export.noData')
      : t('export.transactionCount', { count: transactions.length });
  }, [invalidRange, transactions.length, t]);

  const applyPick = (pick: QuickPick) => {
    const range = rangeFor(pick);
    setFrom(range.from);
    setTo(range.to);
    setActivePick(pick);
    setError('');
  };

  const onChangeFrom = (iso: string) => {
    setFrom(iso);
    setActivePick(null);
    setError('');
  };
  const onChangeTo = (iso: string) => {
    setTo(iso);
    setActivePick(null);
    setError('');
  };

  const onSubmit = async () => {
    setError('');
    if (invalidRange) {
      setError(t('errors.export.invalidDateRange'));
      return;
    }
    setExporting(true);
    try {
      await exportTransactions({ from, to, format, locale, t });
    } catch (e) {
      if (e instanceof ExportError) {
        setError(
          e.code === 'NO_TRANSACTIONS'
            ? t('errors.export.noTransactions')
            : e.code === 'SHARING_UNAVAILABLE'
              ? t('errors.export.sharingUnavailable')
              : t('errors.export.failed')
        );
      } else {
        setError(t('errors.export.failed'));
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()}>
          <Icon name="x" size={26} color={colors.primary} strokeWidth={2} />
        </Pressable>
        <Text variant="headlineMd">{t('export.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="bodyMd" color="onSurfaceVariant">
          {t('export.subtitle')}
        </Text>

        {/* Tarih Aralığı */}
        <View style={styles.section}>
          <Text variant="labelSm" color="onSurfaceVariant" style={styles.sectionLabel}>
            {t('export.dateRange')}
          </Text>
          <View style={styles.rows}>
            <DateRow value={from} onChange={onChangeFrom} locale={locale} label={t('export.from')} />
            <DateRow
              value={to}
              onChange={onChangeTo}
              locale={locale}
              label={t('export.to')}
              minimumDate={from}
            />
          </View>

          <View style={styles.chips}>
            {QUICK_PICKS.map((pick) => {
              const active = activePick === pick;
              return (
                <Pressable
                  key={pick}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => applyPick(pick)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primaryContainer : colors.surfaceContainerHigh,
                      borderColor: active ? colors.primary : colors.outlineVariant,
                    },
                  ]}
                >
                  <Text
                    variant="labelSm"
                    color={active ? 'onPrimaryContainer' : 'onSurfaceVariant'}
                  >
                    {t(`export.quickPicks.${pick}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {countLabel ? (
            <Text variant="labelSm" color="onSurfaceVariant">
              {countLabel}
            </Text>
          ) : null}
        </View>

        {/* Format */}
        <View style={styles.section}>
          <Text variant="labelSm" color="onSurfaceVariant" style={styles.sectionLabel}>
            {t('export.format')}
          </Text>
          <View style={styles.rows}>
            <FormatOption
              label={t('export.formatCsv')}
              selected={format === 'csv'}
              onPress={() => setFormat('csv')}
            />
            <FormatOption
              label={t('export.formatPdf')}
              selected={format === 'pdf'}
              onPress={() => setFormat('pdf')}
            />
          </View>
        </View>

        <ErrorText style={styles.error}>{error}</ErrorText>

        <Button
          label={exporting ? t('export.exporting') : t('export.submit')}
          loading={exporting}
          disabled={invalidRange || transactions.length === 0}
          onPress={onSubmit}
          style={styles.submit}
        />
      </ScrollView>
    </Screen>
  );
}

/** Radyo benzeri format seçim satırı. */
function FormatOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.formatRow,
        {
          backgroundColor: selected ? colors.primaryContainer : colors.surfaceContainerLow,
          borderColor: selected ? colors.primary : colors.outlineVariant,
        },
      ]}
    >
      <Text variant="bodyMd" color={selected ? 'onPrimaryContainer' : 'onSurface'}>
        {label}
      </Text>
      <View
        style={[
          styles.radio,
          { borderColor: selected ? colors.primary : colors.outline },
        ]}
      >
        {selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: spacing.md,
  },
  headerSpacer: {
    width: 26,
  },
  content: {
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.sm,
    paddingBottom: spacing.stackLg,
    gap: spacing.stackMd,
  },
  section: {
    gap: spacing.md,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rows: {
    gap: spacing.md,
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
    borderWidth: 1,
  },
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
  },
  error: {
    textAlign: 'center',
  },
  submit: {
    marginTop: spacing.sm,
  },
});
