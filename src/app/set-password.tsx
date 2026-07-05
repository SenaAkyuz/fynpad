import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/ErrorText';
import { GlassCard } from '@/components/ui/GlassCard';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { updatePassword } from '@/lib/auth';
import { resetPasswordSchema, type ResetPasswordForm } from '@/lib/validation';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useToastStore } from '@/stores/useToastStore';
import { spacing } from '@/theme/tokens';

/**
 * Ayarlar → Hesap'tan açılır. Google ile giren (şifresiz) kullanıcı hesabına şifre ekler
 * ('create' modu), mevcut şifreli kullanıcı ise şifresini değiştirir ('change' modu).
 * Her iki durumda da oturum zaten açık olduğu için tek adımda `updateUser({ password })`.
 */
export default function SetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isChange = mode === 'change';
  const isOnline = useNetworkStore((s) => s.isOnline);

  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: ResetPasswordForm) => {
    setFormError('');
    setLoading(true);
    const res = await updatePassword({ newPassword: values.password });
    setLoading(false);
    if (res.success) {
      useToastStore
        .getState()
        .show(isChange ? 'setPassword.changeSuccess' : 'setPassword.createSuccess', 'success');
      router.back();
    } else {
      setFormError(t(res.errorKey));
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text variant="headlineSm" style={styles.centerText}>
              {t(isChange ? 'setPassword.changeTitle' : 'setPassword.createTitle')}
            </Text>
            <Text variant="bodyMd" color="onSurfaceVariant" style={styles.subtitle}>
              {t(isChange ? 'setPassword.changeSubtitle' : 'setPassword.createSubtitle')}
            </Text>
          </View>

          <GlassCard style={styles.card}>
            {formError ? (
              <View style={styles.banner}>
                <ErrorText>{formError}</ErrorText>
              </View>
            ) : null}

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label={t('setPassword.passwordLabel')}
                  placeholder={t('setPassword.passwordPlaceholder')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  autoCapitalize="none"
                  error={errors.password?.message ? t(errors.password.message) : undefined}
                />
              )}
            />

            <View style={styles.field}>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label={t('setPassword.confirmPasswordLabel')}
                    placeholder={t('setPassword.confirmPasswordPlaceholder')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    autoCapitalize="none"
                    error={
                      errors.confirmPassword?.message
                        ? t(errors.confirmPassword.message)
                        : undefined
                    }
                  />
                )}
              />
            </View>

            {!isOnline ? (
              <Text variant="labelSm" color="onSurfaceVariant" style={styles.offlineHint}>
                {t('auth.offlineLoginUnavailable')}
              </Text>
            ) : null}

            <Button
              label={t('setPassword.submit')}
              loading={loading}
              disabled={!isOnline}
              onPress={handleSubmit(onSubmit)}
              style={styles.submit}
            />
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: spacing.stackLg,
    gap: spacing.stackMd,
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  centerText: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  card: {
    width: '100%',
  },
  banner: {
    marginBottom: spacing.md,
  },
  field: {
    marginTop: spacing.lg,
  },
  offlineHint: {
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  submit: {
    marginTop: spacing.xl,
  },
});
