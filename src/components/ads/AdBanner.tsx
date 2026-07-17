import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { AD_UNIT_IDS } from '@/lib/ads';

/** Ardışık kaç hatadan sonra banner tamamen gizlenir. */
const MAX_RETRIES = 3;
/** İlk yeniden deneme gecikmesi; her denemede ikiye katlanır (4s → 8s → 16s). */
const RETRY_BASE_MS = 4000;

/**
 * Anchored adaptive banner. Dashboard ve Analiz ekranlarının altında, tab bar'ın üstünde.
 * Web'de (react-native-google-mobile-ads web'i desteklemez) render etmez.
 * Reklam SDK'sı native tarafta patlarsa (ör. modül eksik) ErrorBoundary sessizce yutar —
 * uygulamanın geri kalanı etkilenmez.
 */
export function AdBanner() {
  return (
    <ErrorBoundary fallback={null}>
      <AdBannerInner />
    </ErrorBoundary>
  );
}

function AdBannerInner() {
  // BannerAd'in load() metodu yok — yeni istek ancak remount ile tetiklenir. Bu yüzden key
  // olarak yalnızca ARTAN bir sayaç kullanılır; sıfırlanırsa remount döngüsü oluşur.
  const [retryKey, setRetryKey] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);
  // Ardışık hata sayısı — başarılı yüklemede sıfırlanır. State değil ref: render tetiklememeli.
  const failCount = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  if (Platform.OS === 'web' || gaveUp) {
    return null;
  }

  // Tek bir geçici hata (ör. ERROR_CODE_NETWORK_ERROR) banner'ı oturum boyunca kapatmamalı:
  // backoff ile yeniden dene, ancak ısrarlı hatada (izin/yapılandırma) vazgeç ki sonsuz
  // istek döngüsüne girilmesin.
  const onFailedToLoad = () => {
    failCount.current += 1;
    if (failCount.current > MAX_RETRIES) {
      setGaveUp(true);
      return;
    }
    timer.current = setTimeout(
      () => setRetryKey((key) => key + 1),
      RETRY_BASE_MS * 2 ** (failCount.current - 1)
    );
  };

  return (
    <View style={styles.container}>
      <BannerAd
        key={retryKey}
        unitId={AD_UNIT_IDS.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdLoaded={() => {
          failCount.current = 0;
        }}
        onAdFailedToLoad={onFailedToLoad}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
});
