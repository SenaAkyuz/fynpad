import { zodResolver } from '@hookform/resolvers/zod';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/quick-add/AmountInput';
import { CategoryEditModal } from '@/components/quick-add/CategoryEditModal';
import { CategoryPicker } from '@/components/quick-add/CategoryPicker';
import { CurrencyChip } from '@/components/quick-add/CurrencyChip';
import { DateRow } from '@/components/quick-add/DateRow';
import { KindToggle } from '@/components/quick-add/KindToggle';
import { NoteInput } from '@/components/quick-add/NoteInput';
import { RecurringConfig, defaultRecurringRule } from '@/components/quick-add/RecurringConfig';
import { RecurringToggle } from '@/components/quick-add/RecurringToggle';
import { PreferencePicker, type PreferenceOption } from '@/components/settings/PreferencePicker';
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
import { formatAbsoluteDate, fromISODate, toISODate } from '@/lib/format';
import { countOccurrencesUpTo, nextOccurrenceDate } from '@/lib/recurring';
import { maybeShowInterstitial } from '@/lib/interstitialAd';
import { quickAddSchema, type QuickAddForm } from '@/lib/validation';
import { useAppStore } from '@/stores/useAppStore';
import { useNetworkStore } from '@/stores/useNetworkStore';
import type { Currency } from '@/types';
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
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [formError, setFormError] = useState('');
  // Çevrimdışıyken mutation PAUSED kalır; `isPending` true olsa bile butonun `loading`
  // prop'u `isOnline` ile kapatıldığı için buton kilitlenmiyordu → çift dokunma iki ayrı
  // onSubmit çalıştırıyordu. Bu bayrak ağ durumundan BAĞIMSIZ olarak ikinci gönderimi keser.
  const [submitting, setSubmitting] = useState(false);

  /**
   * Recurring oluşturmanın idempotency anahtarı (RPC'deki
   * `recurring_rules(user_id, client_request_id)` partial unique index'iyle eşleşir).
   *
   * Gönderim NİYETİNE bağlıdır, çağrıya değil: aynı kayıt için ikinci bir deneme (çift
   * dokunma, kullanıcı tetikli retry) AYNI anahtarı kullanır → DB ikinci rule'u yaratmaz.
   * Başarıdan sonra sıfırlanır, böylece sonraki YENİ kayıt taze bir anahtar alır.
   * (React Query'nin kendi ağ retry'ı zaten aynı `variables`'ı tekrar kullanır.)
   */
  const recurringRequestId = useRef<string | null>(null);


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

  // Ayarlar'daki para birimi seçenekleriyle aynı etiketler (tek kaynak: i18n).
  const currencyOptions: PreferenceOption<Currency>[] = [
    { value: 'TRY', label: t('settings.currencyTry') },
    { value: 'USD', label: t('settings.currencyUsd') },
    { value: 'EUR', label: t('settings.currencyEur') },
  ];

  /**
   * Başlangıç GELECEKTE mi? Bu, hangi kaydetme yolunun kullanılacağını belirler.
   *
   * RPC (`create_recurring_rule_with_initial_transaction`) initial transaction'ı KOŞULSUZ
   * olarak `p_initial_transaction_date`'e yazar — start_date ile karşılaştırma YAPMAZ. Bu
   * yüzden "bugün 1 Temmuz, başlangıç 3 Temmuz" durumunda RPC bugüne kayıt atardı. Gelecek
   * başlangıçta düz insert kullanılır; ilk işlemi scheduler başlangıç tarihinde üretir.
   */
  const todayISODate = toISODate(new Date());
  // Başlangıç TAM BUGÜN mü? Yalnızca bu durumda bugüne bir "ilk ödeme" işlemi yazılır
  // (kira: "bugün ödedim, her ayın 1'inde tekrarlasın" — kural bugün ateşlemese bile).
  // Geçmiş/gelecek başlangıçta bugüne kayıt YAZILMAZ; occurrence'lar catch-up/scheduler'dan gelir.
  const startIsToday = !!recurringRule && recurringRule.startDate === todayISODate;
  const isPastStart = !!recurringRule && recurringRule.startDate < todayISODate;

  /**
   * Kaydetmeden önce ne olacağını gösterir:
   *  - Geçmiş başlangıç → "Geçmiş tarihli başlangıç: N işlem oluşturulacak (X'ten itibaren)".
   *    N, catch-up'ın gerçekte üreteceği occurrence sayısıdır (DB penceresiyle aynı sınır).
   *  - Bugün/gelecek başlangıç → "İlk kayıt: X · Sonraki tekrar: Y".
   * Tarihler scheduler'ın gerçek occurrence'larıyla birebir (nextOccurrenceDate).
   */
  const scheduleSummary = useMemo(() => {
    if (!recurringRule) return '';
    const shape = {
      frequency: recurringRule.frequency,
      dayOfWeek: recurringRule.dayOfWeek ?? null,
      dayOfMonth: recurringRule.dayOfMonth ?? null,
      monthOfYear: recurringRule.monthOfYear ?? null,
      startDate: recurringRule.startDate,
      endDate: recurringRule.endDate ?? null,
    };

    if (isPastStart) {
      const count = countOccurrencesUpTo(shape, new Date());
      return t('recurring.pastStartSummary', {
        count,
        from: formatAbsoluteDate(recurringRule.startDate, locale),
      });
    }

    // İlk kayıt: bugün başlıyorsa bugün (initial ödeme); gelecekse ilk occurrence.
    let firstISO: string | null = todayISODate;
    if (!startIsToday) {
      const dayBeforeStart = fromISODate(recurringRule.startDate);
      dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
      firstISO = nextOccurrenceDate(shape, dayBeforeStart);
    }
    if (!firstISO) return '';

    const first = formatAbsoluteDate(firstISO, locale);
    const next = nextOccurrenceDate(shape, fromISODate(firstISO));
    return next
      ? t('recurring.scheduleSummary', { first, next: formatAbsoluteDate(next, locale) })
      : t('recurring.scheduleSummaryNoNext', { first });
  }, [recurringRule, startIsToday, isPastStart, todayISODate, locale, t]);

  const onSubmit = async (values: QuickAddForm) => {
    // Çift dokunma koruması: offline'da buton `loading` ile kilitlenmediği için burada da
    // kesilmeli. Recurring tarafında idempotency anahtarı ikinci kaydı DB'de engeller;
    // bu guard düz işlemlerde de duplicate'i önler.
    if (submitting) return;
    setSubmitting(true);
    setFormError('');
    const note = values.note?.trim() ? values.note.trim() : null;
    const isRecurring = !!(values.recurring && values.recurringRule);

    // Tek yol: RPC (`create_recurring_rule_with_initial_transaction`) — kural + (koşullu)
    // ilk işlem atomik oluşur, ardından RPC catch-up'ı (process_recurring_rules) çağırır.
    // initialTransactionDate YALNIZCA başlangıç bugünse dolu: bugüne bir "ilk ödeme" yazılır
    // (kira senaryosu). Geçmiş/gelecek başlangıçta null → bugüne kayıt YAZILMAZ; occurrence'lar
    // yalnızca kuralın gerçek tetiklenme günlerinde (catch-up/scheduler) üretilir.
    // YALNIZCA recurring dalında kullanılır; düz işlemde recurringRule null olduğundan
    // `.startDate` okuması TypeError atardı → isRecurring ile kısa devre yaptırılır.
    const initialDate =
      isRecurring && values.recurringRule!.startDate === todayISODate ? todayISODate : null;

    const runRecurring = () =>
      // Abonelik oluşturma artık burada DEĞİL — "Yeni Abonelik Oluştur" butonu subscription-edit'e gider.
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
        clientRequestId: (recurringRequestId.current ??= Crypto.randomUUID()),
        initialTransactionDate: initialDate,
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
      // Kuyruğa alındı → bu gönderim tamamlandı sayılır; sonraki kayıt taze anahtar alsın.
      recurringRequestId.current = null;
      router.back();
      return;
    }

    try {
      await (isRecurring ? runRecurring() : runTransaction());
      recurringRequestId.current = null;
      router.back();
      // Reklam yalnızca düz işlem eklemede (recurring kural değil) tetiklenir; frequency
      // cap (her 3 işlem + min 90 sn) interstitialAd servisinde kontrol edilir. Web'de no-op.
      if (!isRecurring) {
        void maybeShowInterstitial();
      }
    } catch {
      // Anahtar BİLEREK sıfırlanmaz: kullanıcı aynı kaydı yeniden denerse aynı idempotency
      // anahtarıyla gider ve DB'de ikinci bir rule oluşmaz.
      setFormError(
        values.recurring ? t('errors.recurring.createFailed') : t('errors.transaction.createFailed')
      );
      setSubmitting(false);
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

          {/* Kompakt para birimi seçici — tutarın hemen altında. Tam genişlikteki
              3 butonluk satırın yerine geçer; varsayılan profildeki defaultCurrency. */}
          <CurrencyChip
            value={watch('currency')}
            label={t('quickAdd.currency')}
            onPress={() => setShowCurrencyPicker(true)}
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
                    onSubscriptionPress={() => {
                      // "Abonelikler" kategorisi → Quick Add'i kapat, subscription-edit'i aç.
                      // İki modal arası geçiş: router.replace modal→modal'da tutarsız → dismiss + push.
                      router.dismiss();
                      router.push('/subscription-edit');
                    }}
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
              <>
                <RecurringConfig
                  value={recurringRule}
                  onChange={(next) => setValue('recurringRule', next, { shouldValidate: true })}
                  locale={locale}
                />
                {/* Kullanıcının asıl sorusunu cevaplar: ilk kayıt ne zaman, sonraki ne zaman.
                    Tekrar ayarlarının hemen altında kalır. */}
                <Text variant="labelSm" color="onSurfaceVariant" style={styles.scheduleSummary}>
                  {scheduleSummary}
                </Text>
              </>
            ) : null}
          </View>

          <ErrorText style={styles.error}>{formError}</ErrorText>

          <Button
            label={t('quickAdd.submit')}
            loading={isOnline && (createTransaction.isPending || createRecurringRule.isPending)}
            disabled={!isValid || submitting}
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

      {/* Para birimi seçimi: Ayarlar'daki dil/tema seçicisiyle AYNI alt-sheet bileşeni. */}
      <PreferencePicker
        visible={showCurrencyPicker}
        title={t('quickAdd.currency')}
        options={currencyOptions}
        selectedValue={watch('currency')}
        onSelect={(next) => setValue('currency', next, { shouldValidate: true })}
        onClose={() => setShowCurrencyPicker(false)}
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
  scheduleSummary: {
    paddingHorizontal: spacing.lg,
  },
  submit: {
    marginTop: spacing.sm,
  },
  offlineHint: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
