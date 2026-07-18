/* eslint-disable import/first --
 * import'lar KASITLI olarak jest.mock bloklarından SONRA duruyor. Mock fabrikaları
 * mockMem/mockFailWritesFor gibi değişkenlere erişiyor; import'lar yukarı alınırsa
 * test edilen modüller mock'lar tanımlanmadan yüklenir ve TDZ hatası oluşur.
 */

/**
 * docs/claude-fix-plan/03 — PIN depolama, migration, lockout ve biyometri hata eşlemesi.
 *
 * SecureStore bellek içi sahte bir implementasyonla değiştirilir; böylece gerçek cihaz
 * olmadan v1→v2 migration'ı, atomiklik ve yazma hatası davranışı test edilebilir.
 */

type Store = Map<string, string>;
const mockMem: Store = new Map();
let mockFailWritesFor: RegExp | null = null;
/** Yazma "başarılı" döner ama veri kalıcılaşmaz — sessiz veri kaybı senaryosu. */
let mockSilentlyDropWrites = false;

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => (mockMem.has(k) ? mockMem.get(k)! : null)),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    if (mockFailWritesFor?.test(k)) throw new Error('secure store write failed');
    if (mockSilentlyDropWrites) return;
    mockMem.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockMem.delete(k);
  }),
}));

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  CryptoEncoding: { HEX: 'hex' },
  getRandomBytes: (n: number) => new Uint8Array(Array.from({ length: n }, (_, i) => i + 1)),
  // Deterministik sahte hash — testin amacı kriptografi değil, akış doğruluğu.
  digestStringAsync: jest.fn(async (_alg: string, data: string) => `hash(${data})`),
}));

const USER_A = 'user-a';
const USER_B = 'user-b';
let mockActiveUserId: string | null = USER_A;

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: {
    getState: () => ({ session: mockActiveUserId ? { user: { id: mockActiveUserId } } : null }),
  },
}));

import { mapBiometricError } from '@/lib/biometric';
import {
  LOCKOUT_MS,
  MAX_ATTEMPTS,
  clearLocalSecurityForUser,
  readLockoutState,
  registerFailedAttempt,
} from '@/lib/lockSecurity';
import { clearPinForUser, isPinSet, setPin, verifyPin } from '@/lib/pin';

const K = (name: string) => `fynpad.${name}`;

beforeEach(() => {
  mockMem.clear();
  mockFailWritesFor = null;
  mockSilentlyDropWrites = false;
  mockActiveUserId = USER_A;
});

describe('PIN v2 atomik kayıt', () => {
  it('tek kayıtta salt+hash saklar ve doğrular', async () => {
    await setPin('123456');
    const raw = mockMem.get(K(`lock.pinRecord.${USER_A}`));
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw!);
    expect(parsed.v).toBe(2);
    expect(parsed.salt).toBeTruthy();
    expect(parsed.hash).toBeTruthy();

    await expect(verifyPin('123456')).resolves.toBe(true);
    await expect(verifyPin('654321')).resolves.toBe(false);
  });

  it('yazma başarısızsa FIRLATIR — çağıran "PIN kuruldu" diyemez', async () => {
    mockFailWritesFor = /pinRecord/;
    await expect(setPin('123456')).rejects.toThrow();
    await expect(isPinSet()).resolves.toBe(false);
  });

  it('yazma sessizce kaybolursa da FIRLATIR (geri okuma doğrulaması)', async () => {
    mockSilentlyDropWrites = true;
    await expect(setPin('123456')).rejects.toThrow();
    await expect(isPinSet()).resolves.toBe(false);
  });

  it('yarım kayıt bırakmaz', async () => {
    mockFailWritesFor = /pinRecord/;
    await expect(setPin('123456')).rejects.toThrow();
    expect(mockMem.get(K(`lock.pinSalt.${USER_A}`))).toBeUndefined();
    expect(mockMem.get(K(`lock.pinHash.${USER_A}`))).toBeUndefined();
    expect(mockMem.get(K(`lock.pinRecord.${USER_A}`))).toBeUndefined();
  });
});

