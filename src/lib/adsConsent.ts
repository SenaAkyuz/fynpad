import type { AdsConsentInfoOptions } from 'react-native-google-mobile-ads';
import {
  AdsConsent,
  AdsConsentDebugGeography,
  AdsConsentPrivacyOptionsRequirementStatus,
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
 * UMP (GDPR/EU consent) akışının sonucu. Reklam sisteminin tamamı bu değerlerle kapılanır:
 *  - `canRequestAds`: SDK reklam isteği yapabilir mi (consent kararı kesinleşti mi). Bu `false`
 *    iken HİÇBİR reklam isteği çıkmamalı (banner + interstitial + SDK init dahil).
 *  - `privacyOptionsRequired`: Ayarlar'daki "Reklam Tercihleri" satırı gösterilmeli mi (EU/UK).
 */
export type ConsentResult = {
  canRequestAds: boolean;
  privacyOptionsRequired: boolean;
};

/**
 * AdMob için GDPR/EU consent (UMP). `react-native-google-mobile-ads` v16'nın YERLEŞİK
 * `AdsConsent.gatherConsent()` yardımcısını kullanır — requestInfoUpdate + gerekiyorsa formu
 * yükleyip gösterme adımlarını TEK çağrıda yapar. Ekstra paket yok.
 *
 * Tek bir paylaşılan promise (modül seviyesi): birden fazla çağıran (açılıştaki init +
 * Ayarlar ekranı + bannerlar) AYNI sonucu alır, çift form gösterimi olmaz. mobileAds()
 * initialize()'dan ve herhangi bir banner render'ından ÖNCE çözülmüş olmalıdır.
 */
let consentPromise: Promise<ConsentResult> | null = null;

/** Consent akışını (ilk çağrıda) başlatır ve paylaşılan sonucu döner. */
export function getConsentReady(): Promise<ConsentResult> {
  consentPromise ??= runConsentFlow();
  return consentPromise;
}

async function runConsentFlow(): Promise<ConsentResult> {
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

    // gatherConsent: bilgi güncelle + gerekiyorsa formu yükle/göster (tek adım, v16 helper).
    const info = await AdsConsent.gatherConsent(debugOptions);
    return {
      canRequestAds: info.canRequestAds === true,
      privacyOptionsRequired:
        info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
    };
  } catch (e) {
    if (__DEV__) console.log('[FynPad/ads] consent error:', e);
    // GÜVENLİ VARSAYILAN: ağ hatası / form yüklenememesi / consent kesinleşmemesi durumunda
    // reklam İSTEME. Eski akış burada sessizce devam edip reklam başlatıyordu (UMP ihlali).
    return { canRequestAds: false, privacyOptionsRequired: false };
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
