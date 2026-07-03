import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { completeOAuthCallback } from '@/lib/auth';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { useTheme } from '@/theme/useTheme';

/**
 * OAuth callback ekranı. Platforma göre farklı çalışır:
 *  - Web: signInWithGoogle full-page redirect yapar → Google buraya ?code=... ile döner ve session
 *    YOK → burada code exchange edilir.
 *  - Native: signInWithGoogle içindeki openAuthSessionAsync redirect'i ZATEN yakalayıp exchange EDER.
 *    Aynı deep link expo-router'ı buraya da yönlendirir (spurious echo). Burada code'u TEKRAR exchange
 *    etmek PKCE code_verifier'ı tüketilmiş olduğu için "pkce_code_verifier_not_found" hatasına ve
 *    yanlış toast'a yol açar → native'de HİÇ exchange etme, sadece session'ın gelmesini bekle.
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

  // Session gelir gelmez (native'de openAuthSessionAsync, web'de exchange sonrası) dashboard'a git.
  useEffect(() => {
    if (session) {
      router.replace('/(tabs)/dashboard');
    }
  }, [session, router]);

  useEffect(() => {
    let mounted = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    void (async () => {
      // Provider hatası (kullanıcı izni reddetti vb.) → login'e dön + bilgilendir.
      if (providerError) {
        if (!mounted) return;
        useToastStore.getState().show('errors.auth.unknown', 'error');
        router.replace('/(auth)/login');
        return;
      }

      const { supabase } = await import('@/lib/supabase');
      const existing =
        useAuthStore.getState().session ?? (await supabase.auth.getSession()).data.session;
      if (existing) {
        if (!mounted) return;
        setSession(existing);
        router.replace('/(tabs)/dashboard');
        return;
      }

      // WEB: full-page redirect → session yok, code'u burada exchange et.
      if (Platform.OS === 'web' && code) {
        const res = await completeOAuthCallback(`fynpad://auth/callback?code=${encodeURIComponent(code)}`);
        if (!mounted) return;
        if (res.success) {
          const { data } = await supabase.auth.getSession();
          setSession(data.session); // session gelince yukarıdaki effect dashboard'a alır
        } else {
          useToastStore.getState().show(res.errorKey, 'error');
          router.replace('/(auth)/login');
        }
        return;
      }

      // NATIVE: exchange YAPMA — openAuthSessionAsync (signInWithGoogle) hallediyor; session'ın
      // set edilmesini bekle (yukarıdaki effect yönlendirir). Makul süre gelmezse login'e dön.
      timeout = setTimeout(() => {
        if (mounted && !useAuthStore.getState().session) {
          router.replace('/(auth)/login');
        }
      }, 5000);
    })();

    return () => {
      mounted = false;
      if (timeout) clearTimeout(timeout);
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
