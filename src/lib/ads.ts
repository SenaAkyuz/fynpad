import { TestIds } from 'react-native-google-mobile-ads';

/**
 * Reklam birim ID'leri — gerçek AdMob ID'lerine geçiş TEK NOKTADAN buradan yapılır.
 *
 * ⚠️ PRODUCTION'A GEÇMEDEN ÖNCE:
 *   1. AdMob Console'dan gerçek banner + interstitial Ad Unit ID'lerini al.
 *   2. Aşağıdaki __PROD_IDS__ objesini doldur.
 *   3. app.json'daki androidAppId/iosAppId'yi gerçek App ID ile güncelle.
 *
 * __DEV__ RN'in yerleşik global'i: development build'de true, production build'de false.
 * Yani test/gerçek ID geçişi otomatik olur — __PROD_IDS__ dolu olduğu sürece elle değişiklik gerekmez.
 */
const __PROD_IDS__ = {
  banner: 'ca-app-pub-5759922022739187/4734489912',
  interstitial: 'ca-app-pub-5759922022739187/5361175873',
};

export const AD_UNIT_IDS = {
  banner: __DEV__ ? TestIds.BANNER : __PROD_IDS__.banner,
  interstitial: __DEV__ ? TestIds.INTERSTITIAL : __PROD_IDS__.interstitial,
};

/** Interstitial frequency cap: her N işlemde bir VE en az MIN_INTERVAL geçmişse göster. */
export const INTERSTITIAL_TRANSACTION_THRESHOLD = 3; // her N işlemde bir
export const INTERSTITIAL_MIN_INTERVAL_MS = 90 * 1000; // min 90 saniye
