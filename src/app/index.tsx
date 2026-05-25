import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAuthStore } from '@/stores/useAuthStore';
import { spacing } from '@/theme/tokens';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);

  // Oturum açıksa Welcome'ı hiç gösterme, doğrudan dashboard'a.
  if (session) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  return (
    <Screen center style={styles.screen}>
      <View style={styles.cardWrapper}>
        <GlassCard glow style={styles.card}>
          <Text variant="headlineXlMobile" style={styles.title}>
            {t('welcome.title')}
          </Text>
          <Text variant="bodyMd" color="onSurfaceVariant" style={styles.subtitle}>
            {t('welcome.subtitle')}
          </Text>

          <View style={styles.actions}>
            <Button label={t('welcome.signIn')} onPress={() => router.push('/(auth)/login')} />
            <Button
              label={t('welcome.createAccount')}
              variant="secondary"
              onPress={() => router.push('/(auth)/register')}
            />
          </View>
        </GlassCard>

        {/* logo placeholder (görsel asset Part 1'de yok) */}
        <Text variant="labelSm" color="onSurfaceVariant" style={styles.logo}>
          FynPad
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: spacing.stackLg,
  },
  cardWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
  actions: {
    marginTop: spacing.stackLg,
    gap: spacing.md,
  },
  logo: {
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
