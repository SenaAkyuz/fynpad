import 'react-native-get-random-values';
import { CryptoDigestAlgorithm, digest } from 'expo-crypto';

/**
 * Supabase PKCE (flowType:'pkce') code_challenge üretmek için `crypto.subtle.digest('SHA-256')`
 * ister. Hermes'te `crypto.subtle` yoktur → `react-native-get-random-values` yalnızca
 * `crypto.getRandomValues` ekler. Eksik olan `subtle.digest`'i `expo-crypto` ile dolduruyoruz;
 * böylece code_challenge_method `plain` yerine `s256` olur ("WebCrypto not supported" uyarısı gider).
 *
 * Yalnızca `subtle` hiç yoksa eklenir (varsa native/gerçek olana dokunmaz). SHA-256 dışındaki
 * algoritmalar için reject eder — Supabase yalnızca SHA-256 kullanır.
 */
const globalCrypto = (globalThis as { crypto?: { subtle?: unknown } }).crypto;

if (globalCrypto && typeof globalCrypto.subtle === 'undefined') {
  (globalCrypto as { subtle: unknown }).subtle = {
    digest: (algorithm: string | { name: string }, data: BufferSource): Promise<ArrayBuffer> => {
      const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
      if (name !== 'SHA-256') {
        return Promise.reject(new Error(`Unsupported digest algorithm: ${name}`));
      }
      return digest(CryptoDigestAlgorithm.SHA256, data);
    },
  };
}
