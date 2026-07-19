import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PreferencePicker, type PreferenceOption } from '@/components/settings/PreferencePicker';
import { ProfileCard } from '@/components/settings/ProfileCard';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingsToggle } from '@/components/settings/SettingsToggle';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { SyncStatusIndicator } from '@/components/ui/SyncStatusIndicator';
import { Text } from '@/components/ui/Text';
import { useCategories } from '@/hooks/useCategories';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { isPrivacyOptionsRequired, showAdPrivacyOptions } from '@/lib/adsConsent';
import { signOut } from '@/lib/auth';
import { authenticate, canUseBiometric } from '@/lib/biometric';
import { clearLocalSecurityForUser } from '@/lib/lockSecurity';
import { useAppStore, type Locale, type ThemeMode } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLockStore } from '@/stores/useLockStore';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Currency } from '@/types';

type PickerKind = 'language' | 'currency' | 'theme' | null;

/**
 * Ayarlar ekranı (Part 10). Profil + tercihler (dil/para birimi/tema) + güvenlik (kilit/biyometrik)
 * + veri (kategoriler/tekrarlayan/dışa aktar) + sürüm + çıkış. Tasarım: DESIGN.md token'larıyla
 * sistem-içi (HTML yok). Veri katmanı değişmez — sadece mevcut hook/mutation'lar.
 */
