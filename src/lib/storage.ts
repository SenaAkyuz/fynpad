import * as SecureStore from 'expo-secure-store';

/**
 * SecureStore üzerine ince bir sarmalayıcı. Tüm anahtarlar `fynpad.` ile prefixlenir.
 * SecureStore anahtarları yalnızca [A-Za-z0-9._-] içerebilir — prefix buna uygundur.
 *
 * İKİ KATMAN:
 *  • `storage`       — hataları YUTAR. Kaybı önemsiz tercihler için.
 *  • `secureStorage` — hataları FIRLATIR. GÜVENLİK kayıtları için (PIN, kilit, lockout).
 *
 * Neden ayrım: tek bir yutan wrapper vardı. Salt yazılıp hash yazılamadığında veya
 * `lockEnabled` diske hiç ulaşmadığında UI "PIN kuruldu" diyordu; uygulama yeniden
 * başlayınca kilit kayboluyor ya da PIN doğrulanamıyordu. Güvenlik özelliği
 * persistence başarısızken BAŞARI GÖSTERMEMELİ.
 */
const PREFIX = 'fynpad.';

const key = (name: string) => `${PREFIX}${name}`;

/** SecureStore erişimi başarısız olduğunda fırlatılır (çağıran taraf kullanıcıya gösterir). */
export class SecureStorageError extends Error {
  constructor(
    readonly operation: 'read' | 'write' | 'delete' | 'verify',
    readonly cause?: unknown
  ) {
    super(`SecureStore ${operation} failed`);
    this.name = 'SecureStorageError';
  }
}

/** Hataları yutan sürüm — yalnızca kaybı tolere edilebilir veriler için. */
export const storage = {
  async getItem(name: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key(name));
    } catch {
      return null;
    }
  },
  async setItem(name: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key(name), value);
    } catch {
      // sessizce yut: persistence kritik değil, app çalışmaya devam etmeli
    }
  },
  async removeItem(name: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key(name));
    } catch {
      // no-op
    }
  },
};

/**
 * Hataları fırlatan sürüm — güvenlik kayıtları için.
 *
 * `setItem` yazdıktan sonra GERİ OKUYUP doğrular: SecureStore bazı cihazlarda hatasız
 * dönüp veriyi kalıcılaştırmayabiliyor. Doğrulama olmadan "yazdım" demek güvenli değil.
 */
export const secureStorage = {
  async getItem(name: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key(name));
    } catch (e) {
      throw new SecureStorageError('read', e);
    }
  },

  async setItem(name: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key(name), value);
    } catch (e) {
      throw new SecureStorageError('write', e);
    }
    // Kalıcılık doğrulaması — sessiz veri kaybını yakalar.
    let readBack: string | null;
    try {
      readBack = await SecureStore.getItemAsync(key(name));
    } catch (e) {
      throw new SecureStorageError('verify', e);
    }
    if (readBack !== value) {
      throw new SecureStorageError('verify');
    }
  },

  async removeItem(name: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key(name));
    } catch (e) {
      throw new SecureStorageError('delete', e);
    }
  },
};
