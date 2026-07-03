import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { AD_UNIT_IDS } from '@/lib/ads';

/**
 * Anchored adaptive banner. Dashboard ve Analiz ekranlarının altında, tab bar'ın üstünde.
 * Web'de (react-native-google-mobile-ads web'i desteklemez) ve yükleme başarısız olursa render etmez.
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
  const [failed, setFailed] = useState(false);

  if (Platform.OS === 'web' || failed) {
    return null;
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={AD_UNIT_IDS.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
});
