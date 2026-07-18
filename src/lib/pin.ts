import * as Crypto from 'expo-crypto';

import { secureStorage, storage } from '@/lib/storage';
import { useAuthStore } from '@/stores/useAuthStore';

/**
 * PIN saklama/doğrulama yardımcıları.
 *
 * PIN asla düz metin yazılmaz — rastgele salt + SHA-256 hash tutulur. PIN KULLANICIYA
 * ÖZELDİR: key'ler user id ile ayrılır, böylece bir hesabın PIN'i başka hesapta istenmez.
 *
 * ── DEPOLAMA FORMATI ──────────────────────────────────────────────────────────
 * v2 (güncel):  fynpad.lock.pinRecord.<userId>  → {"v":2,"salt":"...","hash":"..."}
 * v1 (eski):    fynpad.lock.pinSalt.<userId> + fynpad.lock.pinHash.<userId>
 *
 * Neden değişti: v1'de salt ve hash AYRI iki yazma idi. İlki başarılı, ikincisi
 * başarısız olduğunda YARIM kayıt kalıyor ve PIN bir daha doğrulanamıyordu.
 * v2 tek atomik yazma — ya ikisi birden var, ya hiçbiri.
 *
 * GERİYE UYUMLULUK: okuma ÖNCE v2'yi dener, yoksa v1'e düşer. v1 ile başarılı bir
 * doğrulama yapıldığında kayıt sessizce v2'ye taşınır (kontrollü migration) ve eski
 * anahtarlar ancak taşıma DOĞRULANDIKTAN sonra silinir. Mevcut kullanıcılar PIN'lerini
 * kaybetmez, yeniden kurmaları gerekmez.
 */

const recordKey = (userId: string) => `lock.pinRecord.${userId}`;
/** v1 (legacy) anahtarları — yalnızca okuma ve migration sırasında kullanılır. */
const legacyHashKey = (userId: string) => `lock.pinHash.${userId}`;
const legacySaltKey = (userId: string) => `lock.pinSalt.${userId}`;

type PinRecord = { v: 2; salt: string; hash: string };

/** Oturumdaki kullanıcının id'si (PIN key'lerini ayırmak için). Yoksa null. */
function currentUserId(): string | null {
  return useAuthStore.getState().session?.user?.id ?? null;
}

/** PIN biçim kuralı: tam 6 hane, sadece rakam. */
export const PIN_LENGTH = 6;
export const isValidPin = (pin: string): boolean => /^\d{6}$/.test(pin);

/** 16 byte rastgele veriyi hex string'e çevirir. */
function toHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

/** salt + PIN → SHA-256, hex string. */
export async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
}

/**
 * Kullanıcının PIN kaydını okur. v2 yoksa v1'e düşer.
 * `legacy: true` → çağıran taraf başarılı doğrulamadan sonra migrateToV2 çağırmalı.
 */
async function readPinRecord(
  userId: string
): Promise<{ record: PinRecord; legacy: boolean } | null> {
  const raw = await secureStorage.getItem(recordKey(userId));
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as PinRecord;
      if (parsed?.v === 2 && parsed.salt && parsed.hash) {
        return { record: parsed, legacy: false };
      }
    } catch {
      // Bozuk JSON → v1'e düşmeyi dene (aşağıda).
    }
  }

  const [salt, hash] = await Promise.all([
    secureStorage.getItem(legacySaltKey(userId)),
    secureStorage.getItem(legacyHashKey(userId)),
  ]);
  if (salt && hash) {
    return { record: { v: 2, salt, hash }, legacy: true };
  }
  return null;
}

/**
 * v1 → v2 taşıma. Yalnızca DOĞRU PIN girildikten sonra çağrılır, yani kaydın geçerli
 * olduğu kanıtlanmıştır. v2 yazımı doğrulanmadan eski anahtarlar SİLİNMEZ — taşıma
 * yarıda kalırsa kullanıcı v1 ile çalışmaya devam eder.
 */
async function migrateToV2(userId: string, record: PinRecord): Promise<void> {
  try {
    await secureStorage.setItem(recordKey(userId), JSON.stringify(record));
  } catch {
    return; // v1 kaydı duruyor, bir sonraki başarılı doğrulamada tekrar denenir.
  }
  // v2 yazıldı ve geri okunarak doğrulandı → eski anahtarlar temizlenebilir.
  await storage.removeItem(legacySaltKey(userId));
  await storage.removeItem(legacyHashKey(userId));
}

/**
 * Yeni PIN tanımlar (oturumdaki kullanıcı için).
 *
 * ATOMİK: salt+hash tek JSON kaydında, tek yazmada. secureStorage yazmayı geri okuyup
 * doğrular; başarısızsa FIRLATIR — çağıran taraf "PIN kuruldu" DEMEMELİDİR.
 */
export async function setPin(pin: string): Promise<void> {
  const userId = currentUserId();
  if (!userId) {
    throw new Error('NO_ACTIVE_USER');
  }
  const salt = toHex(Crypto.getRandomBytes(16));
  const hash = await hashPin(pin, salt);
  const record: PinRecord = { v: 2, salt, hash };

  await secureStorage.setItem(recordKey(userId), JSON.stringify(record));

  // Yeni PIN kurulduysa varsa eski format artık geçersiz — temizle (best-effort).
  await storage.removeItem(legacySaltKey(userId));
  await storage.removeItem(legacyHashKey(userId));
}

/** Verilen PIN, oturumdaki kullanıcının kayıtlı hash'i ile eşleşiyor mu? */
export async function verifyPin(pin: string): Promise<boolean> {
  const userId = currentUserId();
  if (!userId) return false;

  let found: { record: PinRecord; legacy: boolean } | null;
  try {
    found = await readPinRecord(userId);
  } catch {
    // Okuma hatası → doğrulama başarısız sayılır (fail-closed).
    return false;
  }
  if (!found) return false;

  const hash = await hashPin(pin, found.record.salt);
  const ok = hash === found.record.hash;

  // Doğru PIN + eski format → kontrollü migration.
  if (ok && found.legacy) {
    await migrateToV2(userId, found.record);
  }
  return ok;
}

/**
 * Belirtilen kullanıcının PIN kaydını siler (her iki format).
 *
 * userId AÇIKÇA alınır: "PIN'i unuttum" akışında önce signOut çağrılıyordu, oturum
 * kapandığı için currentUserId() null dönüyor ve temizlik SESSİZCE hiçbir şey
 * yapmıyordu — kullanıcının PIN'i cihazda kalıyordu.
 */
export async function clearPinForUser(userId: string): Promise<void> {
  await storage.removeItem(recordKey(userId));
  await storage.removeItem(legacySaltKey(userId));
  await storage.removeItem(legacyHashKey(userId));
}

/** Oturumdaki kullanıcının PIN'ini siler — lock disable sırasında. */
export async function clearPin(): Promise<void> {
  const userId = currentUserId();
  if (!userId) return;
  await clearPinForUser(userId);
}

/** Oturumdaki kullanıcının tanımlı bir PIN'i var mı? */
export async function isPinSet(): Promise<boolean> {
  const userId = currentUserId();
  if (!userId) return false;
  try {
    return (await readPinRecord(userId)) !== null;
  } catch {
    return false;
  }
}
