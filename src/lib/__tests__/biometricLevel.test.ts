/* eslint-disable import/first --
 * import'lar KASITLI olarak jest.mock'tan sonra: mock fabrikası mockLevel/mockHasHw
 * değişkenlerine erişiyor, import'lar yukarı alınırsa TDZ hatası oluşur.
 */

/**
 * Biyometri güvenlik seviyesi — ÜRÜN KARARI regresyon testi.
 *
 * Karar: Android'de BIOMETRIC_WEAK (Class 2) KABUL EDİLİR. docs/claude-fix-plan/03
 * STRONG öneriyordu; kullanıcı tabanındaki Class 2 cihazlar biyometriyi tamamen
 * kaybetmesin diye bilinçli olarak weak'te kalındı (gerekçe ve kabul edilen risk
 * lib/biometric.ts içinde yazılı).
 *
 * Bu testler iki şeyi kilitler:
 *   1. Eşiğin sessizce STRONG'a kaymaması,
 *   2. canUseBiometric eşiği ile authenticate()'in biometricsSecurityLevel ayarının
 *      TUTARLI kalması — tutarsızlık toggle'ın açılıp promptun reddetmesine yol açar.
 */

const SecurityLevel = { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 };

let mockHasHw = true;
let mockEnrolled = true;
let mockLevel = SecurityLevel.BIOMETRIC_WEAK;
type AuthOptions = {
  promptMessage?: string;
  cancelLabel?: string;
  disableDeviceFallback?: boolean;
  biometricsSecurityLevel?: 'weak' | 'strong';
};
const mockAuthenticateAsync = jest.fn(
  async (_options: AuthOptions) => ({ success: true }) as { success: boolean; error?: string }
);

jest.mock('expo-local-authentication', () => ({
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  hasHardwareAsync: jest.fn(async () => mockHasHw),
  isEnrolledAsync: jest.fn(async () => mockEnrolled),
  getEnrolledLevelAsync: jest.fn(async () => mockLevel),
  supportedAuthenticationTypesAsync: jest.fn(async () => [1]),
  authenticateAsync: (options: unknown) => mockAuthenticateAsync(options as AuthOptions),
}));

import { Platform } from 'react-native';

import { authenticate, canUseBiometric } from '@/lib/biometric';

/** Android'e sabitle — karar Android'e özgü (iOS'ta Face ID zaten Class 3 muadili). */
beforeAll(() => {
  Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
});

beforeEach(() => {
  mockHasHw = true;
  mockEnrolled = true;
  mockLevel = SecurityLevel.BIOMETRIC_WEAK;
  mockAuthenticateAsync.mockClear();
  mockAuthenticateAsync.mockResolvedValue({ success: true });
});

describe('canUseBiometric — Android eşiği', () => {
  it('WEAK (Class 2) KABUL EDİLİR — ürün kararı', async () => {
    mockLevel = SecurityLevel.BIOMETRIC_WEAK;
    await expect(canUseBiometric()).resolves.toBe(true);
  });

  it('STRONG (Class 3) da kabul edilir', async () => {
    mockLevel = SecurityLevel.BIOMETRIC_STRONG;
    await expect(canUseBiometric()).resolves.toBe(true);
  });

  it('SECRET (yalnızca cihaz PIN’i) kabul EDİLMEZ', async () => {
    mockLevel = SecurityLevel.SECRET;
    await expect(canUseBiometric()).resolves.toBe(false);
  });

  it('NONE kabul edilmez', async () => {
    mockLevel = SecurityLevel.NONE;
    await expect(canUseBiometric()).resolves.toBe(false);
  });

  it('donanım yoksa false', async () => {
    mockHasHw = false;
    await expect(canUseBiometric()).resolves.toBe(false);
  });

  it('kayıtlı biyometri yoksa false', async () => {
    mockEnrolled = false;
    await expect(canUseBiometric()).resolves.toBe(false);
  });
});

describe('authenticate — eşik tutarlılığı', () => {
  it('Android’de biometricsSecurityLevel "weak" gönderir', async () => {
    await authenticate('prompt');
    expect(mockAuthenticateAsync).toHaveBeenCalledTimes(1);
    const options = mockAuthenticateAsync.mock.calls[0][0];
    // canUseBiometric BIOMETRIC_WEAK'i kabul ettiği için prompt da weak olmalı.
    expect(options.biometricsSecurityLevel).toBe('weak');
  });

  it('cihaz şifresine fallback KAPALI kalır (kendi PIN’imiz var)', async () => {
    await authenticate('prompt');
    const options = mockAuthenticateAsync.mock.calls[0][0];
    expect(options.disableDeviceFallback).toBe(true);
  });

  it('WEAK kabul edilen bir cihazda doğrulama başarılı dönebilir', async () => {
    mockLevel = SecurityLevel.BIOMETRIC_WEAK;
    await expect(canUseBiometric()).resolves.toBe(true);
    await expect(authenticate('prompt')).resolves.toEqual({ success: true });
  });
});
