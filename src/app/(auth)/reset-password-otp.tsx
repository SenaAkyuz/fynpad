import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { sendPasswordResetEmail, verifyPasswordResetOtp } from '@/lib/auth';
import { resetPasswordOtpSchema, type ResetPasswordOtpForm } from '@/lib/validation';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { spacing } from '@/theme/tokens';

export default function ResetPasswordOtpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const isOnline = useNetworkStore((s) => s.isOnline);

  const [formError, setFormError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordOtpForm>({
    resolver: zodResolver(resetPasswordOtpSchema),
    defaultValues: { token: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: ResetPasswordOtpForm) => {
    setFormError('');
    setInfo('');
    setLoading(true);
    // verifyOtp → recovery session → updateUser tek adımda (lib/auth).
    const res = await verifyPasswordResetOtp({
      email: email ?? '',
      token: values.token,
      newPassword: values.password,
    });
    setLoading(false);
    if (res.success) {
      // verifyOtp ile recovery session açıldı → kullanıcı giriş yapmış sayılır.
      // Auth guard reset-password-otp'yi istisna tuttuğu için açıkça dashboard'a yönlendir.
      router.replace('/(tabs)/dashboard');
    } else {
      setFormError(t(res.errorKey));
    }
  };

  const handleResend = async () => {
    setFormError('');
    setInfo('');
    setResending(true);
    const res = await sendPasswordResetEmail({ email: email ?? '' });
    setResending(false);
    if (res.success) {
      setInfo(t('auth.resetPasswordOtp.otpResent'));
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
              {t('auth.resetPasswordOtp.title')}
            </Text>
            <Text variant="bodyMd" color="onSurfaceVariant" style={styles.subtitle}>
              {t('auth.resetPasswordOtp.subtitle', { email: email ?? '' })}
            </Text>
          </View>

          <GlassCard style={styles.card}>
            {formError ? (
              <View style={styles.banner}>
                <ErrorText>{formError}</ErrorText>
              </View>
            ) : null}
            {info ? (
              <View style={styles.banner}>
                <Text variant="bodyMd" color="primary" style={styles.centerText}>
                  {info}
                </Text>
              </View>
            ) : null}

            <Controller
              control={control}
              name="token"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label={t('auth.resetPasswordOtp.codeLabel')}
                  placeholder="000000"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="number-pad"
                  maxLength={10}
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  error={errors.token?.message ? t(errors.token.message) : undefined}
                />
              )}
            />

            <View style={styles.field}>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label={t('auth.resetPasswordOtp.newPasswordLabel')}
                    placeholder={t('auth.resetPasswordOtp.newPasswordPlaceholder')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    autoCapitalize="none"
                    error={errors.password?.message ? t(errors.password.message) : undefined}
                  />
                )}
              />
            </View>

            <View style={styles.field}>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label={t('auth.resetPasswordOtp.confirmPasswordLabel')}
                    placeholder={t('auth.resetPasswordOtp.confirmPasswordPlaceholder')}
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
              label={t('auth.resetPasswordOtp.submit')}
              loading={loading}
              disabled={!isOnline}
              onPress={handleSubmit(onSubmit)}
              style={styles.submit}
            />
          </GlassCard>

          <Pressable
            onPress={handleResend}
            style={styles.resendWrap}
            hitSlop={8}
            disabled={!isOnline || resending || loading}
          >
            <Text variant="labelMd" color="primary">
              {resending
                ? t('auth.resetPasswordOtp.resending')
                : t('auth.resetPasswordOtp.resend')}
            </Text>
          </Pressable>
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
  resendWrap: {
    alignSelf: 'center',
  },
});
