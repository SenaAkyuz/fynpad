import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { getGoogleOAuthUrl, resendSignupOtp, signInWithEmail, signInWithGoogle } from '@/lib/auth';
import { loginSchema, type LoginForm } from '@/lib/validation';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { spacing } from '@/theme/tokens';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isOnline = useNetworkStore((s) => s.isOnline);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleOAuthUrl, setGoogleOAuthUrl] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let active = true;
    void getGoogleOAuthUrl().then((res) => {
      if (active && res.success) {
        setGoogleOAuthUrl(res.url);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const onSubmit = async (values: LoginForm) => {
    setFormError('');
    setLoading(true);
    const res = await signInWithEmail(values);
    if (!res.success) {
      // E-posta doğrulanmamışsa: yeni kod gönder + doğrulama ekranına yönlendir.
      if (res.errorKey === 'errors.auth.emailNotConfirmed') {
        await resendSignupOtp({ email: values.email });
        setLoading(false);
        router.replace({ pathname: '/(auth)/verify-email-otp', params: { email: values.email } });
        return;
      }
      setLoading(false);
      setFormError(t(res.errorKey));
      return;
    }
    setLoading(false);
    // success → root layout auth guard yönlendirir
  };

  const onGoogleSignIn = async () => {
    setFormError('');
    if (Platform.OS === 'web' && googleOAuthUrl) {
      window.location.href = googleOAuthUrl;
      return;
    }
    setGoogleLoading(true);
    const res = await signInWithGoogle();
    setGoogleLoading(false);
    // Kullanıcı tarayıcıyı kendisi kapattıysa (cancelled) hata gösterme — sessizce login'de kal.
    if (!res.success && !res.cancelled) {
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
            <Text variant="headlineLg" style={styles.brand}>
              {t('welcome.title')}
            </Text>
            <Text variant="headlineSm" style={styles.title}>
              {t('auth.login.title')}
            </Text>
            <Text variant="bodyMd" color="onSurfaceVariant" style={styles.subtitle}>
              {t('auth.login.subtitle')}
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
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label={t('auth.login.emailLabel')}
                  placeholder={t('auth.login.emailPlaceholder')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  error={errors.email?.message ? t(errors.email.message) : undefined}
                />
              )}
            />

            <View style={styles.field}>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label={t('auth.login.passwordLabel')}
                    placeholder={t('auth.login.passwordPlaceholder')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password"
                    textContentType="password"
                    error={errors.password?.message ? t(errors.password.message) : undefined}
                  />
                )}
              />
            </View>

            <Pressable
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.forgotWrap}
              hitSlop={8}
            >
              <Text variant="labelMd" color="primary">
                {t('auth.login.forgotPassword')}
              </Text>
            </Pressable>

            {!isOnline ? (
              <Text variant="labelSm" color="onSurfaceVariant" style={styles.offlineHint}>
                {t('auth.offlineLoginUnavailable')}
              </Text>
            ) : null}

            <Button
              label={t('auth.login.submit')}
              loading={loading}
              disabled={!isOnline || googleLoading}
              onPress={handleSubmit(onSubmit)}
              style={styles.submit}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text variant="labelSm" color="onSurfaceVariant">
                {t('auth.or')}
              </Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              label={t('auth.continueWithGoogle')}
              variant="secondary"
              href={Platform.OS === 'web' ? googleOAuthUrl : undefined}
              loading={googleLoading}
              disabled={!isOnline || loading}
              onPress={onGoogleSignIn}
              style={styles.googleButton}
            />
          </GlassCard>

          <View style={styles.footer}>
            <Text variant="bodyMd" color="onSurfaceVariant">
              {t('auth.login.noAccount')}{' '}
            </Text>
            <Pressable onPress={() => router.push('/(auth)/register')} hitSlop={8}>
              <Text variant="labelMd" color="primary">
                {t('auth.login.signUp')}
              </Text>
            </Pressable>
          </View>
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
    gap: spacing.xs,
  },
  brand: {
    textAlign: 'center',
  },
  title: {
    textAlign: 'center',
    marginTop: spacing.sm,
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
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: spacing.md,
  },
  submit: {
    marginTop: spacing.xl,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#cbc3d7',
  },
  googleButton: {
    marginTop: spacing.lg,
  },
  offlineHint: {
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
