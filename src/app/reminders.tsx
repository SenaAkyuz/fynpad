import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingsToggle } from '@/components/settings/SettingsToggle';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import {
  cancelDailyExpenseReminders,
  scheduleDailyExpenseReminders,
} from '@/lib/notifications';
import { useAppStore } from '@/stores/useAppStore';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * Hatırlatmalar ekranı (dashboard'daki zil ikonundan, izin verilmişken açılır). Kullanıcıya
 * SAAT/ayrım gösterilmez — sadece günde iki hatırlatma gönderildiği bilgisi + kapat/aç kontrolü.
 * Zamanlama sabit (10:00 + 20:00, bkz. lib/notifications DAILY_REMINDERS) ve gizlidir.
 */
export default function RemindersScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const enabled = useAppStore((s) => s.dailyExpenseRemindersEnabled);
  const setEnabled = useAppStore((s) => s.setDailyExpenseRemindersEnabled);

  const onToggle = (next: boolean) => {
    void (async () => {
      if (next) {
        const ok = await scheduleDailyExpenseReminders();
        setEnabled(ok);
      } else {
        setEnabled(false);
        await cancelDailyExpenseReminders();
      }
    })();
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()}>
          <Icon name="chevron-left" size={26} color={colors.primary} strokeWidth={2} />
        </Pressable>
        <Text variant="headlineMd">{t('reminders.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.iconBadge, { backgroundColor: colors.primaryContainer }]}>
          <Icon name="bell" size={28} color={colors.onPrimaryContainer} strokeWidth={2} />
        </View>

        <Text variant="bodyLg" color="onSurfaceVariant" style={styles.intro}>
          {t('reminders.intro')}
        </Text>

        <SettingsSection>
          <SettingsToggle
            icon="bell"
            label={t('reminders.toggleLabel')}
            value={enabled}
            onValueChange={onToggle}
            hint={t('reminders.toggleHint')}
          />
        </SettingsSection>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    paddingTop: spacing.stackMd,
    paddingBottom: spacing.stackLg,
    gap: spacing.stackMd,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  intro: {
    textAlign: 'center',
  },
});
