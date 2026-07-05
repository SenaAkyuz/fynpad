import type { AdsConsentInfoOptions } from 'react-native-google-mobile-ads';
import { AdsConsent, AdsConsentDebugGeography, AdsConsentStatus } from 'react-native-google-mobile-ads';

/**
 * DEV'de EEA taklidini GERÇEK cihazlarda da etkinleştirmek için test cihazı "hashed ID"leri.
 * Emülatör/simülatör OTOMATİK test cihazı sayıldığından bu liste boşken bile emülatörde form
 * çıkar; fiziksel cihazda çıkması için cihazın hash'ini buraya ekle.
 *
 * ID'yi nereden bulursun: `__DEV__` build'i gerçek cihazda çalıştırınca native log'a (logcat)
 * şuna benzer bir satır düşer:
 *   "Use ConsentDebugSettings.Builder().addTestDeviceHashedId("33BE2250B43518CCDA7DE426D04EE231")"
 * O tırnak içindeki değeri aşağıya ekle. Yalnızca DEV'de kullanılır; production'a gitmez.
 */
const DEV_TEST_DEVICE_IDS: string[] = [
  // 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
];

/**
 * AdMob için GDPR/EU consent (UMP). `react-native-google-mobile-ads` paketinin YERLEŞİK
 * AdsConsent API'sini kullanır — ekstra paket yok.
 *
 * EU/UK kullanıcılarında consent formu gösterilir; EU dışı (ör. Türkiye) kullanıcılarda
 * `status` REQUIRED olmadığı için form ÇIKMAZ. Hata olsa bile akış bloklanmaz — reklamlar
 * gerekirse non-personalized olarak gösterilebilir. mobileAds().initialize()'dan ÖNCE çağrılmalı.
 */
export async function requestConsent(): Promise<void> {
  try {
    // DEV: EEA coğrafyasını taklit et → UMP consent formu + "Reklam Tercihleri" (privacy options)
    // formu test ortamında görünür olur. Emülatör otomatik test cihazıdır; gerçek cihaz için
    // DEV_TEST_DEVICE_IDS'e hash eklenmelidir.
    // Production'da (__DEV__ = false) HİÇBİR debug ayarı gönderilmez; gerçek coğrafya kullanılır.
    const debugOptions: AdsConsentInfoOptions | undefined = __DEV__
      ? {
          debugGeography: AdsConsentDebugGeography.EEA,
          testDeviceIdentifiers: DEV_TEST_DEVICE_IDS,
        }
      : undefined;
    const consentInfo = await AdsConsent.requestInfoUpdate(debugOptions);
    if (consentInfo.isConsentFormAvailable && consentInfo.status === AdsConsentStatus.REQUIRED) {
      await AdsConsent.showForm();
    }
  } catch (e) {
    if (__DEV__) console.log('[FynPad/ads] consent error:', e);
    // Consent alınamasa bile akışı bloklama.
  }
}

/**
 * Kullanıcının reklam/veri tercihlerini yeniden düzenleyebilmesi için UMP "privacy options"
 * formunu gösterir (Ayarlar → Reklam Tercihleri). Form yalnızca consent gereken bölgelerde
 * (EU/UK) kullanılabilir; kullanılamıyorsa `false` döner ve arayan bir mesaj gösterebilir.
 */
export async function showAdPrivacyOptions(): Promise<boolean> {
  try {
    await AdsConsent.showPrivacyOptionsForm();
    return true;
  } catch (e) {
    if (__DEV__) console.log('[FynPad/ads] privacy options error:', e);
    return false;
  }
}
