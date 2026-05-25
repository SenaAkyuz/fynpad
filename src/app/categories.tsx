import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CategoryEditModal } from '@/components/quick-add/CategoryEditModal';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl, type SegmentOption } from '@/components/ui/SegmentedControl';
import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';
import { useCategories } from '@/hooks/useCategories';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Category, CategoryKind } from '@/types';

/** Modal durumu: kapalı | yeni oluştur | mevcut özel kategoriyi düzenle. */
type ModalState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; category: Category };

/**
 * Kategori yönetim ekranı (Part 10). Income/Expense filtreli liste; default'lar üstte (badge),
 * custom'lar altta alfabetik (tap → düzenle/sil). Sağ üst + ile yeni kategori.
 */
export default function CategoriesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const { data: categories = [], isLoading } = useCategories();
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' });

  const { defaults, custom } = useMemo(() => {
    const ofKind = categories.filter((c) => c.kind === kind);
    return {
      defaults: ofKind
        .filter((c) => c.isDefault)
        .sort((a, b) => a.sortOrder - b.sortOrder),
      custom: ofKind
        .filter((c) => !c.isDefault)
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [categories, kind]);

  const filterOptions: SegmentOption[] = [
    { value: 'income', label: t('categoriesScreen.filterIncome') },
    { value: 'expense', label: t('categoriesScreen.filterExpense') },
  ];

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()}>
          <Icon name="chevron-left" size={26} color={colors.primary} strokeWidth={2} />
        </Pressable>
        <Text variant="headlineMd">{t('categoriesScreen.title')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('categoriesScreen.addNew')}
          hitSlop={8}
          onPress={() => setModal({ mode: 'create' })}
        >
          <Icon name="plus" size={26} color={colors.primary} strokeWidth={2} />
        </Pressable>
      </View>

      <View style={styles.filter}>
        <SegmentedControl
          options={filterOptions}
          value={kind}
          onChange={(v) => setKind(v as CategoryKind)}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loading}>
            <Spinner />
          </View>
        ) : (
          <>
            <View style={styles.list}>
              {defaults.map((c) => (
                <CategoryRow key={c.id} category={c} />
              ))}
            </View>

            <Text variant="labelSm" color="onSurfaceVariant" style={styles.customHeader}>
              {custom.length > 0
                ? t('categoriesScreen.customCount', { count: custom.length })
                : t('categoriesScreen.emptyCustom')}
            </Text>

            {custom.length > 0 ? (
              <View style={styles.list}>
                {custom.map((c) => (
                  <CategoryRow
                    key={c.id}
                    category={c}
                    onPress={() => setModal({ mode: 'edit', category: c })}
                  />
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {modal.mode !== 'closed' ? (
        <CategoryEditModal
          visible
          kind={kind}
          category={modal.mode === 'edit' ? modal.category : null}
          onClose={() => setModal({ mode: 'closed' })}
          onCreated={() => setModal({ mode: 'closed' })}
          onUpdated={() => setModal({ mode: 'closed' })}
          onDeleted={() => setModal({ mode: 'closed' })}
        />
      ) : null}
    </Screen>
  );
}

/** Liste satırı: renkli ikon + ad + (chevron | Varsayılan badge). */
function CategoryRow({ category, onPress }: { category: Category; onPress?: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const onLongPress = () => {
    if (category.isDefault) {
      Alert.alert('', t('categoryEdit.defaultCannotDelete'));
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed && onPress ? colors.surfaceContainer : colors.surfaceContainerLow,
        },
      ]}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.iconBox, { backgroundColor: category.color }]}>
          <Icon name={category.icon as IconName} size={18} color="#ffffff" strokeWidth={2} />
        </View>
        <Text variant="bodyMd" numberOfLines={1} style={styles.rowName}>
          {t(category.name)}
        </Text>
      </View>

      {category.isDefault ? (
        <View style={[styles.badge, { backgroundColor: colors.surfaceContainerHigh }]}>
          <Text variant="labelSm" color="onSurfaceVariant">
            {t('categoriesScreen.defaultBadge')}
          </Text>
        </View>
      ) : (
        <Icon name="chevron-right" size={20} color={colors.onSurfaceVariant} strokeWidth={2} />
      )}
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
  filter: {
    paddingHorizontal: spacing.containerMargin,
    paddingBottom: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.sm,
    paddingBottom: spacing.stackLg,
    gap: spacing.lg,
  },
  loading: {
    paddingVertical: spacing.stackLg,
    alignItems: 'center',
  },
  list: {
    gap: spacing.sm,
  },
  customHeader: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    gap: spacing.md,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: {
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
});
