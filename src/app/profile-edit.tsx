import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/ErrorText';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * Profil düzenleme modal'ı. full_name editable (dashboard greeting + ProfileCard kullanır).
 * Email read-only (brief: e-posta değişikliği yok), avatar initial read-only (upload yok).
 */
export default function ProfileEditScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const isOnline = useNetworkStore((s) => s.isOnline);

  const [name, setName] = useState(profile?.fullName ?? '');
  const [error, setError] = useState('');

  const email = profile?.email ?? '';
  const initial = (name.trim()[0] ?? email.trim()[0] ?? 'F').toUpperCase();

  const onSave = async () => {
    setError('');

    // Çevrimdışı: 'online' networkMode ile mutation paused olur (resolve etmez) → await etme,
    // fire-and-forget ile kuyruğa düşür, modal hemen kapansın.
    if (!isOnline) {
      updateProfile.mutate({ fullName: name.trim() });
      router.back();
      return;
    }

    try {
      await updateProfile.mutateAsync({ fullName: name.trim() });
      router.back();
    } catch {
      setError(t('errors.profile.updateFailed'));
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()}>
          <Icon name="x" size={26} color={colors.primary} strokeWidth={2} />
        </Pressable>
        <Text variant="headlineMd">{t('profileEdit.title')}</Text>
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
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
              <Text variant="headlineMd" color="onPrimaryContainer">
                {initial}
              </Text>
            </View>
          </View>

          <TextInput
            label={t('profileEdit.emailLabel')}
            value={email}
            editable={false}
          />
          <Text variant="labelSm" color="onSurfaceVariant" style={styles.helper}>
            {t('profileEdit.emailHelper')}
          </Text>

          <TextInput
            label={t('profileEdit.nameLabel')}
            placeholder={t('profileEdit.namePlaceholder')}
            value={name}
            onChangeText={setName}
            maxLength={60}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={onSave}
          />

          <ErrorText style={styles.error}>{error}</ErrorText>

          <Button
            label={t('profileEdit.save')}
            loading={updateProfile.isPending}
            onPress={onSave}
            style={styles.submit}
          />
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
  avatarWrap: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helper: {
    marginTop: -spacing.sm,
  },
  error: {
    textAlign: 'center',
  },
  submit: {
    marginTop: spacing.sm,
  },
});
