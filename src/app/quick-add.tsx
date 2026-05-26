import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/quick-add/AmountInput';
import { CategoryEditModal } from '@/components/quick-add/CategoryEditModal';
import { CategoryPicker } from '@/components/quick-add/CategoryPicker';
import { CurrencyRow } from '@/components/quick-add/CurrencyRow';
import { DateRow } from '@/components/quick-add/DateRow';
import { KindToggle } from '@/components/quick-add/KindToggle';
import { NoteInput } from '@/components/quick-add/NoteInput';
import { RecurringConfig, defaultRecurringRule } from '@/components/quick-add/RecurringConfig';
import { RecurringToggle } from '@/components/quick-add/RecurringToggle';
import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/ErrorText';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';
import { useCategories } from '@/hooks/useCategories';
import { useProfile } from '@/hooks/useProfile';
import { useCreateRecurringRule } from '@/hooks/useRecurringRules';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { toISODate } from '@/lib/format';
import { quickAddSchema, type QuickAddForm } from '@/lib/validation';
import { useAppStore } from '@/stores/useAppStore';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * Quick Add modal (design: quick_add_transaction_*.html).
 * Düzen kararları (brief NE > design NASIL):
 *  - Kind toggle aktif renkleri semantik (Gelir yeşil / Gider kırmızı), Transfer disabled. [brief 7.3]
 *  - Tarih / Para Birimi / Not satırları HTML'de yok ama brief/şema gerektiriyor → eklendi.
 *  - Recurring toggle HTML'de var; brief kararı (7.3) gereği GİZLENDİ — Part 6'da etkinleşecek.
 */
