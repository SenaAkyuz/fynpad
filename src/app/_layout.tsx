// LogBox suppress — diğer TÜM import'lardan ÖNCE (özellikle expo-notifications'tan önce)
// çalışmalı; detay için bkz. lib/logbox.ts. Bu import en üstte kalmalı.
import '@/lib/logbox';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/locales/i18n';
import { LockScreen } from '@/components/screens/LockScreen';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { transactionsKey } from '@/hooks/useTransactions';
import { fontMap } from '@/lib/fonts';
import { startNetworkMonitoring, stopNetworkMonitoring } from '@/lib/networkStatus';
import { rescheduleAll } from '@/lib/notifications';
import { registerMutationDefaults } from '@/lib/offlineMutations';
import { asyncStoragePersister, queryClient } from '@/lib/queryClient';
import { processRecurringRules } from '@/lib/recurring';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLockStore } from '@/stores/useLockStore';
import { ThemeProvider } from '@/theme/ThemeProvider';

void SplashScreen.preventAutoHideAsync();

// Offline mutation default'larını kaydet (restore edilen paused mutation'lar restart sonrası
// resume edilebilsin — fn serialize edilemediği için merkezi olarak yeniden bağlanır).
registerMutationDefaults(queryClient);

// Foreground'da bildirim geldiğinde banner + listede göster (Part 7).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Oturum varken: abonelikleri yükleyip yenilenme hatırlatmalarını yeniden schedule eder
 * (idempotent) ve bildirime tıklanınca Subscriptions tab'ına yönlendirir. QueryClientProvider
 * içinde render edildiği için react-query hook'larını kullanabilir.
 */
function NotificationsBootstrap() {
  const router = useRouter();
  const { data: subscriptions } = useSubscriptions();

  useEffect(() => {
    if (subscriptions) {
      void rescheduleAll(subscriptions);
    }
  }, [subscriptions]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/(tabs)/subscriptions');
    });
    return () => sub.remove();
  }, [router]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontMap);
  const hydrated = useAppStore((s) => s.hydrated);

  const initialized = useAuthStore((s) => s.initialized);
  const session = useAuthStore((s) => s.session);
  const setSession = useAuthStore((s) => s.setSession);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  const lockInitialized = useLockStore((s) => s.initialized);
  const lockEnabled = useLockStore((s) => s.lockEnabled);
  const isLocked = useLockStore((s) => s.isLocked);
  const hydrateLock = useLockStore((s) => s.hydrate);

  const router = useRouter();
  const segments = useSegments();

  // Fontlar + persisted tercihler + ilk auth + lock hydrate tamamlanana kadar splash'i tut.
  const ready =
    (fontsLoaded || !!fontError) && hydrated && initialized && lockInitialized;

  // SecureStore'dan kilit durumunu oku (lockEnabled true ise isLocked=true ile başlar).
  useEffect(() => {
    void hydrateLock();
  }, [hydrateLock]);

  // Arka plana düşünce kilitle (kilit açık + oturum varsa).
  useAppLifecycle();

  // Ağ izleme: NetInfo → görsel store + React Query onlineManager (otomatik resume/sync).
  useEffect(() => {
    startNetworkMonitoring();
    return () => stopNetworkMonitoring();
  }, []);

  // Supabase session'ı yükle + değişiklikleri dinle.
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setInitialized();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [setSession, setInitialized]);

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  // Giriş sonrası ilk yüklemede tekrarlayan işlemleri tetikle (cron + foreground'a ek
  // belt-and-suspenders catch-up). RPC idempotent — çift üretim olmaz. Sessiz başarısızlık.
  const userId = session?.user?.id;
  useEffect(() => {
    if (!ready || !userId) return;
    processRecurringRules()
      .then((created) => {
        if (created > 0) {
          void queryClient.invalidateQueries({ queryKey: transactionsKey });
        }
      })
      .catch(() => {
        /* sessiz */
      });
  }, [ready, userId]);

  // Auth guard: oturum durumuna göre yönlendir.
  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    // reset-password: recovery session açılır ama kullanıcı yeni şifreyi belirleyene
    // kadar ekranda kalmalı — guard onu dashboard'a atmasın.
    const onResetPassword = inAuthGroup && segments[1] === 'reset-password';
    if (session && inAuthGroup && !onResetPassword) {
      router.replace('/(tabs)/dashboard');
    } else if (!session && inTabsGroup) {
      router.replace('/');
    }
  }, [ready, session, segments, router]);

  if (!ready) {
    return null;
  }

  // Kilit ekranı Stack'in ÜSTÜNDE overlay olarak render edilir; alttaki ekranlar
  // unmount olmaz (state korunur, açılış hızlı olur).
  const showLock = !!session && lockEnabled && isLocked;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: asyncStoragePersister,
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 gün — daha eski cache temizlenir
            buster: 'v1', // tip/şema değişiminde bump et → eski cache geçersiz
            dehydrateOptions: {
              shouldDehydrateQuery: () => true,
            },
          }}
          onSuccess={() => {
            // Cache restore edildikten sonra restore edilen paused mutation'ları resume et.
            void queryClient.resumePausedMutations();
          }}
        >
          <ThemeProvider>
            <View style={{ flex: 1 }}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="pin-setup" />
                <Stack.Screen name="recurring-rules" />
                <Stack.Screen name="transactions" />
                <Stack.Screen name="categories" />
                <Stack.Screen name="privacy" />
                <Stack.Screen name="terms" />
                <Stack.Screen
                  name="delete-account"
                  options={{
                    presentation: 'modal',
                    headerShown: false,
                    animation: 'slide_from_bottom',
                  }}
                />
                <Stack.Screen
                  name="profile-edit"
                  options={{
                    presentation: 'modal',
                    headerShown: false,
                    animation: 'slide_from_bottom',
                  }}
                />
                <Stack.Screen
                  name="export"
                  options={{
                    presentation: 'modal',
                    headerShown: false,
                    animation: 'slide_from_bottom',
                  }}
                />
                <Stack.Screen
                  name="quick-add"
                  options={{
                    presentation: 'modal',
                    headerShown: false,
                    animation: 'slide_from_bottom',
                  }}
                />
                <Stack.Screen
                  name="transaction-edit"
                  options={{
                    presentation: 'modal',
                    headerShown: false,
                    animation: 'slide_from_bottom',
                  }}
                />
                <Stack.Screen
                  name="subscription-edit"
                  options={{
                    presentation: 'modal',
                    headerShown: false,
                    animation: 'slide_from_bottom',
                  }}
                />
                <Stack.Screen
                  name="budget-edit"
                  options={{
                    presentation: 'modal',
                    headerShown: false,
                    animation: 'slide_from_bottom',
                  }}
                />
              </Stack>
              {session ? <NotificationsBootstrap /> : null}
              {showLock ? <LockScreen /> : null}
            </View>
          </ThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
