// crypto polyfill (getRandomValues + subtle.digest) — Supabase PKCE s256 için. En üstte kalmalı.
import '@/lib/cryptoPolyfill';

// LogBox suppress — diğer TÜM import'lardan ÖNCE (özellikle expo-notifications'tan önce)
// çalışmalı; detay için bkz. lib/logbox.ts. Bu import en üstte kalmalı.
import '@/lib/logbox';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import mobileAds from 'react-native-google-mobile-ads';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/locales/i18n';
import { LockScreen } from '@/components/screens/LockScreen';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Toast } from '@/components/ui/Toast';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { transactionsKey } from '@/hooks/useTransactions';
import { requestConsent } from '@/lib/adsConsent';
import { fontMap } from '@/lib/fonts';
import { startNetworkMonitoring, stopNetworkMonitoring } from '@/lib/networkStatus';
import { rescheduleAll, syncDailyExpenseReminders } from '@/lib/notifications';
import { initInterstitial } from '@/lib/interstitialAd';
import { registerMutationDefaults } from '@/lib/offlineMutations';
import { applyOrientationPolicy } from '@/lib/orientation';
import { asyncStoragePersister, queryClient } from '@/lib/queryClient';
import { consumeIntentionalSignOut } from '@/lib/auth';
import { processRecurringRules } from '@/lib/recurring';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLockStore } from '@/stores/useLockStore';
import { useToastStore } from '@/stores/useToastStore';
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

  // Bildirim tıklaması: içerikteki `data.type`'a göre yönlendir. Eskiden KOŞULSUZ
  // /subscriptions'a gidiyordu → "harcamalarını ekle" hatırlatması da abonelik ekranını açıyordu.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const type = response.notification.request.content.data?.type;
      if (type === 'subscription_renewal') {
        router.push('/subscriptions');
      } else if (type === 'daily_reminder') {
        // Hatırlatmanın amacı işlem ekletmek → doğrudan hızlı ekleme ekranı.
        router.push('/quick-add');
      } else {
        // data.type taşımayan ESKİ zamanlanmış bildirimler (sürüm öncesi) → güvenli varsayılan.
        router.push('/(tabs)/dashboard');
      }
    });
    return () => sub.remove();
  }, [router]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontMap);
  const hydrated = useAppStore((s) => s.hydrated);
  const dailyExpenseRemindersEnabled = useAppStore((s) => s.dailyExpenseRemindersEnabled);
  const remindersUserId = useAppStore((s) => s.remindersUserId);
  const hydrateDailyReminders = useAppStore((s) => s.hydrateDailyReminders);

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

  // Kilit ayarları KULLANICIYA ÖZEL: auth çözüldükten sonra oturumdaki kullanıcının kilidini
  // oku. Oturum yoksa/hesap değişince yeniden hydrate → başka hesabın PIN'i istenmez.
  const sessionUserId = session?.user?.id ?? null;
  useEffect(() => {
    if (!initialized) return;
    void hydrateLock(sessionUserId);
  }, [initialized, sessionUserId, hydrateLock]);

  // Hatırlatma tercihi de KULLANICIYA ÖZEL → hesap değişince yeniden oku (çıkışta sıfırlanır).
  useEffect(() => {
    if (!initialized) return;
    void hydrateDailyReminders(sessionUserId);
  }, [initialized, sessionUserId, hydrateDailyReminders]);

  // Arka plana düşünce kilitle (kilit açık + oturum varsa).
  useAppLifecycle();

  // Ağ izleme: NetInfo → görsel store + React Query onlineManager (otomatik resume/sync).
  useEffect(() => {
    startNetworkMonitoring();
    return () => stopNetworkMonitoring();
  }, []);

  // Yön politikası: telefonda dikey kilit, tablette serbest (bkz. lib/orientation.ts).
  useEffect(() => {
    void applyOrientationPolicy();
  }, []);

  // AdMob: önce EU/UK consent (UMP), sonra SDK init + ilk interstitial. Web'de no-op (native yok).
  // Native modül eksik/başlatma patlarsa uygulamanın açılışını engellememeli (try/catch).
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    void (async () => {
      try {
        await requestConsent(); // EU/UK'de consent formu; Türkiye'de no-op
        await mobileAds().initialize();
        initInterstitial();
      } catch (e) {
        if (__DEV__) console.warn('[FynPad] AdMob init skipped:', e);
      }
    })();
  }, []);

  // Zamanlamaları tercihle senkronla. YALNIZCA tercih aktif kullanıcı için hydrate edildiyse
  // çalışır (remindersUserId === sessionUserId) — aksi halde önceki hesabın değeriyle yanlış
  // schedule/cancel yapılırdı. Oturum yokken hiç dokunma: başka hesabın zamanlamaları silinmesin.
  useEffect(() => {
    if (!hydrated || !sessionUserId || remindersUserId !== sessionUserId) return;
    void syncDailyExpenseReminders(dailyExpenseRemindersEnabled, sessionUserId);
  }, [dailyExpenseRemindersEnabled, hydrated, sessionUserId, remindersUserId]);

  // Supabase session'ı yükle + değişiklikleri dinle.
  useEffect(() => {
    let mounted = true;
    // Auth bootstrap DAYANIKLILIĞI: burada fırlatılan herhangi bir hata (deep link okuma,
    // OAuth callback, session storage bozulması) setInitialized()'a ulaşılmasını engellerse
    // splash SONSUZA KADAR açık kalır ve uygulama tamamen kullanılamaz olur. Bu yüzden her
    // adım ayrı korunur ve setInitialized finally'de ÇAĞRILIR.
    void (async () => {
      // OAuth callback BURADA İŞLENMEZ. Tek sahip prensibi: code exchange'i signInWithGoogle
      // (openAuthSessionAsync sonucu) veya cold-start'ta `auth/callback` ekranı yapar. Burada
      // üçüncü bir kez denemek yarışa ve yanlış "something went wrong" toast'ına yol açıyordu.
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session);
      } catch (e) {
        // Session storage okunamıyor (bozuk kayıt/SecureStore hatası) → GÜVENLİ TARAF:
        // oturumsuz başla. Kullanıcı tekrar giriş yapar; yanlış oturumla açılmaktan iyidir.
        if (__DEV__) console.warn('[FynPad/auth] getSession failed, starting signed out:', e);
        if (mounted) {
          setSession(null);
        }
      } finally {
        // Unmount olduysa store'a dokunma; olmadıysa splash MUTLAKA kalksın.
        if (mounted) {
          setInitialized();
        }
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      const hadSession = useAuthStore.getState().session != null;
      setSession(nextSession);
      // Refresh token geçersiz/expired olduğunda Supabase otomatik SIGNED_OUT yayar.
      // Kullanıcı kendisi çıkış yapmadıysa (kasıtlı bayrağı yok) bu istemsiz bir oturum
      // sonlanmasıdır → kullanıcıyı bilgilendir. Guard zaten login'e yönlendirir.
      if (event === 'SIGNED_OUT' && hadSession && !consumeIntentionalSignOut()) {
        useToastStore.getState().show('errors.auth.sessionExpired', 'info');
      }
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
    // reset-password-otp: verifyOtp recovery session açar ama kullanıcı yeni şifresini
    // belirleyene (updateUser) kadar ekranda kalmalı — guard onu dashboard'a atmasın.
    // reset-password (eski deep link) artık forgot-password'a redirect ediyor.
    const onResetPassword =
      inAuthGroup &&
      (segments[1] === 'reset-password' || segments[1] === 'reset-password-otp');
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
              <ErrorBoundary>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="auth/callback" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="pin-setup" />
                <Stack.Screen name="recurring-rules" />
                <Stack.Screen name="transactions" />
                <Stack.Screen name="reminders" />
                <Stack.Screen name="categories" />
                <Stack.Screen name="subscriptions" />
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
                  name="set-password"
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
                <Stack.Screen
                  name="goal-edit"
                  options={{
                    presentation: 'modal',
                    headerShown: false,
                    animation: 'slide_from_bottom',
                  }}
                />
              </Stack>
              </ErrorBoundary>
              {session ? <NotificationsBootstrap /> : null}
              {showLock ? <LockScreen /> : null}
              <Toast />
            </View>
          </ThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
