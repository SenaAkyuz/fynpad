import { zodResolver } from '@hookform/resolvers/zod';
import * as Linking from 'expo-linking';
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
import { sendPasswordResetEmail } from '@/lib/auth';
import { forgotPasswordSchema, type ForgotPasswordForm } from '@/lib/validation';
import { spacing } from '@/theme/tokens';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordForm) => {
    setFormError('');
    setLoading(true);
    const res = await sendPasswordResetEmail({
      email: values.email,
      redirectUrl: Linking.createURL('reset-password'),
    });
    setLoading(false);
    if (res.success) {
      setSentTo(values.email);
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
          {sentTo ? (
            <GlassCard style={styles.card}>
              <Text variant="headlineSm" style={styles.centerText}>
                {t('auth.forgotPassword.successTitle')}
              </Text>
              <Text variant="bodyMd" color="onSurfaceVariant" style={styles.successMsg}>
                {t('auth.forgotPassword.successMessage', { email: sentTo })}
              </Text>
              <Button
                label={t('auth.forgotPassword.backToLogin')}
                variant="secondary"
                onPress={() => router.replace('/(auth)/login')}
                style={styles.submit}
              />
            </GlassCard>
          ) : (
            <>
              <View style={styles.header}>
                <Text variant="headlineSm" style={styles.centerText}>
                  {t('auth.forgotPassword.title')}
                </Text>
                <Text variant="bodyMd" color="onSurfaceVariant" style={styles.subtitle}>
                  {t('auth.forgotPassword.subtitle')}
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
                      label={t('auth.forgotPassword.emailLabel')}
                      placeholder={t('auth.forgotPassword.emailPlaceholder')}
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

                <Button
                  label={t('auth.forgotPassword.submit')}
                  loading={loading}
                  onPress={handleSubmit(onSubmit)}
                  style={styles.submit}
                />
              </GlassCard>

              <Pressable
                onPress={() => router.replace('/(auth)/login')}
                style={styles.backWrap}
                hitSlop={8}
              >
                <Text variant="labelMd" color="primary">
                  {t('auth.forgotPassword.backToLogin')}
                </Text>
              </Pressable>
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
  successMsg: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
  card: {
    width: '100%',
  },
  banner: {
    marginBottom: spacing.md,
  },
  submit: {
    marginTop: spacing.xl,
  },
  backWrap: {
    alignSelf: 'center',
  },
});
