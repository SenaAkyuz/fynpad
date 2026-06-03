import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';

import { GoalIconPicker } from '@/components/goals/GoalIconPicker';
import { AmountInput } from '@/components/quick-add/AmountInput';
import { CurrencyRow } from '@/components/quick-add/CurrencyRow';
import { DateRow } from '@/components/quick-add/DateRow';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import {
  useAddToGoal,
  useCreateGoal,
  useDeleteGoal,
  useGoals,
  useSubtractFromGoal,
  useUpdateGoal,
} from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { formatCurrency, toISODate } from '@/lib/format';
import { goalSchema, type GoalForm } from '@/lib/validation';
import { useAppStore } from '@/stores/useAppStore';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Goal } from '@/types';

export default function GoalEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: goals = [], isLoading } = useGoals();
  const editing = id ? goals.find((g) => g.id === id) ?? null : null;

  // Edit modunda hedef henüz cache'te yoksa kısa spinner.
  if (id && !editing && isLoading) {
    return (
      <Screen center edges={['top', 'bottom']}>
        <Spinner />
      </Screen>
    );
  }

  return <GoalEditForm editing={editing} />;
}

function GoalEditForm({ editing }: { editing: Goal | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const locale = useAppStore((s) => s.locale);
  const isOnline = useNetworkStore((s) => s.isOnline);
  const { data: profile } = useProfile();

  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const addToGoal = useAddToGoal();
  const subtractFromGoal = useSubtractFromGoal();

  const today = toISODate(new Date());

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { isValid },
  } = useForm<GoalForm>({
    resolver: zodResolver(goalSchema),
    mode: 'onChange',
    defaultValues: editing
      ? {
          name: editing.name,
          description: editing.description ?? '',
          iconKey: editing.iconKey ?? 'star',
          targetAmount: editing.targetAmount,
          currency: editing.currency,
          targetDate: editing.targetDate,
          currentAmount: editing.currentAmount,
        }
      : {
          name: '',
          description: '',
          iconKey: 'plane',
          targetAmount: 0,
          currency: profile?.defaultCurrency ?? 'TRY',
          targetDate: null,
          currentAmount: 0,
        },
  });

  const currency = watch('currency');
  const targetDate = watch('targetDate');

  // +/- birikim dialog'u (Alert.prompt cross-platform değil → kendi modal'ımız).
  const [adjust, setAdjust] = useState<{ mode: 'add' | 'subtract'; amount: number } | null>(null);

  const onSubmit = async (values: GoalForm) => {
    const base = {
      name: values.name.trim(),
      description: values.description?.trim() ? values.description.trim() : null,
      targetAmount: values.targetAmount,
      currency: values.currency,
      targetDate: values.targetDate ?? null,
      iconKey: values.iconKey,
    };

    // Çevrimdışı: mutation 'online' networkMode ile paused olur → mutateAsync resolve etmez.
    // Fire-and-forget kuyruğa düşür, modal hemen kapansın.
    if (!isOnline) {
      if (editing) {
        updateGoal.mutate({ id: editing.id, ...base, currentAmount: values.currentAmount ?? editing.currentAmount });
      } else {
        createGoal.mutate(base);
      }
      router.back();
      return;
    }

    try {
      if (editing) {
        await updateGoal.mutateAsync({
          id: editing.id,
          ...base,
          currentAmount: values.currentAmount ?? editing.currentAmount,
        });
      } else {
        await createGoal.mutateAsync(base);
      }
      router.back();
    } catch {
      Alert.alert(t('goals.errors.saveFailed'));
    }
  };

  const onConfirmAdjust = () => {
    if (!editing || !adjust || adjust.amount <= 0) {
      setAdjust(null);
      return;
    }
    const mutation = adjust.mode === 'add' ? addToGoal : subtractFromGoal;
    const payload = { id: editing.id, amount: adjust.amount };
    setAdjust(null);
    // Offline: paused olur → fire-and-forget + kapat. Online: await + kapat, hata varsa uyar.
    if (!isOnline) {
      mutation.mutate(payload);
      router.back();
      return;
    }
    mutation.mutate(payload, {
      onSuccess: () => router.back(),
      onError: () => Alert.alert(t('goals.errors.saveFailed')),
    });
  };

  const onDelete = () => {
    if (!editing) return;
    Alert.alert(
      t('goals.form.deleteConfirmTitle'),
      t('goals.form.deleteConfirmMessage', { name: editing.name }),
      [
        { text: t('goals.form.deleteCancel'), style: 'cancel' },
        {
          text: t('goals.form.deleteConfirmAction'),
          style: 'destructive',
          onPress: () => {
            if (!isOnline) {
              deleteGoal.mutate(editing.id);
              router.back();
              return;
            }
            deleteGoal.mutate(editing.id, {
              onSuccess: () => router.back(),
              onError: () => Alert.alert(t('goals.errors.deleteFailed')),
            });
          },
        },
      ]
    );
  };

  const busy =
    createGoal.isPending ||
    updateGoal.isPending ||
    deleteGoal.isPending ||
    addToGoal.isPending ||
    subtractFromGoal.isPending;

  const hasDeadline = targetDate != null;

  // Manuel birikim UX: "+Ekle" diyaloğunda hedefe ne kadar kaldığını göster.
  const remaining = editing ? Math.max(0, editing.targetAmount - editing.currentAmount) : 0;

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()}>
          <Icon name="x" size={26} color={colors.primary} strokeWidth={2} />
        </Pressable>
        <Text variant="headlineMd">
          {t(editing ? 'goals.form.editTitle' : 'goals.form.createTitle')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* İkon */}
          <View style={styles.section}>
            <Text variant="labelSm" color="onSurfaceVariant" style={styles.sectionLabel}>
              {t('goals.form.iconLabel')}
            </Text>
            <Controller
              control={control}
              name="iconKey"
              render={({ field: { value, onChange } }) => (
                <GoalIconPicker value={value} onChange={onChange} />
              )}
            />
          </View>

          {/* Hedef adı */}
          <Controller
            control={control}
            name="name"
            render={({ field: { value, onChange } }) => (
              <TextInput
                label={t('goals.form.nameLabel')}
                placeholder={t('goals.form.namePlaceholder')}
                value={value}
                onChangeText={onChange}
                maxLength={100}
              />
            )}
          />

          {/* Açıklama (opsiyonel) */}
          <Controller
            control={control}
            name="description"
            render={({ field: { value, onChange } }) => (
              <TextInput
                label={t('goals.form.descriptionLabel')}
                placeholder={t('goals.form.descriptionPlaceholder')}
                value={value ?? ''}
                onChangeText={onChange}
                multiline
                maxLength={200}
              />
            )}
          />

          {/* Hedef tutar */}
          <View style={styles.section}>
            <Text variant="labelSm" color="onSurfaceVariant" style={styles.sectionLabel}>
              {t('goals.form.targetLabel')}
            </Text>
            <Controller
              control={control}
              name="targetAmount"
              render={({ field: { value, onChange } }) => (
                <AmountInput value={value} onChange={onChange} currency={currency} locale={locale} />
              )}
            />
          </View>

          {/* Para birimi */}
          <Controller
            control={control}
            name="currency"
            render={({ field: { value, onChange } }) => <CurrencyRow value={value} onChange={onChange} />}
          />

          {/* Son tarih — "Tarih belirle" toggle */}
          <View style={[styles.toggleRow, { backgroundColor: colors.surfaceContainerLow }]}>
            <Text variant="labelMd" color="onSurfaceVariant">
              {t('goals.form.deadlineToggle')}
            </Text>
            <Switch
              value={hasDeadline}
              onValueChange={(on) => setValue('targetDate', on ? today : null, { shouldValidate: true })}
              trackColor={{ false: colors.surfaceContainerHighest, true: colors.primary }}
              thumbColor={hasDeadline ? colors.onPrimary : colors.surfaceContainerLowest}
              ios_backgroundColor={colors.surfaceContainerHighest}
            />
          </View>
          {hasDeadline ? (
            <DateRow
              label={t('goals.form.deadlineLabel')}
              value={targetDate ?? today}
              minimumDate={today}
              onChange={(iso) => setValue('targetDate', iso, { shouldValidate: true })}
              locale={locale}
            />
          ) : null}

          {/* Mevcut birikim (sadece edit modunda) */}
          {editing ? (
            <>
              <View style={styles.section}>
                <Text variant="labelSm" color="onSurfaceVariant" style={styles.sectionLabel}>
                  {t('goals.form.currentLabel')}
                </Text>
                <Controller
                  control={control}
                  name="currentAmount"
                  render={({ field: { value, onChange } }) => (
                    <AmountInput
                      value={value ?? 0}
                      onChange={onChange}
                      currency={currency}
                      locale={locale}
                    />
                  )}
                />
              </View>

              {/* Hızlı +/- birikim */}
              <View style={styles.adjustRow}>
                <Button
                  label={t('goals.form.addProgress')}
                  variant="secondary"
                  disabled={busy}
                  onPress={() => setAdjust({ mode: 'add', amount: 0 })}
                  style={styles.adjustBtn}
                />
                <Button
                  label={t('goals.form.subtractProgress')}
                  variant="secondary"
                  disabled={busy}
                  onPress={() => setAdjust({ mode: 'subtract', amount: 0 })}
                  style={styles.adjustBtn}
                />
              </View>
            </>
          ) : null}

          <Button
            label={t('goals.form.save')}
            loading={createGoal.isPending || updateGoal.isPending}
            disabled={!isValid || busy}
            onPress={handleSubmit(onSubmit)}
            style={styles.submit}
          />

          {editing ? (
            <Button
              label={t('goals.form.delete')}
              variant="secondary"
              loading={deleteGoal.isPending}
              disabled={busy}
              onPress={onDelete}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* +/- birikim dialog'u */}
      <Modal
        visible={adjust != null}
        transparent
        animationType="fade"
        onRequestClose={() => setAdjust(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setAdjust(null)}>
          <Pressable style={styles.dialogWrap} onPress={(e) => e.stopPropagation()}>
            <GlassCard>
              <Text variant="headlineSm" style={styles.dialogTitle}>
                {t(adjust?.mode === 'subtract' ? 'goals.form.subtractProgress' : 'goals.form.addProgress')}
              </Text>
              <Text variant="labelSm" color="onSurfaceVariant" style={styles.dialogSub}>
                {adjust?.mode === 'add' && remaining > 0 && editing
                  ? t('goals.addSavings.subtitle', {
                      remaining: formatCurrency(remaining, editing.currency, locale),
                    })
                  : t('goals.form.progressDialogTitle')}
              </Text>
              <AmountInput
                value={adjust?.amount ?? 0}
                onChange={(v) => setAdjust((prev) => (prev ? { ...prev, amount: v } : prev))}
                currency={currency}
                locale={locale}
              />
              <View style={styles.dialogActions}>
                <Button
                  label={t('goals.form.deleteCancel')}
                  variant="secondary"
                  onPress={() => setAdjust(null)}
                  style={styles.adjustBtn}
                />
                <Button
                  label={t('goals.form.save')}
                  disabled={(adjust?.amount ?? 0) <= 0}
                  onPress={onConfirmAdjust}
                  style={styles.adjustBtn}
                />
              </View>
            </GlassCard>
          </Pressable>
        </Pressable>
      </Modal>
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    minHeight: 56,
  },
  adjustRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  adjustBtn: { flex: 1 },
  submit: { marginTop: spacing.sm },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: spacing.containerMargin,
  },
  dialogWrap: {
    width: '100%',
  },
  dialogTitle: {
    textAlign: 'center',
  },
  dialogSub: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
