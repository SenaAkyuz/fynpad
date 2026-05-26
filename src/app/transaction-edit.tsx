import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/quick-add/AmountInput';
import { CategoryPicker } from '@/components/quick-add/CategoryPicker';
import { CurrencyRow } from '@/components/quick-add/CurrencyRow';
import { DateRow } from '@/components/quick-add/DateRow';
import { KindToggle } from '@/components/quick-add/KindToggle';
import { NoteInput } from '@/components/quick-add/NoteInput';
import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/ErrorText';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';
import { useCategories } from '@/hooks/useCategories';
import { useDeleteTransaction, useTransactions, useUpdateTransaction } from '@/hooks/useTransactions';
import { transactionEditSchema, type TransactionEditForm } from '@/lib/validation';
import { useAppStore } from '@/stores/useAppStore';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Transaction } from '@/types';

/**
 * İşlem düzenleme/silme modal'ı. Brief diğer tüm entity'ler için edit/delete istiyor;
 * transaction da tutarlılık + UX için aynı pattern. Quick Add component'lerini reuse eder
 * ama recurring toggle YOK (sadece create flow'una ait). Param: ?id (zorunlu, edit modu).
 */
export default function TransactionEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: transactions = [], isLoading } = useTransactions();
  const transaction = id ? transactions.find((tx) => tx.id === id) ?? null : null;

  // Cache henüz yüklenmediyse kısa spinner; gerçekten yoksa hata durumu.
  if (!transaction) {
    return (
      <Screen center edges={['top', 'bottom']}>
        {isLoading ? <Spinner /> : <NotFound />}
      </Screen>
    );
  }

  return <TransactionEditForm transaction={transaction} />;
}

function NotFound() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={styles.notFound}>
      <Icon name="alert-triangle" size={40} strokeWidth={1.5} />
      <Text variant="bodyMd" color="onSurfaceVariant" style={styles.notFoundText}>
        {t('transactionEdit.notFound')}
      </Text>
      <Button label={t('common.cancel')} variant="secondary" onPress={() => router.back()} />
    </View>
  );
}

function TransactionEditForm({ transaction }: { transaction: Transaction }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const locale = useAppStore((s) => s.locale);
  const isOnline = useNetworkStore((s) => s.isOnline);

  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { isValid },
  } = useForm<TransactionEditForm>({
    resolver: zodResolver(transactionEditSchema),
    mode: 'onChange',
    defaultValues: {
      kind: transaction.kind,
      amount: transaction.amount,
      categoryId: transaction.categoryId,
      currency: transaction.currency,
      date: transaction.date,
      note: transaction.note ?? '',
    },
  });

  const kind = watch('kind');

  const onSubmit = async (values: TransactionEditForm) => {
    const patch = {
      kind: values.kind,
      amount: values.amount,
      categoryId: values.categoryId,
      currency: values.currency,
      date: values.date,
      note: values.note?.trim() ? values.note.trim() : null,
    };

    // Çevrimdışı: mutation 'online' networkMode ile paused olur → mutateAsync resolve ETMEZ.
    // Fire-and-forget ile kuyruğa düşür, modal hemen kapansın; bağlantı gelince otomatik gönderilir.
    if (!isOnline) {
      updateTransaction.mutate({ id: transaction.id, patch });
      router.back();
      return;
    }

    try {
      await updateTransaction.mutateAsync({ id: transaction.id, patch });
      router.back();
    } catch {
      Alert.alert(t('errors.transaction.updateFailed'));
    }
  };

  const onDelete = () => {
    Alert.alert(t('transactionEdit.deleteConfirmTitle'), t('transactionEdit.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          // Offline: paused olur → fire-and-forget + modal'ı manuel kapat.
          if (!isOnline) {
            deleteTransaction.mutate(transaction.id);
            router.back();
            return;
          }
          deleteTransaction
            .mutateAsync(transaction.id)
            .then(() => router.back())
            .catch(() => Alert.alert(t('errors.transaction.deleteFailed')));
        },
      },
    ]);
  };

  const busy = updateTransaction.isPending || deleteTransaction.isPending;

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()}>
          <Icon name="x" size={26} color={colors.primary} strokeWidth={2} />
        </Pressable>
        <Text variant="headlineMd">{t('transactionEdit.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
                  // kind değişince kategori seçimi sıfırlanır (liste kind'a göre filtreli).
                  setValue('categoryId', '', { shouldValidate: true });
                }}
              />
            )}
          />

          <Controller
            control={control}
            name="amount"
            render={({ field: { value, onChange } }) => (
              <AmountInput value={value} onChange={onChange} currency={watch('currency')} locale={locale} />
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
                    onAddPress={() => undefined}
                  />
                )}
              />
            )}
          </View>

          <View style={styles.rows}>
            <Controller
              control={control}
              name="date"
              render={({ field: { value, onChange } }) => (
                <DateRow value={value} onChange={onChange} locale={locale} />
              )}
            />
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
          </View>

          {/* Recurring rule'dan üretilen işlemler edit edilebilir ama kullanıcı bilgilendirilir:
              düzenleme yalnızca bu kaydı etkiler, kuralı/gelecek tekrarları değiştirmez. */}
          {transaction.recurringRuleId ? (
            <View style={[styles.infoBanner, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Icon name="repeat" size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
              <Text variant="labelSm" color="onSurfaceVariant" style={styles.infoText}>
                {t('transactionEdit.fromRecurring')}
              </Text>
            </View>
          ) : null}

          <Button
            label={t('common.save')}
            loading={isOnline && updateTransaction.isPending}
            disabled={!isValid || busy}
            onPress={handleSubmit(onSubmit)}
            style={styles.submit}
          />

          <Button
            label={t('transactionEdit.delete')}
            variant="secondary"
            loading={deleteTransaction.isPending}
            disabled={busy}
            onPress={onDelete}
          />

          {!isOnline ? (
            <ErrorText style={styles.offlineHint}>{t('common.offlineSavedSyncLater')}</ErrorText>
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
  rows: { gap: spacing.md },
  loading: { paddingVertical: spacing.stackMd, alignItems: 'center' },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
  },
  infoText: { flex: 1, lineHeight: 18 },
  submit: { marginTop: spacing.sm },
  offlineHint: { textAlign: 'center', marginTop: spacing.xs },
  notFound: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.stackMd,
  },
  notFoundText: { textAlign: 'center', lineHeight: 22 },
});
