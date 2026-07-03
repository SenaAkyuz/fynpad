import * as Crypto from 'expo-crypto';

import { storage } from '@/lib/storage';
import { useAuthStore } from '@/stores/useAuthStore';

/**
 * PIN saklama/doğrulama yardımcıları.
 *
 * PIN asla düz metin yazılmaz — cihaza özel rastgele salt + SHA-256 hash tutulur.
 * PIN KULLANICIYA ÖZELDİR: key'ler oturumdaki user id ile ayrılır, böylece bir hesabın
 * PIN'i başka bir hesapta İSTENMEZ. SecureStore key'leri `storage` wrapper'ı ile `fynpad.`
 * prefixlenir:
 *   fynpad.lock.pinHash.<userId>, fynpad.lock.pinSalt.<userId>
 */

const hashKey = (userId: string) => `lock.pinHash.${userId}`;
const saltKey = (userId: string) => `lock.pinSalt.${userId}`;

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

/** Yeni PIN tanımlar (oturumdaki kullanıcı için): taze salt üretir, hash'ler, ikisini de yazar. */
export async function setPin(pin: string): Promise<void> {
  const userId = currentUserId();
  if (!userId) return;
  const salt = toHex(Crypto.getRandomBytes(16));
  const hash = await hashPin(pin, salt);
  await storage.setItem(saltKey(userId), salt);
  await storage.setItem(hashKey(userId), hash);
}

/** Verilen PIN, oturumdaki kullanıcının kayıtlı hash'i ile eşleşiyor mu? */
export async function verifyPin(pin: string): Promise<boolean> {
  const userId = currentUserId();
  if (!userId) return false;
  const [salt, storedHash] = await Promise.all([
    storage.getItem(saltKey(userId)),
    storage.getItem(hashKey(userId)),
  ]);
  if (!salt || !storedHash) {
    return false;
  }
  const hash = await hashPin(pin, salt);
  return hash === storedHash;
}

/** Oturumdaki kullanıcının PIN'ini (hash + salt) siler — lock disable sırasında. */
export async function clearPin(): Promise<void> {
  const userId = currentUserId();
  if (!userId) return;
  await Promise.all([storage.removeItem(hashKey(userId)), storage.removeItem(saltKey(userId))]);
}

/** Oturumdaki kullanıcının tanımlı bir PIN'i var mı? */
export async function isPinSet(): Promise<boolean> {
  const userId = currentUserId();
  if (!userId) return false;
  const hash = await storage.getItem(hashKey(userId));
  return !!hash;
}
