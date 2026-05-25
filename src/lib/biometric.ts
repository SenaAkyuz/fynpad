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
    const enrolledLevel = await LocalAuthentication.getEnrolledLevelAsync();
    return enrolledLevel >= LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK;
  }

  // iOS: hasHardware + isEnrolled yeterli.
  return true;
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

export type BiometricResult = { success: boolean; error?: string };

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
      // biometricsSecurityLevel Android-only; iOS'ta Face ID'yi etkiler, geçilmemeli
      ...(Platform.OS === 'android' && {
        biometricsSecurityLevel: 'weak' as const, // Android yüz tanımayı (Class 2) kabul et
      }),
    });
    if (result.success) {
      return { success: true };
    }
    return { success: false, error: result.error };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'unknown' };
  }
}