export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors, mode, setMode } = useTheme();
  const router = useRouter();

  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);

  const { data: profile } = useProfile();
  const { data: categories = [] } = useCategories();
  const updateProfile = useUpdateProfile();

  const session = useAuthStore((s) => s.session);
  // 'email' identity varsa hesabın zaten bir şifresi vardır → "Şifre Değiştir".
  // Yoksa (yalnızca Google OAuth) hesabın şifresi yok → "Şifre Oluştur".
  const hasPassword = session?.user?.identities?.some((i) => i.provider === 'email') ?? false;

  const [picker, setPicker] = useState<PickerKind>(null);

  const currency: Currency = profile?.defaultCurrency ?? 'TRY';
  const defaultsCount = categories.filter((c) => c.isDefault).length;
  const customCount = categories.length - defaultsCount;
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const languageOptions: PreferenceOption<Locale>[] = [
    { value: 'tr', label: t('settings.languageTr') },
    { value: 'en', label: t('settings.languageEn') },
  ];
  const currencyOptions: PreferenceOption<Currency>[] = [
    { value: 'TRY', label: t('settings.currencyTry') },
    { value: 'USD', label: t('settings.currencyUsd') },
    { value: 'EUR', label: t('settings.currencyEur') },
  ];
  const themeOptions: PreferenceOption<ThemeMode>[] = [
    { value: 'light', label: t('settings.themeLight') },
    { value: 'dark', label: t('settings.themeDark') },
  ];

  // "Reklam Tercihleri" satırı YALNIZCA UMP privacy options'ın gerekli olduğu bölgelerde (EU/UK)
  // gösterilir. Gerekli olmayan bölgede kullanıcı bir şey kaçırmaz — o bölgede tercih yok.
  const [showAdPreferencesRow, setShowAdPreferencesRow] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let mounted = true;
    void (async () => {
      const required = await isPrivacyOptionsRequired();
      if (mounted) setShowAdPreferencesRow(required);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const onAdPreferences = () => {
    void (async () => {
      const shown = await showAdPrivacyOptions();
      if (!shown) {
        Alert.alert(t('settings.adPreferencesUnavailable'));
      }
    })();
  };

  const onSignOut = () => {
    const confirmSignOut = () => {
      void (async () => {
        await signOut();
        router.replace('/(auth)/login');
      })();
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('settings.signOutConfirmTitle'))) {
        confirmSignOut();
      }
      return;
    }

    Alert.alert(t('settings.signOutConfirmTitle'), undefined, [
      { text: t('settings.signOutCancel'), style: 'cancel' },
      {
        text: t('settings.signOutConfirmAction'),
        style: 'destructive',
        onPress: confirmSignOut,
      },
    ]);
  };

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleBlock}>
          <Text variant="headlineMd" style={styles.title}>
            {t('settings.title')}
          </Text>
          <Text variant="bodyMd" color="onSurfaceVariant">
            {t('settings.subtitle')}
          </Text>
        </View>

        <ProfileCard
          name={profile?.fullName ?? ''}
          email={profile?.email ?? ''}
          onPress={() => router.push('/profile-edit')}
        />

        <SettingsSection title={t('settings.sections.preferences')}>
          <SettingsRow
            icon="globe"
            label={t('settings.language')}
            value={locale === 'tr' ? t('settings.languageTr') : t('settings.languageEn')}
            onPress={() => setPicker('language')}
          />
          <SettingsRow
            icon="dollar-sign"
            label={t('settings.currency')}
            value={currency}
            onPress={() => setPicker('currency')}
          />
          <SettingsRow
            icon="sun"
            label={t('settings.theme')}
            value={mode === 'dark' ? t('settings.themeDark') : t('settings.themeLight')}
            onPress={() => setPicker('theme')}
          />
        </SettingsSection>

        <SecuritySection />

        <SettingsSection title={t('settings.sections.data')}>
          <SettingsRow
            icon="tag"
            label={t('settings.categories')}
            value={t('settings.categoriesSubtitle', { defaults: defaultsCount, custom: customCount })}
            onPress={() => router.push('/categories')}
          />
          <SettingsRow
            icon="repeat"
            label={t('settings.recurringTransactions')}
            onPress={() => router.push('/recurring-rules')}
          />
          <SettingsRow
            icon="credit-card"
            label={t('settings.subscriptions')}
            onPress={() => router.push('/subscriptions')}
          />
          <SettingsRow
            icon="download"
            label={t('settings.exportData')}
            onPress={() => router.push('/export')}
          />
        </SettingsSection>

        <SyncStatusIndicator />

        <SettingsSection title={t('settings.sections.about')}>
          <SettingsRow
            icon="shield"
            label={t('settings.privacyPolicy')}
            onPress={() => router.push('/privacy')}
          />
          <SettingsRow
            icon="file-text"
            label={t('settings.termsOfService')}
            onPress={() => router.push('/terms')}
          />
          {Platform.OS !== 'web' && showAdPreferencesRow && (
            <SettingsRow
              icon="settings"
              label={t('settings.adPreferences')}
              onPress={onAdPreferences}
            />
          )}
          <SettingsRow icon="info" label={t('settings.version')} value={version} showChevron={false} />
        </SettingsSection>

        <SettingsSection title={t('settings.sections.account')}>
          <SettingsRow
            icon="key"
            label={hasPassword ? t('settings.changePassword') : t('settings.setPassword')}
            onPress={() =>
              router.push({
                pathname: '/set-password',
                params: { mode: hasPassword ? 'change' : 'create' },
              })
            }
          />
        </SettingsSection>

        <Pressable
          accessibilityRole="button"
          onPress={onSignOut}
          style={({ pressed }) => [
            styles.signOut,
            { backgroundColor: colors.tertiaryContainer },
            pressed && styles.pressed,
          ]}
        >
          <Icon name="log-out" size={20} color={colors.onTertiaryContainer} strokeWidth={2} />
          <Text variant="labelMd" color="onTertiaryContainer">
            {t('settings.signOut')}
          </Text>
        </Pressable>

        <SettingsSection title={t('settings.dangerZone')}>
          <SettingsRow
            icon="trash-2"
            label={t('settings.deleteAccount')}
            danger
            onPress={() => router.push('/delete-account')}
          />
        </SettingsSection>
      </ScrollView>

      <PreferencePicker
        visible={picker === 'language'}
        title={t('settings.language')}
        options={languageOptions}
        selectedValue={locale}
        onSelect={(v) => setLocale(v)}
        onClose={() => setPicker(null)}
      />
      <PreferencePicker
        visible={picker === 'currency'}
        title={t('settings.currency')}
        options={currencyOptions}
        selectedValue={currency}
        onSelect={(v) => updateProfile.mutate({ defaultCurrency: v })}
        onClose={() => setPicker(null)}
      />
      <PreferencePicker
        visible={picker === 'theme'}
        title={t('settings.theme')}
        options={themeOptions}
        selectedValue={mode}
        onSelect={(v) => setMode(v)}
        onClose={() => setPicker(null)}
      />
    </Screen>
  );
}

