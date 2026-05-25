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
import { ErrorText } from '@/components/ui/ErrorText';
import { GlassCard } from '@/components/ui/GlassCard';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { signInWithEmail } from '@/lib/auth';
import { loginSchema, type LoginForm } from '@/lib/validation';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { spacing } from '@/theme/tokens';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isOnline = useNetworkStore((s) => s.isOnline);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginForm) => {
    setFormError('');
    setLoading(true);
    const res = await signInWithEmail(values);
    setLoading(false);
    if (!res.success) {
      setFormError(t(res.errorKey));
    }
    // success → root layout auth guard yönlendirir
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
              disabled={!isOnline}
              onPress={handleSubmit(onSubmit)}
              style={styles.submit}
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
