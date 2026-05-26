import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';

import { TransactionItem } from '@/components/dashboard/TransactionItem';
import { PreferencePicker } from '@/components/settings/PreferencePicker';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { formatMonthYear, toISODate } from '@/lib/format';
import { useAppStore } from '@/stores/useAppStore';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { CategoryKind, Transaction } from '@/types';

type KindFilter = 'all' | CategoryKind;
type DateRange = 'all' | 'thisMonth' | 'thisYear' | 'last30days';

/** Filtrenin başlangıç değeri yokken kategori seçici için "hepsi" sentinel'i. */
const ALL_CATEGORIES = 'all';

/** dateRange → ISO 'YYYY-MM-DD' alt sınır (transaction.date >= cutoff). */
function computeCutoff(range: Exclude<DateRange, 'all'>): string {
  const now = new Date();
  if (range === 'thisMonth') {
    return toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
  }
  if (range === 'thisYear') {
    return `${now.getFullYear()}-01-01`;
  }
  // last30days
  const d = new Date(now);
  d.setDate(d.getDate() - 30);
  return toISODate(d);
}

/**
 * Tüm İşlemler (Part 13): dashboard "Tümünü Gör" hedefi. Tür / kategori / tarih
 * filtreleri + ay bazlı gruplama. Satıra tap → transaction-edit modal (düzenle/sil).
 */
export default function TransactionsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const locale = useAppStore((s) => s.locale);

  const { data: transactions = [] } = useTransactions();
  const { data: categories = [] } = useCategories();

  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const filtered = useMemo(() => {
    let result = transactions;
    if (kindFilter !== 'all') {
      result = result.filter((tx) => tx.kind === kindFilter);
    }
    if (categoryFilter) {
      result = result.filter((tx) => tx.categoryId === categoryFilter);
    }
    if (dateRange !== 'all') {
      const cutoff = computeCutoff(dateRange);
      result = result.filter((tx) => tx.date >= cutoff);
    }
    return [...result].sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, kindFilter, categoryFilter, dateRange]);

  // filtered date desc sıralı → ay anahtarları da desc gelir, ay içi de desc kalır.
  const sections = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    for (const tx of filtered) {
      const key = tx.date.slice(0, 7); // 'YYYY-MM'
      const arr = groups.get(key);
      if (arr) {
        arr.push(tx);
      } else {
        groups.set(key, [tx]);
      }
    }
    return Array.from(groups.entries()).map(([key, data]) => ({
      key,
      title: formatMonthYear(key, locale),
      data,
    }));
  }, [filtered, locale]);

  const kindOptions = [
    { value: 'all', label: t('transactions.filters.all') },
    { value: 'income', label: t('transactions.filters.income') },
    { value: 'expense', label: t('transactions.filters.expense') },
  ];

  const categoryOptions = [
    { value: ALL_CATEGORIES, label: t('transactions.filters.allCategories') },
    ...categories.map((c) => ({ value: c.id, label: t(c.name) })),
  ];

  const dateOptions: { value: DateRange; label: string }[] = [
    { value: 'all', label: t('transactions.filters.allDates') },
    { value: 'thisMonth', label: t('transactions.filters.thisMonth') },
    { value: 'thisYear', label: t('transactions.filters.thisYear') },
    { value: 'last30days', label: t('transactions.filters.last30days') },
  ];

  const categoryChipLabel = categoryFilter
    ? t(categoryById.get(categoryFilter)?.name ?? 'transactions.filters.category')
    : t('transactions.filters.allCategories');
  const dateChipLabel =
    dateOptions.find((o) => o.value === dateRange)?.label ??
    t('transactions.filters.allDates');

  const clearFilters = () => {
    setKindFilter('all');
    setCategoryFilter(null);
    setDateRange('all');
  };

  const renderChip = (label: string, active: boolean, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? colors.primaryContainer : colors.surfaceContainerLow,
          borderColor: active ? colors.primary : colors.outlineVariant,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        variant="labelSm"
        color={active ? 'onPrimaryContainer' : 'onSurfaceVariant'}
        numberOfLines={1}
        style={styles.chipLabel}
      >
        {label}
      </Text>
      <Icon
        name="chevron-right"
        size={16}
        color={active ? colors.onPrimaryContainer : colors.onSurfaceVariant}
        strokeWidth={2}
      />
    </Pressable>
  );

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()}>
          <Icon name="chevron-left" size={26} color={colors.primary} strokeWidth={2} />
        </Pressable>
        <Text variant="headlineMd">{t('transactions.title')}</Text>
        <Text variant="labelSm" color="onSurfaceVariant" style={styles.count}>
          {t('transactions.count', { count: filtered.length })}
        </Text>
      </View>

      <View style={styles.filters}>
        <SegmentedControl
          options={kindOptions}
          value={kindFilter}
          onChange={(v) => setKindFilter(v as KindFilter)}
        />
        <View style={styles.chipRow}>
          {renderChip(categoryChipLabel, categoryFilter !== null, () =>
            setCategoryPickerOpen(true)
          )}
          {renderChip(dateChipLabel, dateRange !== 'all', () => setDatePickerOpen(true))}
        </View>
      </View>

      {filtered.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text variant="labelMd" color="onSurfaceVariant" style={styles.sectionHeader}>
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <TransactionItem
              transaction={item}
              category={categoryById.get(item.categoryId)}
              locale={locale}
              onPress={() => router.push({ pathname: '/transaction-edit', params: { id: item.id } })}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : (
        <View style={styles.empty}>
          <Icon name="file-text" size={48} color={colors.onSurfaceVariant} strokeWidth={1.5} />
          <Text variant="bodyMd" color="onSurfaceVariant" style={styles.emptyText}>
            {t('transactions.empty')}
          </Text>
          <Button
            label={t('transactions.clearFilters')}
            variant="secondary"
            onPress={clearFilters}
            style={styles.clearButton}
          />
        </View>
      )}

      <PreferencePicker
        visible={categoryPickerOpen}
        title={t('transactions.filters.category')}
        options={categoryOptions}
        selectedValue={categoryFilter ?? ALL_CATEGORIES}
        onSelect={(v) => setCategoryFilter(v === ALL_CATEGORIES ? null : v)}
        onClose={() => setCategoryPickerOpen(false)}
      />
      <PreferencePicker
        visible={datePickerOpen}
        title={t('transactions.filters.dateRange')}
        options={dateOptions}
        selectedValue={dateRange}
        onSelect={(v) => setDateRange(v)}
        onClose={() => setDatePickerOpen(false)}
      />
    </Screen>
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
  count: {
    minWidth: 26,
    textAlign: 'right',
  },
  filters: {
    paddingHorizontal: spacing.containerMargin,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  chipLabel: {
    flexShrink: 1,
  },
  listContent: {
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.sm,
    paddingBottom: spacing.stackLg,
  },
  sectionHeader: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  separator: {
    height: spacing.base,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.stackMd,
    gap: spacing.lg,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 22,
  },
  clearButton: {
    paddingHorizontal: spacing.stackMd,
  },
});
