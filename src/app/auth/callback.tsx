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
 * OAuth callback ekranı. `fynpad://auth/callback?code=...` deep link'i buraya düşer.
 *
 * Native'de redirect bazen openAuthSessionAsync tarafından yakalanır (signInWithGoogle exchange
 * eder), bazen de doğrudan bu ekrana deep link olarak gelir → o durumda TEK handler burasıdır ve
 * code'u burada exchange etmemiz gerekir. Çift exchange yarışı `completeOAuthCallback` içinde
 * idempotent + fail-sonrası session re-check ile tolere edilir (yanlış "something went wrong" yok).
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const theme = useTheme();
  const setSession = useAuthStore((s) => s.setSession);
  const session = useAuthStore((s) => s.session);
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();

  const code = typeof params.code === 'string' ? params.code : undefined;
  const providerError =
    (typeof params.error_description === 'string' ? params.error_description : undefined) ??
    (typeof params.error === 'string' ? params.error : undefined);

  // Session gelir gelmez (bu ekran ya da signInWithGoogle exchange etti) dashboard'a git.
  useEffect(() => {
    if (session) {
      router.replace('/(tabs)/dashboard');
    }
  }, [session, router]);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const { supabase } = await import('@/lib/supabase');

      // Provider hatası (kullanıcı izni reddetti vb.) → login'e dön + bilgilendir.
      // AMA ÖNCE session kontrol: paralel handler (signInWithGoogle) bu sırada oturumu açmış
      // olabilir → o durumda hata GÖSTERME, session effect dashboard'a alsın.
      if (providerError) {
        const onError =
          useAuthStore.getState().session ?? (await supabase.auth.getSession()).data.session;
        if (!mounted) return;
        if (onError) {
          setSession(onError);
          return;
        }
        useToastStore.getState().show('errors.auth.unknown', 'error');
        router.replace('/(auth)/login');
        return;
      }

      const existing =
        useAuthStore.getState().session ?? (await supabase.auth.getSession()).data.session;
      if (existing) {
        if (!mounted) return;
        setSession(existing);
        return; // session effect dashboard'a alır
      }

      // Code yoksa: ekran spurious tetiklendi → sessizce login'e dön (hata gösterme).
      if (!code) {
        if (!mounted) return;
        router.replace('/(auth)/login');
        return;
      }

      // Code var, session yok → exchange et. completeOAuthCallback yarış-toleranslı: signInWithGoogle
      // aynı anda exchange etmiş olsa bile başarı döner (session varsa).
      const res = await completeOAuthCallback(`fynpad://auth/callback?code=${encodeURIComponent(code)}`);
      if (!mounted) return;
      if (res.success) {
        const { data } = await supabase.auth.getSession();
        setSession(data.session); // session effect dashboard'a alır
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
