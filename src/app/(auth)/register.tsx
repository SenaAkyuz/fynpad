import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
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
import { Checkbox } from '@/components/ui/Checkbox';
import { ErrorText } from '@/components/ui/ErrorText';
import { GlassCard } from '@/components/ui/GlassCard';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { signUpWithEmail } from '@/lib/auth';
import { registerSchema, type RegisterForm } from '@/lib/validation';
import { useAppStore } from '@/stores/useAppStore';
import { spacing } from '@/theme/tokens';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = useAppStore((s) => s.locale);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: RegisterForm) => {
    setFormError('');
    setLoading(true);
    const res = await signUpWithEmail({
      email: values.email,
      password: values.password,
      locale,
      defaultCurrency: 'TRY',
    });
    setLoading(false);
    if (!res.success) {
      setFormError(t(res.errorKey));
    }
    // success → confirm-email kapalı, Supabase auto-login → root guard tabs'a yönlendirir
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
              {t('auth.register.title')}
            </Text>
            <Text variant="bodyMd" color="onSurfaceVariant" style={styles.subtitle}>
              {t('auth.register.subtitle')}
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
                  label={t('auth.register.emailLabel')}
                  placeholder={t('auth.register.emailPlaceholder')}
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
                    label={t('auth.register.passwordLabel')}
                    placeholder={t('auth.register.passwordPlaceholder')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password-new"
                    textContentType="newPassword"
                    error={errors.password?.message ? t(errors.password.message) : undefined}
                  />
                )}
              />
            </View>

            <Text variant="labelSm" color="onSurfaceVariant" style={styles.hint}>
              {t('auth.register.passwordHint')}
            </Text>

            <View style={styles.field}>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label={t('auth.register.confirmPasswordLabel')}
                    placeholder={t('auth.register.confirmPasswordPlaceholder')}
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

            <View style={styles.consent}>
              <Checkbox
                value={accepted}
                onValueChange={setAccepted}
                accessibilityLabel={t('signUp.consentTerms')}
              />
              <Text variant="labelSm" color="onSurfaceVariant" style={styles.consentText}>
                {t('signUp.consentPrefix')}
                <Text
                  variant="labelSm"
                  color="primary"
                  style={styles.link}
                  onPress={() => router.push('/terms')}
                >
                  {t('signUp.consentTerms')}
                </Text>
                {t('signUp.consentAnd')}
                <Text
                  variant="labelSm"
                  color="primary"
                  style={styles.link}
                  onPress={() => router.push('/privacy')}
                >
                  {t('signUp.consentPrivacy')}
                </Text>
                {t('signUp.consentSuffix')}
              </Text>
            </View>

            <Button
              label={t('auth.register.submit')}
              loading={loading}
              disabled={!accepted}
              onPress={handleSubmit(onSubmit)}
              style={styles.submit}
            />
          </GlassCard>

          <View style={styles.footer}>
            <Text variant="bodyMd" color="onSurfaceVariant">
              {t('auth.register.haveAccount')}{' '}
            </Text>
            <Pressable onPress={() => router.push('/(auth)/login')} hitSlop={8}>
              <Text variant="labelMd" color="primary">
                {t('auth.register.signIn')}
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
  hint: {
    marginTop: spacing.sm,
  },
  consent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  consentText: {
    flex: 1,
    lineHeight: 18,
  },
  link: {
    textDecorationLine: 'underline',
  },
  submit: {
    marginTop: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
