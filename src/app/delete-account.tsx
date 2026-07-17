import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ErrorText } from '@/components/ui/ErrorText';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { deleteAccount } from '@/lib/account';
import { intlLocale } from '@/lib/format';
import { useAppStore } from '@/stores/useAppStore';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** Postgres `raise exception 'AUTH_REQUIRED'` mesajı (oturum süresi dolmuş). */
function isAuthError(error: unknown): boolean {
  return error instanceof Error && /AUTH_REQUIRED/i.test(error.message);
}

/**
 * Hesap silme onay modal'ı (Part 11 — App Store / Play Store compliance).
 * Type-DELETE pattern: kullanıcı onay kelimesini yazmadan buton kilitli.
 * Silme GERİ ALINAMAZ — soft delete / grace period yok (store kuralları hard delete bekler).
 */
export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const keyword = t('deleteAccount.confirmKeyword');
  const points = t('deleteAccount.warningPoints', { returnObjects: true }) as unknown as string[];
  const isOnline = useNetworkStore((s) => s.isOnline);
  const locale = useAppStore((s) => s.locale);

  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Onay kelimesi tr'de "SİL". Argümansız toLocaleUpperCase() cihazın locale'ini kullanır:
  // cihaz Türkçe değilse "sil" → "SIL" olur ve "SİL" ile eşleşmez, kullanıcı hesabını silemez.
  // Karşılaştırma, cihazın değil uygulamanın diline göre yapılmalı.
  const upper = (value: string) => value.toLocaleUpperCase(intlLocale(locale));
  const matches = upper(confirmText.trim()) === upper(keyword);
  // Hesap silme offline yapılamaz: auth + hard delete RPC ister, queue'ya alınamaz/alınmamalı.
  const canSubmit = matches && !submitting && isOnline;

  const onDelete = async () => {
    if (!canSubmit) {
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await deleteAccount();
      router.replace('/');
    } catch (e) {
      setSubmitting(false);
      setError(isAuthError(e) ? t('deleteAccount.errorAuth') : t('deleteAccount.errorGeneric'));
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()}>
          <Icon name="x" size={26} color={colors.primary} strokeWidth={2} />
        </Pressable>
        <Text variant="headlineMd">{t('deleteAccount.title')}</Text>
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
          <View style={[styles.warning, { backgroundColor: colors.tertiaryContainer }]}>
            <View style={styles.warningHead}>
              <Icon name="alert-triangle" size={22} color={colors.onTertiaryContainer} strokeWidth={2} />
              <Text variant="headlineSm" color="onTertiaryContainer" style={styles.warningTitle}>
                {t('deleteAccount.warningTitle')}
              </Text>
            </View>
            <View style={styles.points}>
              {points.map((point, i) => (
                <View key={i} style={styles.point}>
                  <Text variant="bodyMd" color="onTertiaryContainer">
                    {'•'}
                  </Text>
                  <Text variant="bodyMd" color="onTertiaryContainer" style={styles.pointText}>
                    {point}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <TextInput
            label={t('deleteAccount.confirmPrompt', { keyword })}
            placeholder={t('deleteAccount.confirmPlaceholder')}
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={onDelete}
          />

          <ErrorText style={styles.error}>{error}</ErrorText>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit, busy: submitting }}
            disabled={!canSubmit}
            onPress={onDelete}
            style={({ pressed }) => [
              styles.deleteButton,
              { backgroundColor: colors.tertiary },
              pressed && styles.pressed,
              !canSubmit && styles.disabled,
            ]}
          >
            {submitting ? (
              <Spinner color={colors.onTertiary} />
            ) : (
              <Text variant="labelMd" color="onTertiary" style={styles.deleteLabel}>
                {t('deleteAccount.submit')}
              </Text>
            )}
          </Pressable>

          {!isOnline ? (
            <Text variant="labelSm" color="onSurfaceVariant" style={styles.offlineHint}>
              {t('deleteAccount.offlineHint')}
            </Text>
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
  headerSpacer: {
    width: 26,
  },
  content: {
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.lg,
    paddingBottom: spacing.stackLg,
    gap: spacing.lg,
  },
  warning: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  warningHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  warningTitle: {
    flex: 1,
  },
  points: {
    gap: spacing.sm,
  },
  point: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pointText: {
    flex: 1,
  },
  error: {
    textAlign: 'center',
  },
  offlineHint: {
    textAlign: 'center',
  },
  deleteButton: {
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  deleteLabel: {
    fontSize: 16,
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
