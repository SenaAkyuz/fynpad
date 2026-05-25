import * as SecureStore from 'expo-secure-store';

/**
 * SecureStore üzerine ince bir sarmalayıcı. Tüm anahtarlar `fynpad.` ile prefixlenir.
 * SecureStore anahtarları yalnızca [A-Za-z0-9._-] içerebilir — prefix buna uygundur.
 */
const PREFIX = 'fynpad.';

const key = (name: string) => `${PREFIX}${name}`;

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
