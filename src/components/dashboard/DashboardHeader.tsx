import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useProfile } from '@/hooks/useProfile';
import { getNotificationPermission, requestAndScheduleReminders } from '@/lib/notifications';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { useTheme } from '@/theme/useTheme';

/**
 * Üst bar (design): sol avatar (initials), ortada FynPad wordmark, sağda bildirim zili.
 * Zil davranışı izin-tabanlı: izin YOKKEN bas → sistem izin dialog'u + zamanla; izin VARKEN
 * bas → Hatırlatmalar ekranı. Saat/detay kullanıcıya gösterilmez.
 */
export function DashboardHeader() {
  const { colors } = useTheme();
  const router = useRouter();
  const email = useAuthStore((s) => s.user?.email ?? '');
  const { data: profile } = useProfile();
  // profile.full_name varsa onu, yoksa email'in @ öncesini kullan (brief 8.7)
  const displayName = profile?.fullName?.trim() || email.split('@')[0] || 'F';
  const initial = (displayName.trim()[0] ?? 'F').toUpperCase();

  const userId = useAuthStore((s) => s.session?.user?.id);

  const onBellPress = () => {
    void (async () => {
      // İzin varsa doğrudan Hatırlatmalar ekranı; yoksa izin iste + (verilirse) zamanla.
      if (await getNotificationPermission()) {
        router.push('/reminders');
        return;
      }
      if (!userId) return;
      const granted = await requestAndScheduleReminders(userId);
      if (granted) {
        await useAppStore.getState().setDailyExpenseRemindersEnabled(true);
        useToastStore.getState().show('reminders.enabledToast', 'success');
      } else {
        useToastStore.getState().show('reminders.permissionDenied', 'info');
      }
    })();
  };

  return (
    <View style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
        <Text variant="labelMd" color="onPrimaryContainer">
          {initial}
        </Text>
      </View>

      <Text variant="headlineMd" style={styles.title}>
        FynPad
      </Text>

      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        style={styles.bell}
        onPress={onBellPress}
      >
        <Icon name="bell" size={24} color={colors.primary} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '800',
  },
  bell: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
