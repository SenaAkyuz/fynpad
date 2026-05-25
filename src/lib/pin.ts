import * as Crypto from 'expo-crypto';

import { storage } from '@/lib/storage';

/**
 * PIN saklama/doğrulama yardımcıları.
 *
 * PIN asla düz metin yazılmaz — cihaza özel rastgele salt + SHA-256 hash tutulur.
 * SecureStore key'leri `storage` wrapper'ı ile `fynpad.` prefixlenir:
 *   fynpad.lock.pinHash, fynpad.lock.pinSalt
 */

const KEY_HASH = 'lock.pinHash';
const KEY_SALT = 'lock.pinSalt';

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

/** Kayıtlı salt'ı döndürür; yoksa 16 byte üretip yazar. */
export async function getOrCreateSalt(): Promise<string> {
  const existing = await storage.getItem(KEY_SALT);
  if (existing) {
    return existing;
  }
  const salt = toHex(Crypto.getRandomBytes(16));
  await storage.setItem(KEY_SALT, salt);
  return salt;
}

/** Yeni PIN tanımlar: taze salt üretir, hash'ler, ikisini de yazar. */
export async function setPin(pin: string): Promise<void> {
  const salt = toHex(Crypto.getRandomBytes(16));
  const hash = await hashPin(pin, salt);
  await storage.setItem(KEY_SALT, salt);
  await storage.setItem(KEY_HASH, hash);
}

/** Verilen PIN kayıtlı hash ile eşleşiyor mu? */
export async function verifyPin(pin: string): Promise<boolean> {
  const [salt, storedHash] = await Promise.all([
    storage.getItem(KEY_SALT),
    storage.getItem(KEY_HASH),
  ]);
  if (!salt || !storedHash) {
    return false;
  }
  const hash = await hashPin(pin, salt);
  return hash === storedHash;
}

/** PIN'i (hash + salt) siler — lock disable veya logout sırasında. */
export async function clearPin(): Promise<void> {
  await Promise.all([storage.removeItem(KEY_HASH), storage.removeItem(KEY_SALT)]);
}

/** Cihazda tanımlı bir PIN var mı? */
export async function isPinSet(): Promise<boolean> {
  const hash = await storage.getItem(KEY_HASH);
  return !!hash;
}
