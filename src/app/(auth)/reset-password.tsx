import { zodResolver } from '@hookform/resolvers/zod';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { updatePassword } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { resetPasswordSchema, type ResetPasswordForm } from '@/lib/validation';
import { spacing } from '@/theme/tokens';

type Stage = 'loading' | 'ready' | 'invalid';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const url = Linking.useURL();

  const [stage, setStage] = useState<Stage>('loading');
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

  // Deep link URL'inden recovery session'ı kur (PKCE `code` veya implicit fragment token).
  useEffect(() => {
    let cancelled = false;

    async function establishSession() {
      // Zaten bir session varsa (link uygulamayı açtıysa) doğrudan hazır say.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (!cancelled) setStage('ready');
        return;
      }
      if (!url) {
        return; // URL henüz gelmedi; effect url değişince tekrar çalışır
      }
      try {
        const parsed = Linking.parse(url);
        const qp = parsed.queryParams ?? {};
        const code = typeof qp.code === 'string' ? qp.code : undefined;

        const fragment = url.split('#')[1] ?? '';
        const frag = new URLSearchParams(fragment);
        const accessToken =
          frag.get('access_token') ??
          (typeof qp.access_token === 'string' ? qp.access_token : null);
        const refreshToken =
          frag.get('refresh_token') ??
          (typeof qp.refresh_token === 'string' ? qp.refresh_token : null);

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else {
          throw new Error('no recovery token in url');
        }
        if (!cancelled) setStage('ready');
      } catch {
        if (!cancelled) setStage('invalid');
      }
    }

    void establishSession();
    return () => {
      cancelled = true;
    };
  }, [url]);

  const onSubmit = async (values: ResetPasswordForm) => {
    setFormError('');
    setLoading(true);
    const res = await updatePassword({ newPassword: values.password });
    setLoading(false);
    if (res.success) {
      router.replace('/(tabs)/dashboard');
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
          {stage === 'loading' ? (
            <View style={styles.center}>
              <Spinner size="large" />
            </View>
          ) : stage === 'invalid' ? (
            <GlassCard style={styles.card}>
              <Text variant="headlineSm" style={styles.centerText}>
                {t('auth.resetPassword.title')}
              </Text>
              <Text variant="bodyMd" color="error" style={styles.invalidMsg}>
                {t('auth.resetPassword.invalidLink')}
              </Text>
              <Button
                label={t('auth.resetPassword.requestNew')}
                onPress={() => router.replace('/(auth)/forgot-password')}
                style={styles.submit}
              />
            </GlassCard>
          ) : (
            <>
              <View style={styles.header}>
                <Text variant="headlineSm" style={styles.centerText}>
                  {t('auth.resetPassword.title')}
                </Text>
                <Text variant="bodyMd" color="onSurfaceVariant" style={styles.subtitle}>
                  {t('auth.resetPassword.subtitle')}
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
                      label={t('auth.resetPassword.newPasswordLabel')}
                      placeholder={t('auth.resetPassword.newPasswordPlaceholder')}
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
                        label={t('auth.resetPassword.confirmPasswordLabel')}
                        placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
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

                <Button
                  label={t('auth.resetPassword.submit')}
                  loading={loading}
                  onPress={handleSubmit(onSubmit)}
                  style={styles.submit}
                />
              </GlassCard>
            </>
          )}
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
  center: {
    alignItems: 'center',
    justifyContent: 'center',
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
  invalidMsg: {
    textAlign: 'center',
    marginTop: spacing.md,
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
  submit: {
    marginTop: spacing.xl,
  },
});
