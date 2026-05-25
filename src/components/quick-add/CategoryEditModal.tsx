import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/ErrorText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { useCreateCategory, useDeleteCategory, useUpdateCategory } from '@/hooks/useCategories';
import { categoryEditSchema } from '@/lib/validation';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Category, CategoryKind } from '@/types';

/** Custom kategori için seçilebilir ikonlar (Icon kütüphanesinden hazır olanlar). */
export const CATEGORY_ICON_OPTIONS: IconName[] = [
  'shopping-bag',
  'shopping-cart',
  'coffee',
  'home',
  'navigation',
  'truck',
  'briefcase',
  'dollar-sign',
  'credit-card',
  'gift',
  'heart',
  'film',
  'music',
  'book',
  'smartphone',
  'zap',
  'droplet',
  'tag',
  'activity',
  'award',
  'repeat',
  'edit-3',
  'more-horizontal',
];

/** Hazır renk swatch'leri (design paleti + birkaç nötr ton). */
export const COLOR_SWATCHES: string[] = [
  '#6b38d4',
  '#006c49',
  '#b90538',
  '#7c2d12',
  '#1d4ed8',
  '#dc2626',
  '#0d8569',
  '#d97706',
  '#0891b2',
  '#494454',
];

export type CategoryEditModalProps = {
  visible: boolean;
  /** Yeni kategori bu kind'da oluşturulur (create mode). */
  kind: CategoryKind;
  /** Verilirse edit mode: alanlar bu kategoriden doldurulur, kaydet günceller, sil gösterilir. */
  category?: Category | null;
  onClose: () => void;
  /** Create mode sonrası yeni kategori. */
  onCreated?: (category: Category) => void;
  /** Edit mode sonrası güncellenen kategori. */
  onUpdated?: (category: Category) => void;
  /** Edit mode'da silindiğinde. */
  onDeleted?: () => void;
};

/**
 * Kategori oluşturma/düzenleme sheet'i: isim + ikon grid + renk swatch + kaydet (+ sil).
 * Quick Add'den create, Categories ekranından create + edit olarak çağrılır.
 */
export function CategoryEditModal({
  visible,
  kind,
  category,
  onClose,
  onCreated,
  onUpdated,
  onDeleted,
}: CategoryEditModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const isEdit = !!category;
  const effectiveKind = category?.kind ?? kind;

  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState<IconName>((category?.icon as IconName) ?? CATEGORY_ICON_OPTIONS[0]);
  const [color, setColor] = useState<string>(category?.color ?? COLOR_SWATCHES[0]);
  const [error, setError] = useState('');

  const reset = () => {
    setName('');
    setIcon(CATEGORY_ICON_OPTIONS[0]);
    setColor(COLOR_SWATCHES[0]);
    setError('');
  };

  const close = () => {
    if (!isEdit) {
      reset();
    }
    onClose();
  };

  const onSave = () => {
    setError('');
    const parsed = categoryEditSchema.safeParse({ name, icon, color, kind: effectiveKind });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setError(first ? t(first.message) : t('errors.category.createFailed'));
      return;
    }

    if (isEdit && category) {
      updateCategory.mutate(
        { id: category.id, patch: { name: parsed.data.name, icon, color } },
        {
          onSuccess: (updated) => onUpdated?.(updated),
          onError: () => setError(t('errors.category.createFailed')),
        }
      );
      return;
    }

    createCategory.mutate(
      { name: parsed.data.name, icon, color, kind: effectiveKind },
      {
        onSuccess: (created) => {
          reset();
          onCreated?.(created);
        },
        onError: () => setError(t('errors.category.createFailed')),
      }
    );
  };

  const onDelete = () => {
    if (!category) {
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
          onPress: () =>
            deleteCategory.mutate(category.id, {
              onSuccess: () => onDeleted?.(),
              onError: () => setError(t('errors.category.deleteFailed')),
            }),
        },
      ]
    );
  };

  const saving = createCategory.isPending || updateCategory.isPending;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable
          style={[styles.card, { backgroundColor: colors.surfaceContainerLowest }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text variant="headlineSm">
              {isEdit ? t('categoryEdit.editTitle') : t('categoryEdit.createTitle')}
            </Text>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={close}>
              <Icon name="x" size={22} color={colors.onSurfaceVariant} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            <TextInput
              label={t('categoryEdit.nameLabel')}
              placeholder={t('categoryEdit.namePlaceholder')}
              value={name}
              onChangeText={setName}
              maxLength={40}
              autoFocus={!isEdit}
            />

            <View style={styles.section}>
              <Text variant="labelSm" color="onSurfaceVariant" style={styles.sectionLabel}>
                {t('categoryEdit.iconLabel')}
              </Text>
              <View style={styles.iconGrid}>
                {CATEGORY_ICON_OPTIONS.map((name) => {
                  const active = name === icon;
                  return (
                    <Pressable
                      key={name}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => setIcon(name)}
                      style={[
                        styles.iconTile,
                        {
                          backgroundColor: active ? colors.primary : colors.surfaceContainerHigh,
                          borderColor: active ? colors.primary : colors.outlineVariant,
                        },
                      ]}
                    >
                      <Icon
                        name={name}
                        size={20}
                        color={active ? colors.onPrimary : colors.onSurfaceVariant}
                        strokeWidth={2}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text variant="labelSm" color="onSurfaceVariant" style={styles.sectionLabel}>
                {t('categoryEdit.colorLabel')}
              </Text>
              <View style={styles.colorRow}>
                {COLOR_SWATCHES.map((swatch) => {
                  const active = swatch === color;
                  return (
                    <Pressable
                      key={swatch}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => setColor(swatch)}
                      style={[
                        styles.swatch,
                        { backgroundColor: swatch, borderColor: colors.onSurface },
                        active && styles.swatchActive,
                      ]}
                    />
                  );
                })}
              </View>
            </View>

            <ErrorText style={styles.error}>{error}</ErrorText>

            <Button
              label={t('categoryEdit.save')}
              loading={saving}
              onPress={onSave}
              style={styles.save}
            />

            {isEdit ? (
              <Button
                label={t('categoryEdit.delete')}
                variant="secondary"
                loading={deleteCategory.isPending}
                onPress={onDelete}
              />
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: spacing.containerMargin,
  },
  card: {
    borderRadius: radii.xl,
    padding: spacing.stackMd,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  body: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.md,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    borderWidth: 0,
  },
  swatchActive: {
    borderWidth: 3,
  },
  error: {
    textAlign: 'center',
  },
  save: {
    marginTop: spacing.sm,
  },
});
