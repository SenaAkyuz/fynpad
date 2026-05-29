import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useDeleteCategory } from '@/hooks/useCategories';
import { radii, shadows, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Category, CategoryKind } from '@/types';

/** Seed'deki "Abonelikler" kategorisinin i18n-bağımsız sabit name key'i (bkz. 0002 migration). */
const SUBSCRIPTIONS_CATEGORY_NAME = 'dashboard.categories.subscriptions';

export type CategoryPickerProps = {
  categories: Category[];
  kind: CategoryKind;
  value: string;
  onChange: (categoryId: string) => void;
  onAddPress: () => void;
  /**
   * Verilirse "Abonelikler" kategorisi normal seçim yerine bu callback'i tetikler (Quick Add'de
   * subscription-edit modal'ını açmak için) ve sağ üstte ↗ rozeti gösterilir. Verilmezse abonelik
   * kategorisi diğerleri gibi normal seçilir (transaction-edit / recurring / filtre ekranları).
   */
  onSubscriptionPress?: () => void;
};

/**
 * Kategori grid (design: 4 sütun, ikon kutusu + etiket). Aktif kategori primary
 * glow + dolu ikon kutusu. Son slot "+" (yeni kategori). Custom kategoriler
 * long-press ile silinebilir → işlemleri "Diğer"e taşınır. Default'lar silinemez.
 */
export function CategoryPicker({
  categories,
  kind,
  value,
  onChange,
  onAddPress,
  onSubscriptionPress,
}: CategoryPickerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const deleteCategory = useDeleteCategory();

  const items = categories.filter((c) => c.kind === kind);

  const onLongPress = (category: Category) => {
    if (category.isDefault) {
      Alert.alert(t('categoryEdit.defaultCannotDelete'));
      return;
    }
    Alert.alert(
      t('categoryEdit.deleteConfirmTitle'),
      t('categoryEdit.deleteConfirmMessage', { name: t(category.name) }),
      [
        { text: t('categoryEdit.deleteCancel'), style: 'cancel' },
        {
          text: t('categoryEdit.delete'),
          style: 'destructive',
          onPress: () => {
            deleteCategory.mutate(category.id, {
              onSuccess: () => {
                if (value === category.id) {
                  onChange('');
                }
              },
              onError: () => Alert.alert(t('errors.category.deleteFailed')),
            });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.grid}>
      {items.map((category) => {
        // Abonelik kategorisi: callback verilmişse seçilmez, subscription-edit'i açan giriş noktasıdır.
        const isSubEntry = !!onSubscriptionPress && category.name === SUBSCRIPTIONS_CATEGORY_NAME;
        const active = !isSubEntry && category.id === value;
        return (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={styles.cell}
            onPress={() => (isSubEntry ? onSubscriptionPress!() : onChange(category.id))}
            onLongPress={() => onLongPress(category)}
          >
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: active ? colors.primary : colors.surfaceContainerHigh,
                  borderColor: active ? colors.primary : colors.outlineVariant,
                },
                active && { ...shadows.primaryGlow, shadowColor: colors.primary },
              ]}
            >
              <Icon
                name={(category.icon as IconName) ?? 'more-horizontal'}
                size={22}
                color={active ? colors.onPrimary : category.color}
                strokeWidth={2}
              />
              {isSubEntry ? (
                <View style={[styles.entryBadge, { backgroundColor: colors.primaryContainer }]}>
                  <Icon name="arrow-up-right" size={11} color={colors.onPrimaryContainer} strokeWidth={2.5} />
                </View>
              ) : null}
            </View>
            <Text
              variant="labelSm"
              color={active ? 'primary' : 'onSurfaceVariant'}
              numberOfLines={1}
              style={styles.label}
            >
              {t(category.name)}
            </Text>
          </Pressable>
        );
      })}

      {/* + yeni kategori */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('quickAdd.addCategory')}
        style={styles.cell}
        onPress={onAddPress}
      >
        <View style={[styles.iconBox, styles.addBox, { borderColor: colors.outlineVariant }]}>
          <Icon name="plus" size={22} color={colors.primary} strokeWidth={2} />
        </View>
        <Text variant="labelSm" color="onSurfaceVariant" numberOfLines={1} style={styles.label}>
          {t('quickAdd.addCategory')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.lg,
  },
  cell: {
    width: '22%',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBox: {
    borderStyle: 'dashed',
  },
  entryBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
});
