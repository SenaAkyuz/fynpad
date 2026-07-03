import { AdsConsent, AdsConsentStatus } from 'react-native-google-mobile-ads';

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
    const consentInfo = await AdsConsent.requestInfoUpdate();
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
