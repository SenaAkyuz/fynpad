import type { AdsConsentInfoOptions } from 'react-native-google-mobile-ads';
import {
  AdsConsent,
  AdsConsentDebugGeography,
  AdsConsentPrivacyOptionsRequirementStatus,
  AdsConsentStatus,
} from 'react-native-google-mobile-ads';

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
 * UMP "privacy options" formu bu kullanıcı için GEREKLİ mi (yalnızca EU/UK gibi bölgelerde).
 * Ayarlar'daki "Reklam Tercihleri" satırı buna göre gösterilir: Türkiye gibi bölgelerde satır
 * hiç çıkmaz — eskiden çıkıyor ve tıklayınca "kullanılamıyor" diyerek kırık özellik izlenimi
 * veriyordu. `requestConsent()` (açılışta) requestInfoUpdate'i zaten çağırdığı için buradaki
 * getConsentInfo güncel değeri döner.
 */
export async function isPrivacyOptionsRequired(): Promise<boolean> {
  try {
    const info = await AdsConsent.getConsentInfo();
    return (
      info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
    );
  } catch {
    return false;
  }
}

/**
 * Kullanıcının reklam/veri tercihlerini yeniden düzenleyebilmesi için UMP "privacy options"
 * formunu gösterir (Ayarlar → Reklam Tercihleri). Form yalnızca consent gereken bölgelerde
 * (EU/UK) kullanılabilir; kullanılamıyorsa `false` döner ve arayan bir mesaj gösterebilir.
 *
 * UMP formu TEMBEL yüklenir: ilk `showPrivacyOptionsForm()` çağrısı, form arka planda daha
 * inmemişse `privacy-options-form-error` ("form is being loading") ile reddeder. Bu yüzden bu
 * hatada kısa aralıklarla birkaç kez yeniden denenir; başka bir hata (ör. bölge desteklemiyor)
 * anında `false` döner. Böylece kullanıcı açılıştan hemen sonra dokunsa bile form açılır.
 */
export async function showAdPrivacyOptions(): Promise<boolean> {
  const isFormLoading = (e: unknown): boolean =>
    (e as { code?: string } | null)?.code === 'privacy-options-form-error';

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await AdsConsent.showPrivacyOptionsForm();
      return true;
    } catch (e) {
      // Yalnızca "form yükleniyor" hatasında yeniden dene; diğer hatalarda hemen vazgeç.
      if (isFormLoading(e) && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        continue;
      }
      if (__DEV__) console.log('[FynPad/ads] privacy options error:', e);
      return false;
    }
  }
  return false;
}
