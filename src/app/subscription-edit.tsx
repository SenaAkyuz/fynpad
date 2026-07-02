import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';

import { ServiceIconPicker } from '@/components/subscriptions/ServiceIconPicker';
import { AmountInput } from '@/components/quick-add/AmountInput';
import { CurrencyRow } from '@/components/quick-add/CurrencyRow';
import { DateRow } from '@/components/quick-add/DateRow';
import { NoteInput } from '@/components/quick-add/NoteInput';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { useProfile } from '@/hooks/useProfile';
import { useRecurringRules, useUpdateRecurringRule } from '@/hooks/useRecurringRules';
import {
  useCreateSubscription,
  useDeleteSubscription,
  useSubscriptions,
  useUpdateSubscription,
} from '@/hooks/useSubscriptions';
import { toISODate } from '@/lib/format';
import { requestPermissions } from '@/lib/notifications';
import { subscriptionSchema, type SubscriptionForm } from '@/lib/validation';
import { useAppStore } from '@/stores/useAppStore';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { RecurringRule, Subscription } from '@/types';

const DAYS = Array.from({ length: 30 }, (_, i) => i + 1);
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const LAST_DAY = 31;

export default function SubscriptionEditScreen() {
  // 3 mod: id → mevcut aboneliği düzenle · fromRecurringId → tekrarlayan kuralı aboneliğe çevir · ikisi de yok → yeni.
  const { id, fromRecurringId } = useLocalSearchParams<{ id?: string; fromRecurringId?: string }>();
  const { data: subs = [], isLoading: subsLoading } = useSubscriptions();
  const { data: rules = [], isLoading: rulesLoading } = useRecurringRules();
  const editing = id ? subs.find((s) => s.id === id) ?? null : null;
  const converting = fromRecurringId ? rules.find((r) => r.id === fromRecurringId) ?? null : null;

  // İlgili kayıt henüz cache'te yoksa kısa spinner.
  if ((id && !editing && subsLoading) || (fromRecurringId && !converting && rulesLoading)) {
    return (
      <Screen center edges={['top', 'bottom']}>
        <Spinner />
      </Screen>
    );
  }

  return <SubscriptionEditForm editing={editing} converting={converting} />;
}

