import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { completeOAuthCallback } from '@/lib/auth';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { useTheme } from '@/theme/useTheme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const theme = useTheme();
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const callbackUrl = window.location.href;
      const res = await completeOAuthCallback(callbackUrl);
      if (!mounted) return;

      if (res.success) {
        const { supabase } = await import('@/lib/supabase');
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        router.replace('/(tabs)/dashboard');
      } else {
        useToastStore.getState().show(res.errorKey, 'error');
        router.replace('/(auth)/login');
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router, setSession]);

  return (
    <Screen>
      <View style={styles.container}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text variant="bodyMd" color="onSurfaceVariant" style={styles.text}>
          Google oturumu tamamlanıyor...
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  text: {
    textAlign: 'center',
  },
});
