import * as ScreenOrientation from 'expo-screen-orientation';
import { Dimensions, Platform } from 'react-native';

/**
 * Android'in "tablet" eşiği: en küçük ekran kenarı ≥ 600dp (sw600dp niteleyicisi). 7"/10"
 * tabletler bu sınırın üstünde, telefonlar (≈360–430dp) altında kalır.
 */
const TABLET_MIN_WIDTH_DP = 600;

/**
 * Cihazın FİZİKSEL ekran kısa kenarını dp cinsinden verir. `window` DEĞİL `screen` okunur:
 * uygulama letterbox'landığında `window` daralmış pencereyi gösterir ve tablet tespiti
 * kendi kendini yanlışlar (dar pencere → "telefon" → dikey kilit → dar pencere).
 */
function smallestWidthDp(): number {
  const { width, height } = Dimensions.get('screen');
  return Math.min(width, height);
}

export function isTablet(): boolean {
  return smallestWidthDp() >= TABLET_MIN_WIDTH_DP;
}

/**
 * Yönlendirme politikası: TELEFONDA dikey kilit, TABLETTE serbest.
 *
 * Manifest artık `screenOrientation` kısıtlaması taşımıyor (app.json → orientation: "default"),
 * çünkü sabit dikey kilit yatay duran tablette Android'in FIXED_ORIENTATION letterbox'ını
 * tetikliyordu: pencere 600x800dp'ye sıkışıp etrafı siyah bantla doluyordu ve o bandın rengi
 * uygulama içinden değiştirilemiyor (Android 12+'da cihaz seviyesi ayar). Kilidi çalışma
 * anında yalnızca telefonlara uygulayarak telefon deneyimini aynen koruyor, tablette tam
 * ekranı geri alıyoruz.
 *
 * Not: Android 16 (targetSdk 36) büyük ekranlarda manifest yön kısıtlamalarını zaten yok
 * sayıyor; bu yaklaşım o davranışla da uyumlu.
 */
export async function applyOrientationPolicy(): Promise<void> {
  // iOS tarafı app.json/Info.plist ile yönetiliyor; burada yalnızca Android'i ilgilendiren
  // letterbox sorununu çözüyoruz.
  if (Platform.OS !== 'android') return;
  try {
    await ScreenOrientation.lockAsync(
      isTablet()
        ? ScreenOrientation.OrientationLock.DEFAULT
        : ScreenOrientation.OrientationLock.PORTRAIT_UP
    );
  } catch {
    // Yön kilidi kritik değil — başarısız olursa sistem varsayılanıyla devam.
  }
}