/** Güvenlik bölümü: App Lock + Biyometrik toggle'ları (Part 3 mantığı dashboard'dan taşındı). */
function SecuritySection() {
  const { t } = useTranslation();
  const router = useRouter();

  const lockEnabled = useLockStore((s) => s.lockEnabled);
  const biometricEnabled = useLockStore((s) => s.biometricEnabled);
  const setLockEnabled = useLockStore((s) => s.setLockEnabled);
  const setBiometricEnabled = useLockStore((s) => s.setBiometricEnabled);

  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    void canUseBiometric().then((ok) => {
      if (active) {
        setBioAvailable(ok);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const onToggleLock = (next: boolean) => {
    if (next) {
      router.push('/pin-setup');
      return;
    }
    Alert.alert(t('settings.lockDisableConfirmTitle'), t('settings.lockDisableConfirmMessage'), [
      { text: t('settings.lockDisableCancel'), style: 'cancel' },
      {
        text: t('settings.lockDisableConfirmAction'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              // Kilidi kapatmak = tüm yerel güvenlik kayıtlarını silmek. Tek helper
              // kullanılır ki üç akış (buradaki, PIN'i unuttum, hesap silme) ayrışmasın.
              const userId = useAuthStore.getState().session?.user?.id ?? null;
              if (userId) {
                await clearLocalSecurityForUser(userId);
              }
              await setLockEnabled(false);
              await setBiometricEnabled(false);
            } catch {
              // Kalıcılaştırılamadıysa UI'da "kapalı" GÖSTERME — kilit hâlâ aktif olabilir.
              Alert.alert(t('settings.lockSaveFailedTitle'), t('settings.lockSaveFailedMessage'));
            }
          })();
        },
      },
    ]);
  };

  const onToggleBiometric = (next: boolean) => {
    void (async () => {
      if (!next) {
        try {
          await setBiometricEnabled(false);
        } catch {
          Alert.alert(t('settings.lockSaveFailedTitle'), t('settings.lockSaveFailedMessage'));
        }
        return;
      }
      const result = await authenticate(t('lock.biometricPrompt'), t('settings.lockDisableCancel'));
      if (!result.success) {
        // Kullanıcı iptali sessiz; gerçek başarısızlıkta bilgilendir.
        if (result.failure === 'unavailable') {
          Alert.alert(t('settings.biometricUnavailableTitle'), t('settings.biometricUnavailable'));
        } else if (result.failure === 'lockout') {
          Alert.alert(t('settings.biometricUnavailableTitle'), t('settings.biometricLockedOut'));
        }
        return;
      }
      try {
        await setBiometricEnabled(true);
      } catch {
        Alert.alert(t('settings.lockSaveFailedTitle'), t('settings.lockSaveFailedMessage'));
      }
    })();
  };

  const biometricHint = useMemo(() => {
    // Class 2 (weak) biyometri kabul edildiği için "yeterince güvenli değil" durumu YOK;
    // toggle yalnızca gerçekten biyometri kurulu değilse kapalı kalır.
    if (!bioAvailable) return t('settings.biometricUnavailable');
    if (!lockEnabled) return t('settings.biometricRequiresLock');
    return undefined;
  }, [bioAvailable, lockEnabled, t]);

  return (
    <SettingsSection title={t('settings.sections.security')}>
      <SettingsToggle
        icon="lock"
        label={t('settings.appLock')}
        value={lockEnabled}
        onValueChange={onToggleLock}
      />
      <SettingsToggle
        icon="shield"
        label={t('settings.biometric')}
        value={biometricEnabled}
        onValueChange={onToggleBiometric}
        disabled={!lockEnabled || !bioAvailable}
        hint={biometricHint}
      />
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.lg,
    paddingBottom: 120,
    gap: spacing.stackMd,
  },
  titleBlock: {
    gap: spacing.xs,
  },
  title: {
    fontWeight: '800',
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radii.md,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
