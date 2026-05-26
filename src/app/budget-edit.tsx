import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/quick-add/AmountInput';
import { CurrencyRow } from '@/components/quick-add/CurrencyRow';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';
import { useBudgets, useDeleteBudget, useUpsertBudget } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import { useProfile } from '@/hooks/useProfile';
import { budgetSchema, type BudgetForm } from '@/lib/validation';
import { useAppStore } from '@/stores/useAppStore';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Category, CategoryBudget } from '@/types';

export default function BudgetEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: budgets = [], isLoading } = useBudgets();
  const editing = id ? budgets.find((b) => b.id === id) ?? null : null;

  // Edit modunda bütçe henüz cache'te yoksa kısa spinner.
  if (id && !editing && isLoading) {
    return (
      <Screen center edges={['top', 'bottom']}>
        <Spinner />
      </Screen>
    );
  }

  return <BudgetEditForm editing={editing} />;
}

function BudgetEditForm({ editing }: { editing: CategoryBudget | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const locale = useAppStore((s) => s.locale);
  const isOnline = useNetworkStore((s) => s.isOnline);

  const { data: profile } = useProfile();
  const { data: categories = [] } = useCategories();
  const { data: budgets = [] } = useBudgets();

  const upsertBudget = useUpsertBudget();
  const deleteBudget = useDeleteBudget();

  // Sadece expense kategoriler; create modunda zaten bütçesi olanları çıkar.
  const budgetedIds = new Set(budgets.map((b) => b.categoryId));
  const expenseCategories = categories.filter((c) => c.kind === 'expense');
  const availableCategories = editing
    ? expenseCategories.filter((c) => c.id === editing.categoryId)
    : expenseCategories.filter((c) => !budgetedIds.has(c.id));

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { isValid },
  } = useForm<BudgetForm>({
    resolver: zodResolver(budgetSchema),
    mode: 'onChange',
    defaultValues: editing
      ? { categoryId: editing.categoryId, amount: editing.amount, currency: editing.currency }
      : { categoryId: '', amount: 0, currency: profile?.defaultCurrency ?? 'TRY' },
  });

  const categoryId = watch('categoryId');
  const busy = upsertBudget.isPending || deleteBudget.isPending;

  const onSubmit = async (values: BudgetForm) => {
    const input = {
      categoryId: values.categoryId,
      amount: values.amount,
      currency: values.currency,
    };

    // Çevrimdışı: 'online' networkMode ile mutation paused olur (resolve etmez) → await etme,
    // fire-and-forget ile kuyruğa düşür, modal hemen kapansın.
    if (!isOnline) {
      upsertBudget.mutate(input);
      router.back();
      return;
    }

    try {
      await upsertBudget.mutateAsync(input);
      router.back();
    } catch {
      Alert.alert(t(editing ? 'errors.budget.updateFailed' : 'errors.budget.createFailed'));
    }
  };

  const onDelete = () => {
    if (!editing) return;
    Alert.alert(
      t('analytics.budgetEdit.deleteConfirmTitle'),
      t('analytics.budgetEdit.deleteConfirmMessage'),
      [
        { text: t('analytics.budgetEdit.deleteCancel'), style: 'cancel' },
        {
          text: t('analytics.budgetEdit.deleteConfirmAction'),
          style: 'destructive',
          onPress: () => {
            // Offline: paused olur, onSuccess/onError tetiklenmez → modal'ı manuel kapat.
            if (!isOnline) {
              deleteBudget.mutate(editing.id);
              router.back();
              return;
            }
            deleteBudget.mutate(editing.id, {
              onSuccess: () => router.back(),
              onError: () => Alert.alert(t('errors.budget.deleteFailed')),
            });
          },
        },
      ]
    );
  };

  const CategoryChip = ({ category }: { category: Category }) => {
    const active = category.id === categoryId;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active, disabled: !!editing }}
        disabled={!!editing}
        onPress={() => setValue('categoryId', category.id, { shouldValidate: true })}
        style={[
          styles.chip,
          { backgroundColor: active ? colors.primary : colors.surfaceContainerHighest },
        ]}
      >
        <Icon
          name={(category.icon as IconName) ?? 'more-horizontal'}
          size={16}
          color={active ? colors.onPrimary : category.color}
          strokeWidth={2}
        />
        <Text variant="labelMd" style={{ color: active ? colors.onPrimary : colors.onSurfaceVariant }}>
          {t(category.name)}
        </Text>
      </Pressable>
    );
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()}>
          <Icon name="x" size={26} color={colors.primary} strokeWidth={2} />
        </Pressable>
        <Text variant="headlineMd">
          {t(editing ? 'analytics.budgetEdit.editTitle' : 'analytics.budgetEdit.createTitle')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Kategori (sadece expense) */}
          <View style={styles.section}>
            <Text variant="labelSm" color="onSurfaceVariant" style={styles.sectionLabel}>
              {t('analytics.budgetEdit.categoryLabel')}
            </Text>
            {availableCategories.length === 0 ? (
              <Text variant="bodyMd" color="onSurfaceVariant">
                {t('analytics.budgetEdit.noCategories')}
              </Text>
            ) : (
              <View style={styles.chips}>
                {availableCategories.map((c) => (
                  <CategoryChip key={c.id} category={c} />
                ))}
              </View>
            )}
          </View>

          {/* Aylık limit */}
          <View style={styles.section}>
            <Text variant="labelSm" color="onSurfaceVariant" style={styles.sectionLabel}>
              {t('analytics.budgetEdit.amountLabel')}
            </Text>
            <Controller
              control={control}
              name="amount"
              render={({ field: { value, onChange } }) => (
                <AmountInput value={value} onChange={onChange} currency={watch('currency')} locale={locale} />
              )}
            />
          </View>

          {/* Para birimi */}
          <Controller
            control={control}
            name="currency"
            render={({ field: { value, onChange } }) => <CurrencyRow value={value} onChange={onChange} />}
          />

          <Button
            label={t('analytics.budgetEdit.save')}
            loading={upsertBudget.isPending}
            disabled={!isValid || busy}
            onPress={handleSubmit(onSubmit)}
            style={styles.submit}
          />

          {editing ? (
            <Button
              label={t('analytics.budgetEdit.delete')}
              variant="secondary"
              loading={deleteBudget.isPending}
              disabled={busy}
              onPress={onDelete}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: spacing.md,
  },
  headerSpacer: { width: 26 },
  content: {
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.sm,
    paddingBottom: spacing.stackLg,
    gap: spacing.stackMd,
  },
  section: { gap: spacing.md },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  submit: { marginTop: spacing.sm },
});