describe('v1 → v2 geriye uyumluluk', () => {
  /** Eski formatta kurulmuş bir PIN'i simüle eder. */
  async function seedLegacyPin(userId: string, pin: string) {
    const salt = 'legacysalt';
    mockMem.set(K(`lock.pinSalt.${userId}`), salt);
    mockMem.set(K(`lock.pinHash.${userId}`), `hash(${salt}:${pin})`);
  }

  it('eski formatta kurulmuş PIN doğrulanmaya DEVAM eder', async () => {
    await seedLegacyPin(USER_A, '111111');
    await expect(verifyPin('111111')).resolves.toBe(true);
  });

  it('eski format tanınır (isPinSet true)', async () => {
    await seedLegacyPin(USER_A, '111111');
    await expect(isPinSet()).resolves.toBe(true);
  });

  it('doğru PIN girilince v2ye taşınır ve eski anahtarlar silinir', async () => {
    await seedLegacyPin(USER_A, '111111');
    await expect(verifyPin('111111')).resolves.toBe(true);

    expect(mockMem.get(K(`lock.pinRecord.${USER_A}`))).toBeDefined();
    expect(mockMem.get(K(`lock.pinSalt.${USER_A}`))).toBeUndefined();
    expect(mockMem.get(K(`lock.pinHash.${USER_A}`))).toBeUndefined();

    // Taşımadan sonra da çalışmalı.
    await expect(verifyPin('111111')).resolves.toBe(true);
  });

  it('YANLIŞ PIN girilince taşıma YAPILMAZ', async () => {
    await seedLegacyPin(USER_A, '111111');
    await expect(verifyPin('999999')).resolves.toBe(false);
    expect(mockMem.get(K(`lock.pinRecord.${USER_A}`))).toBeUndefined();
    expect(mockMem.get(K(`lock.pinSalt.${USER_A}`))).toBeDefined();
  });

  it('taşıma yazması başarısızsa eski kayıt KORUNUR (PIN kaybolmaz)', async () => {
    await seedLegacyPin(USER_A, '111111');
    mockFailWritesFor = /pinRecord/;
    await expect(verifyPin('111111')).resolves.toBe(true);
    // v2 yazılamadı → v1 duruyor, kullanıcı erişimini kaybetmedi.
    expect(mockMem.get(K(`lock.pinSalt.${USER_A}`))).toBeDefined();
    expect(mockMem.get(K(`lock.pinHash.${USER_A}`))).toBeDefined();

    mockFailWritesFor = null;
    await expect(verifyPin('111111')).resolves.toBe(true);
  });
});

describe('kullanıcı izolasyonu', () => {
  it('A’nın temizliği B’nin kayıtlarına DOKUNMAZ', async () => {
    await setPin('111111');
    mockActiveUserId = USER_B;
    await setPin('222222');

    await clearLocalSecurityForUser(USER_A);

    expect(mockMem.get(K(`lock.pinRecord.${USER_A}`))).toBeUndefined();
    expect(mockMem.get(K(`lock.pinRecord.${USER_B}`))).toBeDefined();
    await expect(verifyPin('222222')).resolves.toBe(true); // B hâlâ çalışıyor
  });

  it('clearLocalSecurityForUser tüm yerel güvenlik kayıtlarını siler', async () => {
    await setPin('111111');
    mockMem.set(K(`lock.enabled.${USER_A}`), '1');
    mockMem.set(K(`lock.biometricEnabled.${USER_A}`), '1');
    mockMem.set(K(`lock.attempts.${USER_A}`), '3');
    mockMem.set(K(`lock.lockoutUntil.${USER_A}`), String(Date.now() + 10_000));

    await clearLocalSecurityForUser(USER_A);

    for (const k of ['pinRecord', 'enabled', 'biometricEnabled', 'attempts', 'lockoutUntil']) {
      expect(mockMem.get(K(`lock.${k}.${USER_A}`))).toBeUndefined();
    }
  });

  it('clearPinForUser her iki formatı da siler', async () => {
    mockMem.set(K(`lock.pinSalt.${USER_A}`), 's');
    mockMem.set(K(`lock.pinHash.${USER_A}`), 'h');
    mockMem.set(K(`lock.pinRecord.${USER_A}`), '{"v":2,"salt":"s","hash":"h"}');
    await clearPinForUser(USER_A);
    expect(mockMem.get(K(`lock.pinSalt.${USER_A}`))).toBeUndefined();
    expect(mockMem.get(K(`lock.pinHash.${USER_A}`))).toBeUndefined();
    expect(mockMem.get(K(`lock.pinRecord.${USER_A}`))).toBeUndefined();
  });
});

