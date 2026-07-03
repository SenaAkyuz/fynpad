import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { completeOAuthCallback } from '@/lib/auth';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { useTheme } from '@/theme/useTheme';

/**
 * OAuth callback ekranı. İki yoldan tetiklenebilir:
 *  - Web: signInWithGoogle full-page redirect yapar → Google buraya ?code=... ile döner (session YOK,
 *    bu ekran code'u exchange eder).
 *  - Native: signInWithGoogle içindeki openAuthSessionAsync redirect'i zaten yakalayıp exchange EDER
 *    (session VAR). Aynı deep link expo-router'ı buraya da yönlendirir → burada code'u TEKRAR exchange
 *    etmek "code already used" hatasına ve yanlış "something went wrong" toast'ına yol açardı.
 *
 * Bu yüzden önce session'a bakılır: zaten kuruluysa sessizce dashboard'a gidilir (çift exchange yok).
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const theme = useTheme();
  const setSession = useAuthStore((s) => s.setSession);
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();

  const code = typeof params.code === 'string' ? params.code : undefined;
  const providerError =
    (typeof params.error_description === 'string' ? params.error_description : undefined) ??
    (typeof params.error === 'string' ? params.error : undefined);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const { supabase } = await import('@/lib/supabase');

      // 1) Session zaten kuruluysa (native openAuthSessionAsync exchange'i yaptı) → sessizce dashboard.
      //    Aynı code'u tekrar exchange etmeye çalışıp hata göstermeyi önler.
      const existing =
        useAuthStore.getState().session ?? (await supabase.auth.getSession()).data.session;
      if (existing) {
        if (!mounted) return;
        setSession(existing);
        router.replace('/(tabs)/dashboard');
        return;
      }

      // 2) Provider hatası (kullanıcı izni reddetti vb.) → login'e dön + bilgilendir.
      if (providerError) {
        if (!mounted) return;
        useToastStore.getState().show('errors.auth.unknown', 'error');
        router.replace('/(auth)/login');
        return;
      }

      // 3) Session de code de yoksa: ekran spurious tetiklendi → sessizce login'e dön (hata gösterme).
      if (!code) {
        if (!mounted) return;
        router.replace('/(auth)/login');
        return;
      }

      // 4) Gerçek callback: session yok ama code var (web full-page redirect) → exchange et.
      const res = await completeOAuthCallback(`fynpad://auth/callback?code=${encodeURIComponent(code)}`);
      if (!mounted) return;
      if (res.success) {
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
  }, [router, setSession, code, providerError]);

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