export default function QuickAddScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const locale = useAppStore((s) => s.locale);
  const isOnline = useNetworkStore((s) => s.isOnline);

  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: profile } = useProfile();
  const createTransaction = useCreateTransaction();
  const createRecurringRule = useCreateRecurringRule();

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { isValid },
  } = useForm<QuickAddForm>({
    resolver: zodResolver(quickAddSchema),
    mode: 'onChange',
    defaultValues: {
      kind: 'expense',
      amount: 0,
      categoryId: '',
      currency: 'TRY',
      date: toISODate(new Date()),
      note: '',
      recurring: false,
      recurringRule: null,
    },
  });

  const kind = watch('kind');
  const recurring = watch('recurring');
  const recurringRule = watch('recurringRule');

  // Profil yüklenince default currency'yi uygula (kullanıcı henüz dokunmadıysa).
  const currencyInitialized = useRef(false);
  useEffect(() => {
    if (!currencyInitialized.current && profile?.defaultCurrency) {
      currencyInitialized.current = true;
      setValue('currency', profile.defaultCurrency);
    }
  }, [profile?.defaultCurrency, setValue]);

  const onSubmit = async (values: QuickAddForm) => {
    setFormError('');
    const note = values.note?.trim() ? values.note.trim() : null;
    const isRecurring = !!(values.recurring && values.recurringRule);

    const runRecurring = () =>
      // Tekrarlayan kural oluştur (lib içinde backfill için processRecurringRules çağrılır).
      createRecurringRule.mutateAsync({
        categoryId: values.categoryId,
        amount: values.amount,
        currency: values.currency,
        kind: values.kind,
        note,
        frequency: values.recurringRule!.frequency,
        dayOfWeek: values.recurringRule!.dayOfWeek ?? null,
        dayOfMonth: values.recurringRule!.dayOfMonth ?? null,
        monthOfYear: values.recurringRule!.monthOfYear ?? null,
        startDate: values.recurringRule!.startDate,
        endDate: values.recurringRule!.endDate ?? null,
      });
    const runTransaction = () =>
      createTransaction.mutateAsync({
        categoryId: values.categoryId,
        amount: values.amount,
        currency: values.currency,
        kind: values.kind,
        date: values.date,
        note,
      });

    // Çevrimdışı: mutation 'online' networkMode ile paused olur → mutateAsync resolve ETMEZ.
    // Bu yüzden await etme; optimistic update (createTransaction.onMutate) işlemi anında
    // gösterir, mutation kuyruğa düşer ve bağlantı gelince otomatik gönderilir. Modal hemen
    // kapanır. (Paused promise reddetmediği için catch tetiklenmez — sadece void'le.)
    if (!isOnline) {
      void (isRecurring ? runRecurring() : runTransaction());
      router.back();
      return;
    }

    try {
      await (isRecurring ? runRecurring() : runTransaction());
      router.back();
    } catch {
      setFormError(
        values.recurring ? t('errors.recurring.createFailed') : t('errors.transaction.createFailed')
      );
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()}>
          <Icon name="x" size={26} color={colors.primary} strokeWidth={2} />
        </Pressable>
        <Text variant="headlineMd">{t('quickAdd.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Controller
            control={control}
            name="kind"
            render={({ field: { value, onChange } }) => (
              <KindToggle
                value={value}
                onChange={(next) => {
                  onChange(next);
                  // kind değişince kategori seçimi sıfırlanır (liste kind'a göre filtreli)
                  setValue('categoryId', '', { shouldValidate: true });
                }}
              />
            )}
          />

          <Controller
            control={control}
            name="amount"
            render={({ field: { value, onChange } }) => (
              <AmountInput
                value={value}
                onChange={onChange}
                currency={watch('currency')}
                locale={locale}
              />
            )}
          />

          <View style={styles.section}>
            <Text variant="labelSm" color="onSurfaceVariant" style={styles.sectionLabel}>
              {t('quickAdd.category')}
            </Text>
            {categoriesLoading || !categories ? (
              <View style={styles.loading}>
                <Spinner />
              </View>
            ) : (
              <Controller
                control={control}
                name="categoryId"
                render={({ field: { value, onChange } }) => (
                  <CategoryPicker
                    categories={categories}
                    kind={kind}
                    value={value}
                    onChange={onChange}
                    onAddPress={() => setShowCategoryModal(true)}
                  />
                )}
              />
            )}
          </View>

          <View style={styles.rows}>
            {/* Recurring ON iken "Tarih" gizlenir; yerine config'in "Başlangıç"ı geçer. */}
            {!recurring ? (
              <Controller
                control={control}
                name="date"
                render={({ field: { value, onChange } }) => (
                  <DateRow value={value} onChange={onChange} locale={locale} />
                )}
              />
            ) : null}
            <Controller
              control={control}
              name="currency"
              render={({ field: { value, onChange } }) => (
                <CurrencyRow value={value} onChange={onChange} />
              )}
            />
            <Controller
              control={control}
              name="note"
              render={({ field: { value, onChange } }) => (
                <NoteInput value={value ?? ''} onChange={onChange} />
              )}
            />

            <Controller
              control={control}
              name="recurring"
              render={({ field: { value, onChange } }) => (
                <RecurringToggle
                  value={!!value}
                  onChange={(next) => {
                    onChange(next);
                    // Açılırken makul varsayılan kural (transaction tarihinden); kapanırken temizle.
                    setValue('recurringRule', next ? defaultRecurringRule(watch('date')) : null, {
                      shouldValidate: true,
                    });
                  }}
                />
              )}
            />

            {recurring && recurringRule ? (
              <RecurringConfig
                value={recurringRule}
                onChange={(next) => setValue('recurringRule', next, { shouldValidate: true })}
                locale={locale}
              />
            ) : null}
          </View>

          <ErrorText style={styles.error}>{formError}</ErrorText>

          <Button
            label={t('quickAdd.submit')}
            loading={isOnline && (createTransaction.isPending || createRecurringRule.isPending)}
            disabled={!isValid}
            onPress={handleSubmit(onSubmit)}
            style={styles.submit}
          />

          {!isOnline ? (
            <Text variant="labelSm" color="onSurfaceVariant" style={styles.offlineHint}>
              {t('common.offlineSavedSyncLater')}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <CategoryEditModal
        visible={showCategoryModal}
        kind={kind}
        onClose={() => setShowCategoryModal(false)}
        onCreated={(category) => {
          setShowCategoryModal(false);
          setValue('categoryId', category.id, { shouldValidate: true });
        }}
      />
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
  headerSpacer: {
    width: 26,
  },
  content: {
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.sm,
    paddingBottom: spacing.stackLg,
    gap: spacing.stackMd,
  },
  section: {
    gap: spacing.md,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rows: {
    gap: spacing.md,
  },
  loading: {
    paddingVertical: spacing.stackMd,
    alignItems: 'center',
  },
  error: {
    textAlign: 'center',
  },
  submit: {
    marginTop: spacing.sm,
  },
  offlineHint: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
