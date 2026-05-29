import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/quick-add/AmountInput';
import { CurrencyRow } from '@/components/quick-add/CurrencyRow';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useAppStore } from '@/stores/useAppStore';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Currency } from '@/types';

/**
 * Aylık Birikim Hedefi kurulum/düzenleme modal'ı (Part 14 ek). Tutar + para birimi → profile'a yazar.
 * "Hedefi Kaldır" ile null'a çeker. Offline: fire-and-forget (paused mutation), modal hemen kapanır.
 */
export default function MonthlySavingsTargetScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const locale = useAppStore((s) => s.locale);
  const isOnline = useNetworkStore((s) => s.isOnline);

  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const [amount, setAmount] = useState<number>(profile?.monthlySavingsTarget ?? 0);
  const [currency, setCurrency] = useState<Currency>(
    profile?.monthlySavingsTargetCurrency ?? profile?.defaultCurrency ?? 'TRY'
  );

  const hasExisting = !!profile?.monthlySavingsTarget;
  const busy = updateProfile.isPending;

  const onSave = async () => {
    if (!amount || amount <= 0) {
      Alert.alert(t('goals.errors.amountPositive'));
      return;
    }
    const patch = { monthlySavingsTarget: amount, monthlySavingsTargetCurrency: currency };
    if (!isOnline) {
      updateProfile.mutate(patch);
      router.back();
      return;
    }
    try {
      await updateProfile.mutateAsync(patch);
      router.back();
    } catch {
      Alert.alert(t('goals.errors.saveFailed'));
    }
  };

  const onRemove = async () => {
    const patch = { monthlySavingsTarget: null, monthlySavingsTargetCurrency: null };
    if (!isOnline) {
      updateProfile.mutate(patch);
      router.back();
      return;
    }
    try {
      await updateProfile.mutateAsync(patch);
      router.back();
    } catch {
      Alert.alert(t('goals.errors.saveFailed'));
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()}>
          <Icon name="x" size={26} color={colors.primary} strokeWidth={2} />
        </Pressable>
        <Text variant="headlineMd">{t('goals.monthlySavings.editTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text variant="bodyMd" color="onSurfaceVariant">
            {t('goals.monthlySavings.editHint')}
          </Text>

          <View style={styles.section}>
            <Text variant="labelSm" color="onSurfaceVariant" style={styles.sectionLabel}>
              {t('goals.monthlySavings.amountLabel')}
            </Text>
            <AmountInput value={amount} onChange={setAmount} currency={currency} locale={locale} />
          </View>

          <CurrencyRow value={currency} onChange={setCurrency} />

          <Button
            label={t('common.save')}
            loading={busy}
            disabled={busy || !amount || amount <= 0}
            onPress={onSave}
            style={styles.submit}
          />

          {hasExisting ? (
            <Button
              label={t('goals.monthlySavings.remove')}
              variant="secondary"
              loading={busy}
              disabled={busy}
              onPress={onRemove}
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
  submit: { marginTop: spacing.sm },
});