function SubscriptionEditForm({
  editing,
  converting,
}: {
  editing: Subscription | null;
  converting: RecurringRule | null;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const locale = useAppStore((s) => s.locale);
  const isOnline = useNetworkStore((s) => s.isOnline);
  const { data: profile } = useProfile();

  const createSub = useCreateSubscription();
  const updateSub = useUpdateSubscription();
  const deleteSub = useDeleteSubscription();
  const updateRule = useUpdateRecurringRule();

  const mode: 'edit' | 'convert' | 'create' = editing ? 'edit' : converting ? 'convert' : 'create';
  const today = toISODate(new Date());
  const now = new Date();

  // Prefill kaynağı: düzenleme → abonelik; çevirme → tekrarlayan kural. Abonelik DB constraint'i
  // gereği frequency monthly|yearly olmalı → kaynak daily/weekly ise monthly'e indir.
  const source = editing ?? converting;
  const sourceFrequency: 'monthly' | 'yearly' =
    source && (source.frequency === 'monthly' || source.frequency === 'yearly')
      ? source.frequency
      : 'monthly';

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { isValid },
  } = useForm<SubscriptionForm>({
    resolver: zodResolver(subscriptionSchema),
    mode: 'onChange',
    defaultValues: source
      ? {
          serviceName: source.serviceName ?? '',
          planName: source.planName ?? '',
          iconKey: source.iconKey ?? 'generic',
          amount: source.amount,
          currency: source.currency,
          frequency: sourceFrequency,
          dayOfMonth: source.dayOfMonth ?? now.getDate(),
          monthOfYear: source.monthOfYear ?? now.getMonth() + 1,
          startDate: source.startDate,
          endDate: source.endDate,
          note: source.note ?? '',
        }
      : {
          serviceName: '',
          planName: '',
          iconKey: 'generic',
          amount: 0,
          currency: profile?.defaultCurrency ?? 'TRY',
          frequency: 'monthly',
          dayOfMonth: now.getDate(),
          monthOfYear: now.getMonth() + 1,
          startDate: today,
          endDate: null,
          note: '',
        },
  });

  const frequency = watch('frequency');
  const startDate = watch('startDate');
  const endDate = watch('endDate');

  const onSubmit = async (values: SubscriptionForm) => {
    const input = {
      serviceName: values.serviceName.trim(),
      planName: values.planName?.trim() ? values.planName.trim() : null,
      iconKey: values.iconKey,
      amount: values.amount,
      currency: values.currency,
      frequency: values.frequency,
      dayOfMonth: values.dayOfMonth,
      monthOfYear: values.frequency === 'yearly' ? values.monthOfYear ?? null : null,
      startDate: values.startDate,
      endDate: values.endDate ?? null,
      note: values.note?.trim() ? values.note.trim() : null,
    };

    // İlk kez abonelik (yeni veya çevirme): bildirim izni iste. Reddedilse de oluşturulur.
    if (mode !== 'edit') {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(t('subscriptions.permissions.denied'), undefined, [
          { text: t('settings.signOutCancel'), style: 'cancel' },
          {
            text: t('subscriptions.permissions.openSettings'),
            onPress: () => void Linking.openSettings(),
          },
        ]);
      }
    }

    // Çevirme modu: mevcut tekrarlayan kuralı is_subscription=true + metadata ile günceller
    // (yeni kayıt OLUŞMAZ, aynı rule.id korunur). updateRecurringRule hook'u subscriptionsKey'i
    // invalidate ettiği için liste + growth + bildirim reschedule otomatik çalışır.
    if (mode === 'convert' && converting) {
      const patch = {
        isSubscription: true,
        serviceName: input.serviceName,
        planName: input.planName,
        iconKey: input.iconKey,
        amount: input.amount,
        currency: input.currency,
        frequency: input.frequency,
        dayOfMonth: input.dayOfMonth,
        monthOfYear: input.monthOfYear,
        startDate: input.startDate,
        endDate: input.endDate,
        note: input.note,
      };
      if (!isOnline) {
        updateRule.mutate({ id: converting.id, patch });
        router.back();
        return;
      }
      try {
        await updateRule.mutateAsync({ id: converting.id, patch });
        router.back();
      } catch {
        Alert.alert(t('subscriptions.errors.updateFailed'));
      }
      return;
    }

    // Çevrimdışı: mutation 'online' networkMode ile paused olur → mutateAsync RESOLVE ETMEZ.
    // Bu yüzden await etme; fire-and-forget ile kuyruğa düşür, modal hemen kapansın, bağlantı
    // gelince otomatik gönderilir.
    if (!isOnline) {
      if (editing) {
        updateSub.mutate({ id: editing.id, patch: input });
      } else {
        createSub.mutate(input);
      }
      router.back();
      return;
    }

    try {
      if (editing) {
        await updateSub.mutateAsync({ id: editing.id, patch: input });
      } else {
        await createSub.mutateAsync(input);
      }
      router.back();
    } catch {
      Alert.alert(t(editing ? 'subscriptions.errors.updateFailed' : 'subscriptions.errors.createFailed'));
    }
  };

  const onDelete = () => {
    if (!editing) return;
    Alert.alert(t('subscriptions.form.deleteConfirmTitle'), t('subscriptions.form.deleteConfirmMessage'), [
      { text: t('subscriptions.form.deleteCancel'), style: 'cancel' },
      {
        text: t('subscriptions.form.deleteConfirmAction'),
        style: 'destructive',
        onPress: () => {
          // Offline: paused olur, onSuccess/onError tetiklenmez → modal'ı manuel kapat.
          if (!isOnline) {
            deleteSub.mutate(editing.id);
            router.back();
            return;
          }
          deleteSub.mutate(editing.id, {
            onSuccess: () => router.back(),
            onError: () => Alert.alert(t('subscriptions.errors.deleteFailed')),
          });
        },
      },
    ]);
  };

  const onFrequency = (next: 'monthly' | 'yearly') => {
    setValue('frequency', next, { shouldValidate: true });
    if (next === 'yearly' && watch('monthOfYear') == null) {
      setValue('monthOfYear', now.getMonth() + 1, { shouldValidate: true });
    }
  };

  const noEndDate = endDate == null;
  const busy = createSub.isPending || updateSub.isPending || deleteSub.isPending || updateRule.isPending;
  const titleKey =
    mode === 'edit'
      ? 'subscriptions.form.editTitle'
      : mode === 'convert'
        ? 'subscriptions.form.convertTitle'
        : 'subscriptions.addSubscription';

  const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: active ? colors.primary : colors.surfaceContainerHighest }]}
    >
      <Text variant="labelMd" style={{ color: active ? colors.onPrimary : colors.onSurfaceVariant }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()}>
          <Icon name="x" size={26} color={colors.primary} strokeWidth={2} />
        </Pressable>
        <Text variant="headlineMd">{t(titleKey)}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Çevirme modu: kullanıcıya mevcut kuraldan dolduğunu + eksikleri tamamlamasını anlat. */}
          {mode === 'convert' ? (
            <View style={[styles.convertHint, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Icon name="credit-card" size={18} color={colors.primary} strokeWidth={2} />
              <Text variant="labelSm" color="onSurfaceVariant" style={styles.convertHintText}>
                {t('subscriptions.form.convertHint')}
              </Text>
            </View>
          ) : null}

          {/* Servis adı */}
          <Controller
            control={control}
            name="serviceName"
            render={({ field: { value, onChange } }) => (
              <TextInput
                label={t('subscriptions.form.serviceName')}
                placeholder={t('subscriptions.form.serviceNamePlaceholder')}
                value={value}
                onChangeText={onChange}
                maxLength={60}
              />
            )}
          />

          {/* Plan adı (opsiyonel) */}
          <Controller
            control={control}
            name="planName"
            render={({ field: { value, onChange } }) => (
              <TextInput
                label={t('subscriptions.form.planName')}
                placeholder={t('subscriptions.form.planNamePlaceholder')}
                value={value ?? ''}
                onChangeText={onChange}
                maxLength={60}
              />
            )}
          />

          {/* İkon */}
          <View style={styles.section}>
            <Text variant="labelSm" color="onSurfaceVariant" style={styles.sectionLabel}>
              {t('subscriptions.form.icon')}
            </Text>
            <Controller
              control={control}
              name="iconKey"
              render={({ field: { value, onChange } }) => (
                <ServiceIconPicker value={value} onChange={onChange} />
              )}
            />
          </View>

          {/* Ücret */}
          <Controller
            control={control}
            name="amount"
            render={({ field: { value, onChange } }) => (
              <AmountInput value={value} onChange={onChange} currency={watch('currency')} locale={locale} />
            )}
          />

          {/* Para birimi */}
          <Controller
            control={control}
            name="currency"
            render={({ field: { value, onChange } }) => <CurrencyRow value={value} onChange={onChange} />}
          />

          {/* Sıklık */}
          <View style={styles.section}>
            <Text variant="labelSm" color="onSurfaceVariant" style={styles.sectionLabel}>
              {t('subscriptions.form.frequency')}
            </Text>
            <View style={styles.chips}>
              <Chip label={t('subscriptions.form.freqMonthly')} active={frequency === 'monthly'} onPress={() => onFrequency('monthly')} />
              <Chip label={t('subscriptions.form.freqYearly')} active={frequency === 'yearly'} onPress={() => onFrequency('yearly')} />
            </View>
          </View>

          {/* Yıllık → hangi ay */}
          {frequency === 'yearly' ? (
            <View style={styles.section}>
              <Text variant="labelSm" color="onSurfaceVariant" style={styles.sectionLabel}>
                {t('subscriptions.form.monthOfYear')}
              </Text>
              <Controller
                control={control}
                name="monthOfYear"
                render={({ field: { value } }) => (
                  <View style={styles.chips}>
                    {MONTHS.map((m) => (
                      <Chip
                        key={m}
                        label={t(`recurring.months.${m}`)}
                        active={value === m}
                        onPress={() => setValue('monthOfYear', m, { shouldValidate: true })}
                      />
                    ))}
                  </View>
                )}
              />
            </View>
          ) : null}

          {/* Yenilenme günü */}
          <View style={styles.section}>
            <Text variant="labelSm" color="onSurfaceVariant" style={styles.sectionLabel}>
              {t('subscriptions.form.dayOfMonth')}
            </Text>
            <Controller
              control={control}
              name="dayOfMonth"
              render={({ field: { value } }) => (
                <View style={styles.chips}>
                  {DAYS.map((d) => (
                    <Chip
                      key={d}
                      label={String(d)}
                      active={value === d}
                      onPress={() => setValue('dayOfMonth', d, { shouldValidate: true })}
                    />
                  ))}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: value === LAST_DAY }}
                    onPress={() => setValue('dayOfMonth', LAST_DAY, { shouldValidate: true })}
                    style={[
                      styles.chip,
                      styles.chipWide,
                      { backgroundColor: value === LAST_DAY ? colors.primary : colors.surfaceContainerHighest },
                    ]}
                  >
                    <Text variant="labelMd" style={{ color: value === LAST_DAY ? colors.onPrimary : colors.onSurfaceVariant }}>
                      {t('recurring.lastDayOfMonth')}
                    </Text>
                  </Pressable>
                </View>
              )}
            />
          </View>

          {/* Başlangıç */}
          <Controller
            control={control}
            name="startDate"
            render={({ field: { value, onChange } }) => (
              <DateRow
                label={t('subscriptions.form.startDate')}
                value={value}
                onChange={(iso) => {
                  onChange(iso);
                  if (endDate && endDate < iso) {
                    setValue('endDate', iso, { shouldValidate: true });
                  }
                }}
                locale={locale}
              />
            )}
          />

          {/* Bitiş — Süresiz toggle */}
          <View style={[styles.endRow, { backgroundColor: colors.surfaceContainerLow }]}>
            <Text variant="labelMd" color="onSurfaceVariant">
              {t('subscriptions.form.noEndDate')}
            </Text>
            <Switch
              value={noEndDate}
              onValueChange={(noEnd) => setValue('endDate', noEnd ? null : startDate, { shouldValidate: true })}
              trackColor={{ false: colors.surfaceContainerHighest, true: colors.primary }}
              thumbColor={noEndDate ? colors.onPrimary : colors.surfaceContainerLowest}
              ios_backgroundColor={colors.surfaceContainerHighest}
            />
          </View>
          {!noEndDate ? (
            <DateRow
              label={t('subscriptions.form.endDate')}
              value={endDate ?? startDate}
              minimumDate={startDate}
              onChange={(iso) => setValue('endDate', iso, { shouldValidate: true })}
              locale={locale}
            />
          ) : null}

          {/* Not */}
          <Controller
            control={control}
            name="note"
            render={({ field: { value, onChange } }) => <NoteInput value={value ?? ''} onChange={onChange} />}
          />

          <Button
            label={t(mode === 'edit' ? 'subscriptions.form.submitUpdate' : 'subscriptions.form.submitCreate')}
            loading={createSub.isPending || updateSub.isPending || updateRule.isPending}
            disabled={!isValid || busy}
            onPress={handleSubmit(onSubmit)}
            style={styles.submit}
          />

          {editing ? (
            <Button
              label={t('subscriptions.form.delete')}
              variant="secondary"
              loading={deleteSub.isPending}
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
  convertHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
  },
  convertHintText: { flex: 1, lineHeight: 18 },
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    minWidth: 44,
    alignItems: 'center',
  },
  chipWide: { paddingHorizontal: spacing.lg },
  endRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    minHeight: 56,
  },
  submit: { marginTop: spacing.sm },
});
