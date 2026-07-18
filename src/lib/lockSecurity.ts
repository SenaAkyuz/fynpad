import { clearPinForUser } from '@/lib/pin';
import { secureStorage, storage } from '@/lib/storage';

/**
 * Kilit güvenliği: kalıcı brute-force sayacı + kullanıcıya özel yerel temizlik.
 *
 * Bunlar tek dosyada toplanır çünkü "PIN'i unuttum", "hesap silme" ve "kilidi kapat"
 * akışlarının HEPSİ aynı güvenilir temizlik API'sini kullanmalı — üç ayrı yerde
 * elle key silmek, birinin unutulmasına ve cihazda artık kalmasına yol açıyordu.
 */

const attemptsKey = (userId: string) => `lock.attempts.${userId}`;
const lockoutKey = (userId: string) => `lock.lockoutUntil.${userId}`;
const enabledKey = (userId: string) => `lock.enabled.${userId}`;
const biometricKey = (userId: string) => `lock.biometricEnabled.${userId}`;

/** Bu kadar yanlış denemeden sonra kilitlenir. */
export const MAX_ATTEMPTS = 5;
/** Kilitli kalma süresi (ms). */
export const LOCKOUT_MS = 30_000;

export type LockoutState = {
  attempts: number;
  /** epoch ms; null = kilitli değil */
  lockoutUntil: number | null;
};

/**
 * CİHAZ SAATİ GERİYE ALINMASI — bilinen sınır.
 *
 * lockoutUntil mutlak epoch ms olarak saklanır; kullanıcı cihaz saatini ileri alırsa
 * kalan süreyi kısaltabilir. React Native'de güvenilir monotonic saat (boot-time)
 * yok, bu yüzden tam koruma mümkün değil. Uygulanan sınır: okunan lockoutUntil
 * `şimdi + LOCKOUT_MS`'ten büyük olamaz — saati GERİ alıp kendini kalıcı kilitlemek
 * de mümkün değil, ve kilit süresi hiçbir koşulda tanımlı süreden uzun sürmez.
 *
 * Bu, kararlı bir savunma değil; asıl koruma PIN'in 6 haneli ve hash'li olması ve
 * denemeler arası UI gecikmesidir. Daha güçlü koruma sunucu tarafı sayaç gerektirir.
 */
function clampLockout(value: number, now: number): number {
  const max = now + LOCKOUT_MS;
  return value > max ? max : value;
}

/** Kayıtlı lockout durumunu okur. Süresi dolmuşsa temiz durum döner. */
export async function readLockoutState(userId: string): Promise<LockoutState> {
  try {
    const [rawAttempts, rawUntil] = await Promise.all([
      secureStorage.getItem(attemptsKey(userId)),
      secureStorage.getItem(lockoutKey(userId)),
    ]);

    const attempts = Number.parseInt(rawAttempts ?? '0', 10);
    const parsedUntil = rawUntil ? Number.parseInt(rawUntil, 10) : NaN;
    const now = Date.now();

    if (!Number.isFinite(parsedUntil) || parsedUntil <= now) {
      return { attempts: Number.isFinite(attempts) ? attempts : 0, lockoutUntil: null };
    }
    return {
      attempts: Number.isFinite(attempts) ? attempts : 0,
      lockoutUntil: clampLockout(parsedUntil, now),
    };
  } catch {
    // Okuma başarısız → kilitsiz varsay; kullanıcıyı uygulamadan dışlamak doğru değil.
    return { attempts: 0, lockoutUntil: null };
  }
}

/**
 * Yanlış PIN sonrası sayacı KALICI olarak artırır ve gerekiyorsa lockout başlatır.
 * Yazma başarısız olsa bile UI akışı sürer (dönen değer bellek içi doğruyu taşır).
 */
export async function registerFailedAttempt(userId: string): Promise<LockoutState> {
  const current = await readLockoutState(userId);
  const attempts = current.attempts + 1;
  const lockoutUntil = attempts >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : null;

  try {
    await secureStorage.setItem(attemptsKey(userId), String(attempts));
    if (lockoutUntil !== null) {
      await secureStorage.setItem(lockoutKey(userId), String(lockoutUntil));
    }
  } catch {
    // Kalıcılık başarısız — force-stop ile sayaç sıfırlanabilir. Bilinen sınır.
  }
  return { attempts, lockoutUntil };
}

/** Başarılı PIN/biyometri sonrası sayaç sıfırlanır. */
export async function clearLockoutState(userId: string): Promise<void> {
  await storage.removeItem(attemptsKey(userId));
  await storage.removeItem(lockoutKey(userId));
}

/**
 * Bir kullanıcının TÜM yerel güvenlik kayıtlarını siler: PIN (v1+v2), kilit tercihleri,
 * biyometri tercihi ve brute-force sayacı.
 *
 * userId AÇIKÇA alınır — çağıran taraf oturumu kapatmadan ÖNCE yakalamalıdır.
 * BAŞKA kullanıcıların kayıtlarına dokunmaz (key'ler userId ile ayrılmıştır).
 */
export async function clearLocalSecurityForUser(userId: string): Promise<void> {
  await clearPinForUser(userId);
  await storage.removeItem(enabledKey(userId));
  await storage.removeItem(biometricKey(userId));
  await clearLockoutState(userId);
}
