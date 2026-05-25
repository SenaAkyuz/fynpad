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
 * Donanım var + en az WEAK seviye biyometrik kayıtlı.
 * SecurityLevel: NONE=0, SECRET=1, BIOMETRIC_WEAK=2, BIOMETRIC_STRONG=3.
 * WEAK ve üstünü kabul ediyoruz (Android orta segment yüz tanıma dahil).
 */
export async function canUseBiometric(): Promise<boolean> {
  const hasHw = await LocalAuthentication.hasHardwareAsync();
  if (!hasHw) {
    return false;
  }
  const enrolledLevel = await LocalAuthentication.getEnrolledLevelAsync();
  return enrolledLevel >= LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK;
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
      biometricsSecurityLevel: 'weak', // Android yüz tanımayı (Class 2) kabul et
    });
    if (result.success) {
      return { success: true };
    }
    return { success: false, error: result.error };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'unknown' };
  }
}

/** TEMP — fix doğrulandığında kaldırılacak. __DEV__'de bir kerelik tanılama log'u. */
export async function logBiometricDiagnostics(): Promise<void> {
  if (!__DEV__) {
    return;
  }
  try {
    const [hasHw, enrolledLevel, types, kind] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.getEnrolledLevelAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
      getBiometricKind(),
    ]);
    console.log('[FynPad/biometric]', { hasHardware: hasHw, enrolledLevel, types, kind });
  } catch (error) {
    console.log('[FynPad/biometric] diagnostics error:', error);
  }
}
