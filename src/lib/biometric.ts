import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

/**
 * expo-local-authentication ince sarmalayıcısı.
 * Cihaz şifresine fallback KAPALI — bizim kendi PIN'imiz var (disableDeviceFallback).
 *
 * Android: WEAK (Class 2 — kamera bazlı yüz tanıma) biyometrik de kabul edilir.
 * PIN ana güvenlik olduğundan bu kabul edilebilir bir tradeoff. iOS'ta etkisi yok.
 */

/** Donanım (parmak izi / yüz sensörü) destekliyor mu? */
export async function hasHardware(): Promise<boolean> {
  return LocalAuthentication.hasHardwareAsync();
}

/** İşletim sisteminde kayıtlı biyometrik var mı? */
export async function isEnrolled(): Promise<boolean> {
  return LocalAuthentication.isEnrolledAsync();
}

/**
 * Donanım var + biyometrik kayıtlı.
 *
 * Android: getEnrolledLevelAsync ile en az WEAK seviye kontrolü.
 * SecurityLevel: NONE=0, SECRET=1, BIOMETRIC_WEAK=2, BIOMETRIC_STRONG=3.
 * WEAK ve üstünü kabul ediyoruz (Samsung A70 gibi Class 2 yüz tanıma dahil).
 *
 * iOS: getEnrolledLevelAsync anlamlı değer döndürmüyor; hasHardware + isEnrolled
 * yeterli. Aksi halde Face ID / Touch ID yanlışlıkla reddediliyordu.
 */
export async function canUseBiometric(): Promise<boolean> {
  const hasHw = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();

  if (!hasHw) {
    return false;
  }
  if (!enrolled) {
    return false;
  }

  if (Platform.OS === 'android') {
    // ÜRÜN KARARI (docs/claude-fix-plan/03): finans uygulaması olduğumuz için
    // BIOMETRIC_STRONG (Class 3) şartı aranır. Eskiden WEAK kabul ediliyordu; Class 2
    // kamera bazlı yüz tanıma fotoğrafla aldatılabildiği için finansal veriye erişimde
    // yeterli güvence sağlamıyor.
    //
    // Yalnızca weak biyometriye sahip cihazlarda toggle kullanılamaz olarak gösterilir
    // (bkz. hasWeakOnlyBiometric) ve kullanıcı 6 haneli PIN ile korunmaya devam eder —
    // yani özellik kaybı değil, daha zayıf yönteme düşüşün engellenmesidir.
    const enrolledLevel = await LocalAuthentication.getEnrolledLevelAsync();
    return enrolledLevel >= LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG;
  }

  // iOS: Face ID / Touch ID zaten Class 3 muadili; hasHardware + isEnrolled yeterli.
  return true;
}

/**
 * Cihazda biyometri kayıtlı AMA yalnızca zayıf (Class 2) seviyede mi?
 * UI bunu kullanıp "cihazın biyometrisi bu uygulama için yeterince güçlü değil"
 * açıklamasını gösterir; aksi halde toggle sebepsizce kapalı görünürdü.
 */
export async function hasWeakOnlyBiometric(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const hasHw = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!hasHw || !enrolled) return false;
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  return (
    level >= LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK &&
    level < LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG
  );
}

export type BiometricKind = 'face' | 'fingerprint' | 'iris' | 'unknown' | 'none';

/** Kayıtlı biyometrik türü (UI metni için). Öncelik: fingerprint > face > iris. */
export async function getBiometricKind(): Promise<BiometricKind> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.length === 0) {
    return 'none';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'fingerprint';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'face';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'iris';
  }
  return 'unknown';
}

/**
 * Doğrulama sonucunun UI için sınıflandırılmış hâli.
 *
 * Eskiden ham `result.error` string'i dönüyordu ve çağıran taraf hepsini aynı şekilde
 * (sessiz) ele alıyordu: kullanıcı biyometriyi silmişse veya sistem kilitlemişse
 * hiçbir açıklama görmüyor, toggle açık kalıp çalışmıyordu.
 */
export type BiometricFailure =
  /** Kullanıcı promptu kendisi kapattı — sessiz geç, hata gösterme. */
  | 'cancelled'
  /** Sistem/uygulama iptali (arka plana geçme vb.) — akışı bozma. */
  | 'system'
  /** Cihazda kayıtlı biyometri yok veya donanım yok → toggle kapatılmalı. */
  | 'unavailable'
  /** Çok fazla başarısız deneme — SİSTEM biyometriyi kilitledi. */
  | 'lockout'
  /** Eşleşmedi — kullanıcı tekrar deneyebilir. */
  | 'failed'
  | 'unknown';

export type BiometricResult =
  | { success: true }
  | { success: false; failure: BiometricFailure; raw?: string };

/** expo-local-authentication hata kodlarını UI davranışına eşler. */
export function mapBiometricError(raw: string | undefined): BiometricFailure {
  switch (raw) {
    case 'user_cancel':
    case 'user_fallback':
      return 'cancelled';
    case 'system_cancel':
    case 'app_cancel':
      return 'system';
    case 'not_enrolled':
    case 'not_available':
    case 'no_space':
    case 'passcode_not_set':
      return 'unavailable';
    case 'lockout':
    case 'lockout_permanent':
      return 'lockout';
    case 'authentication_failed':
      return 'failed';
    default:
      return 'unknown';
  }
}

/** Biyometrik doğrulama başlatır. */
export async function authenticate(
  promptMessage: string,
  cancelLabel?: string
): Promise<BiometricResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: cancelLabel ?? 'Cancel',
      disableDeviceFallback: true, // cihaz PIN'ine düşmesin — bizim PIN'imiz var
      // biometricsSecurityLevel Android-only; iOS'ta Face ID'yi etkiler, geçilmemeli.
      // 'strong' → Class 3; canUseBiometric ile tutarlı (bkz. yukarıdaki ürün kararı).
      ...(Platform.OS === 'android' && {
        biometricsSecurityLevel: 'strong' as const,
      }),
    });
    if (result.success) {
      return { success: true };
    }
    return { success: false, failure: mapBiometricError(result.error), raw: result.error };
  } catch (error) {
    return {
      success: false,
      failure: 'unknown',
      raw: error instanceof Error ? error.message : 'unknown',
    };
  }
}