describe('kalıcı brute-force lockout', () => {
  it('MAX_ATTEMPTS’e ulaşınca lockout başlar ve DİSKE yazılır', async () => {
    let state = { attempts: 0, lockoutUntil: null as number | null };
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      state = await registerFailedAttempt(USER_A);
    }
    expect(state.attempts).toBe(MAX_ATTEMPTS);
    expect(state.lockoutUntil).not.toBeNull();
    expect(mockMem.get(K(`lock.lockoutUntil.${USER_A}`))).toBeDefined();
  });

  it('force-stop (yeniden okuma) sonrası lockout DEVAM eder', async () => {
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      await registerFailedAttempt(USER_A);
    }
    // Uygulama yeniden başlatıldı → yalnızca diskten okunur.
    const restored = await readLockoutState(USER_A);
    expect(restored.lockoutUntil).not.toBeNull();
    expect(restored.attempts).toBe(MAX_ATTEMPTS);
  });

  it('süresi dolmuş lockout temiz durum döner', async () => {
    mockMem.set(K(`lock.attempts.${USER_A}`), '5');
    mockMem.set(K(`lock.lockoutUntil.${USER_A}`), String(Date.now() - 1000));
    const state = await readLockoutState(USER_A);
    expect(state.lockoutUntil).toBeNull();
  });

  it('cihaz saati ileri alınmış aşırı büyük lockout değeri sınırlanır', async () => {
    // Saldırgan/kaza: çok uzak gelecekte bir değer → kullanıcı kalıcı kilitlenmemeli.
    const farFuture = Date.now() + 10 * 365 * 24 * 60 * 60 * 1000;
    mockMem.set(K(`lock.lockoutUntil.${USER_A}`), String(farFuture));
    const state = await readLockoutState(USER_A);
    expect(state.lockoutUntil).not.toBeNull();
    expect(state.lockoutUntil! - Date.now()).toBeLessThanOrEqual(LOCKOUT_MS + 1000);
  });

  it('MAX_ATTEMPTS altındaki denemelerde lockout başlamaz', async () => {
    const state = await registerFailedAttempt(USER_A);
    expect(state.attempts).toBe(1);
    expect(state.lockoutUntil).toBeNull();
  });
});

describe('biyometri hata eşlemesi', () => {
  it('kullanıcı iptalini sessiz sınıflandırır', () => {
    expect(mapBiometricError('user_cancel')).toBe('cancelled');
    expect(mapBiometricError('user_fallback')).toBe('cancelled');
  });

  it('sistem iptalini akış bozmayan sınıfa koyar', () => {
    expect(mapBiometricError('system_cancel')).toBe('system');
    expect(mapBiometricError('app_cancel')).toBe('system');
  });

  it('kullanılamaz durumları ayırt eder', () => {
    expect(mapBiometricError('not_enrolled')).toBe('unavailable');
    expect(mapBiometricError('not_available')).toBe('unavailable');
  });

  it('sistem kilidini ayırt eder', () => {
    expect(mapBiometricError('lockout')).toBe('lockout');
    expect(mapBiometricError('lockout_permanent')).toBe('lockout');
  });

  it('eşleşmeme tekrar denenebilir', () => {
    expect(mapBiometricError('authentication_failed')).toBe('failed');
  });

  it('bilinmeyen kod unknown', () => {
    expect(mapBiometricError(undefined)).toBe('unknown');
    expect(mapBiometricError('something_new')).toBe('unknown');
  });
});
