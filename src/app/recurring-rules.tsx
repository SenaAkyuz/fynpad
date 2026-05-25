import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { RecurringRuleEditModal } from '@/components/recurring/RecurringRuleEditModal';
import { RecurringRuleItem } from '@/components/recurring/RecurringRuleItem';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';
import { useCategories } from '@/hooks/useCategories';
import { useRecurringRules } from '@/hooks/useRecurringRules';
import { useAppStore } from '@/stores/useAppStore';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { RecurringRule } from '@/types';

/**
 * Tekrarlayan İşlemler yönetim ekranı (Part 6, normal route).
 * Liste → tap → düzenle/sil modal'ı. Oluşturma Quick Add'deki "Tekrarla" toggle'ından yapılır.
 */
export default function RecurringRulesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const locale = useAppStore((s) => s.locale);

  const { data: rules = [], isLoading } = useRecurringRules();
  const { data: categories = [] } = useCategories();

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const [editing, setEditing] = useState<RecurringRule | null>(null);

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()}>
          <Icon name="chevron-left" size={26} color={colors.primary} strokeWidth={2} />
        </Pressable>
        <Text variant="headlineMd">{t('recurring.listTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loading}>
            <Spinner />
          </View>
        ) : rules.length > 0 ? (
          <View style={styles.list}>
            {rules.map((rule) => (
              <RecurringRuleItem
                key={rule.id}
                rule={rule}
                category={categoryById.get(rule.categoryId)}
                locale={locale}
                onPress={() => setEditing(rule)}
              />
            ))}
          </View>
        ) : (
          <Text variant="bodyMd" color="onSurfaceVariant" style={styles.empty}>
            {t('recurring.listEmpty')}
          </Text>
        )}
      </ScrollView>

      {editing ? (
        <RecurringRuleEditModal
          rule={editing}
          categories={categories}
          locale={locale}
          onClose={() => setEditing(null)}
        />
      ) : null}
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
  headerSpacer: {
    width: 26,
  },
  content: {
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.sm,
    paddingBottom: spacing.stackLg,
  },
  list: {
    gap: spacing.base,
  },
  loading: {
    paddingVertical: spacing.stackLg,
    alignItems: 'center',
  },
  empty: {
    paddingVertical: spacing.stackLg,
    textAlign: 'center',
    lineHeight: 22,
  },
});
