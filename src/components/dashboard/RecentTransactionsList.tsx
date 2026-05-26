import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { TransactionItem } from '@/components/dashboard/TransactionItem';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';
import type { Category, Locale, Transaction } from '@/types';

export type RecentTransactionsListProps = {
  items: Transaction[];
  categories: Category[];
  locale: Locale;
};

/** Son işlemler: başlık + "Tümünü gör" (→ /transactions) + liste. Boşsa noTransactions. */
export function RecentTransactionsList({ items, categories, locale }: RecentTransactionsListProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text variant="headlineSm">{t('dashboard.recentTransactions')}</Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.push('/transactions')}
        >
          <Text variant="labelMd" color="primary">
            {t('dashboard.viewAll')}
          </Text>
        </Pressable>
      </View>

      {items.length > 0 ? (
        <View style={styles.list}>
          {items.map((tx) => (
            <TransactionItem
              key={tx.id}
              transaction={tx}
              category={categoryById.get(tx.categoryId)}
              locale={locale}
              onPress={() => router.push({ pathname: '/transaction-edit', params: { id: tx.id } })}
            />
          ))}
        </View>
      ) : (
        <Text variant="bodyMd" color="onSurfaceVariant" style={styles.empty}>
          {t('dashboard.noTransactions')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.stackSm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  list: {
    gap: spacing.base,
  },
  empty: {
    paddingVertical: spacing.lg,
  },
});
