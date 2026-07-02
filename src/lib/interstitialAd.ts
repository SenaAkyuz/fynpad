import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';

import {
  AD_UNIT_IDS,
  INTERSTITIAL_MIN_INTERVAL_MS,
  INTERSTITIAL_TRANSACTION_THRESHOLD,
} from './ads';

const COUNT_KEY = 'interstitial_tx_count';
const LAST_SHOWN_KEY = 'interstitial_last_shown';

const isWeb = Platform.OS === 'web';

let interstitial: InterstitialAd | null = null;
let isLoaded = false;

/** Yeni bir interstitial oluşturur, LOADED/CLOSED/ERROR listener'larını bağlar ve yüklemeyi başlatır. */
function loadAd(): void {
  if (isWeb) {
    return;
  }
  isLoaded = false;
  const ad = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);
  interstitial = ad;

  ad.addAdEventListener(AdEventType.LOADED, () => {
    isLoaded = true;
  });
  ad.addAdEventListener(AdEventType.ERROR, () => {
    isLoaded = false;
  });
  // Reklam kapandığında sıradaki için taze bir instance yükle; eski instance + listener'ları GC olur.
  ad.addAdEventListener(AdEventType.CLOSED, () => {
    loadAd();
  });

  ad.load();
}

/** App başlangıcında bir kere çağrılır (_layout.tsx). İlk reklamı önceden yükler. */
export function initInterstitial(): void {
  if (isWeb) {
    return;
  }
  loadAd();
}

/**
 * Başarılı bir işlem eklemesinden sonra çağrılır. İki koşul da sağlanırsa gösterir:
 *  - Son gösterimden bu yana >= INTERSTITIAL_TRANSACTION_THRESHOLD işlem eklendi
 *  - Son gösterimden bu yana >= INTERSTITIAL_MIN_INTERVAL_MS geçti
 * Reklam henüz yüklenmediyse sadece sayacı artırır. Web'de no-op.
 */
export async function maybeShowInterstitial(): Promise<void> {
  if (isWeb) {
    return;
  }

  const countStr = await AsyncStorage.getItem(COUNT_KEY);
  const count = (countStr ? parseInt(countStr, 10) : 0) + 1;

  const lastShownStr = await AsyncStorage.getItem(LAST_SHOWN_KEY);
  const lastShown = lastShownStr ? parseInt(lastShownStr, 10) : 0;
  const elapsed = Date.now() - lastShown;

  const thresholdMet = count >= INTERSTITIAL_TRANSACTION_THRESHOLD;
  const intervalMet = elapsed >= INTERSTITIAL_MIN_INTERVAL_MS;

  if (thresholdMet && intervalMet && isLoaded && interstitial) {
    interstitial.show();
    await AsyncStorage.setItem(COUNT_KEY, '0');
    await AsyncStorage.setItem(LAST_SHOWN_KEY, String(Date.now()));
    // Not: yeniden yükleme CLOSED listener'ında yapılır.
  } else {
    await AsyncStorage.setItem(COUNT_KEY, String(count));
  }
}
