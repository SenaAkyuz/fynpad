import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/quick-add/AmountInput';
import { CategoryPicker } from '@/components/quick-add/CategoryPicker';
import { CurrencyRow } from '@/components/quick-add/CurrencyRow';
import { NoteInput } from '@/components/quick-add/NoteInput';
import { RecurringConfig } from '@/components/quick-add/RecurringConfig';
import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/ErrorText';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useDeleteRecurringRule, useUpdateRecurringRule } from '@/hooks/useRecurringRules';
import { recurringRuleSchema, type RecurringRuleForm } from '@/lib/validation';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Category, Currency, Locale, RecurringRule } from '@/types';

export type RecurringRuleEditModalProps = {
  /** Düzenlenecek kural — yalnızca düzenleme açıkken mount edilir (rule daima dolu). */
  rule: RecurringRule;
  categories: Category[];
  locale: Locale;
  onClose: () => void;
};

function ruleToForm(rule: RecurringRule): RecurringRuleForm {
  return {
    frequency: rule.frequency,
    dayOfWeek: rule.dayOfWeek,
    dayOfMonth: rule.dayOfMonth,
    monthOfYear: rule.monthOfYear,
    startDate: rule.startDate,
    endDate: rule.endDate,
  };
}

/**
 * Tekrarlayan kural düzenleme/silme sheet'i. RecurringConfig + tutar/kategori/para/not
 * reuse eder. Brief 4.3: kaydet yalnızca ileri tarihli üretimi etkiler (geçmiş işlemler durur);
 * sil → FK ON DELETE SET NULL ile geçmiş işlemler korunur. kind sabittir (oluşturmada belirlenir).
 */
export function RecurringRuleEditModal({
  rule,
  categories,
  locale,
  onClose,
}: RecurringRuleEditModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const updateRule = useUpdateRecurringRule();
  const deleteRule = useDeleteRecurringRule();
  const isOnline = useNetworkStore((s) => s.isOnline);

  const [amount, setAmount] = useState(rule.amount);
  const [categoryId, setCategoryId] = useState(rule.categoryId);
  const [currency, setCurrency] = useState<Currency>(rule.currency);
  const [note, setNote] = useState(rule.note ?? '');
  const [config, setConfig] = useState<RecurringRuleForm>(() => ruleToForm(rule));
  const [error, setError] = useState('');

  // Abonelik metadata'sı (servis adı/ikon/plan) tek editor'de yönetilir: subscription-edit.
  // Bu modal yalnızca temel kural alanlarını düzenler + abonelik editor'üne yönlendirir.
  const openSubscriptionEditor = (params: { id: string } | { fromRecurringId: string }) => {
    onClose();
    router.push({ pathname: '/subscription-edit', params });
  };

  const onSave = () => {
    setError('');
    if (amount <= 0) {
      setError(t('errors.transaction.amountPositive'));
      return;
    }
    if (!categoryId) {
      setError(t('errors.transaction.categoryRequired'));
      return;
    }
    const parsed = recurringRuleSchema.safeParse(config);
    if (!parsed.success) {
      setError(t('errors.validation.recurringConfigIncomplete'));
      return;
    }
    const payload = {
      id: rule.id,
      patch: {
        amount,
        categoryId,
        currency,
        note: note.trim() ? note.trim() : null,
        frequency: parsed.data.frequency,
        dayOfWeek: parsed.data.dayOfWeek ?? null,
        dayOfMonth: parsed.data.dayOfMonth ?? null,
        monthOfYear: parsed.data.monthOfYear ?? null,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate ?? null,
      },
    };

    // Çevrimdışı: 'online' networkMode ile mutation paused olur, onSuccess/onError tetiklenmez →
    // fire-and-forget ile kuyruğa düşür, modal'ı hemen kapat.
    if (!isOnline) {
      updateRule.mutate(payload);
      onClose();
      return;
    }
    updateRule.mutate(payload, {
      onSuccess: () => onClose(),
      onError: () => setError(t('errors.recurring.updateFailed')),
    });
  };

  const onDelete = () => {
    Alert.alert(t('recurring.deleteConfirmTitle'), t('recurring.deleteConfirmMessage'), [
      { text: t('recurring.deleteCancel'), style: 'cancel' },
      {
        text: t('recurring.deleteConfirmAction'),
        style: 'destructive',
        onPress: () => {
          if (!isOnline) {
            deleteRule.mutate(rule.id);
            onClose();
            return;
          }
          deleteRule.mutate(rule.id, {
            onSuccess: () => onClose(),
            onError: () => setError(t('errors.recurring.deleteFailed')),
          });
        },
      },
    ]);
  };

  const busy = updateRule.isPending || deleteRule.isPending;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: colors.surfaceContainerLowest }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text variant="headlineSm">{t('recurring.editTitle')}</Text>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={onClose}>
              <Icon name="x" size={22} color={colors.onSurfaceVariant} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Bu kural zaten abonelik → metadata (servis/ikon/plan) için abonelik editor'üne yönlendir. */}
            {rule.isSubscription ? (
              <View style={[styles.banner, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Icon name="credit-card" size={18} color={colors.primary} strokeWidth={2} />
                <View style={styles.bannerText}>
                  <Text variant="labelSm" color="onSurfaceVariant" style={styles.bannerHint}>
                    {t('recurringEdit.isSubscriptionBanner')}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={6}
                    onPress={() => openSubscriptionEditor({ id: rule.id })}
                  >
                    <Text variant="labelMd" color="primary">
                      {t('recurringEdit.editAsSubscription')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <AmountInput value={amount} onChange={setAmount} currency={currency} locale={locale} />

            <View style={styles.section}>
              <Text variant="labelSm" color="onSurfaceVariant" style={styles.sectionLabel}>
                {t('quickAdd.category')}
              </Text>
              <CategoryPicker
                categories={categories}
                kind={rule.kind}
                value={categoryId}
                onChange={setCategoryId}
                onAddPress={() => undefined}
              />
            </View>

            <CurrencyRow value={currency} onChange={setCurrency} />
            <NoteInput value={note} onChange={setNote} />

            <RecurringConfig value={config} onChange={setConfig} locale={locale} />

            {/* Plain recurring (gider) → aboneliğe çevirme girişi (subscription-edit convert mode). */}
            {rule.kind === 'expense' && !rule.isSubscription ? (
              <Button
                label={t('recurringEdit.convertToSubscription')}
                variant="secondary"
                onPress={() => openSubscriptionEditor({ fromRecurringId: rule.id })}
              />
            ) : null}

            <ErrorText style={styles.error}>{error}</ErrorText>

            <Button label={t('categoryEdit.save')} loading={updateRule.isPending} onPress={onSave} />
            <Button
              label={t('recurring.deleteConfirmAction')}
              variant="secondary"
              loading={deleteRule.isPending}
              disabled={busy}
              onPress={onDelete}
              style={styles.delete}
            />
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
    maxHeight: '88%',
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
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
  },
  bannerText: {
    flex: 1,
    gap: spacing.sm,
  },
  bannerHint: {
    lineHeight: 18,
  },
  section: {
    gap: spacing.md,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  error: {
    textAlign: 'center',
  },
  delete: {
    marginTop: spacing.xs,
  },
});
