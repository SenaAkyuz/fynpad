import AsyncStorage from '@react-native-async-storage/async-storage';

import { asyncStoragePersister, queryClient } from '@/lib/queryClient';

/**
 * Oturum kapanışında TÜM kullanıcı verisini cache'ten siler.
 *
 * Neden gerekli: persist cache anahtarı (`FYNPAD_QUERY_CACHE`) tüm kullanıcılar için ortak ve
 * gcTime 7 gün. Temizlenmezse A çıkıp B girdiğinde B, A'nın işlem/hedef/bütçe/abonelik verisini
 * görebiliyordu — özellikle offline'da veya cache henüz stale olmadan (networkMode 'offlineFirst'
 * cache'i anında gösteriyor). Query key'lerine userId eklenmesi (savunma katmanı) tek başına
 * diskteki veriyi silmediği için bu temizlik ZORUNLU.
 *
 * `queryClient.clear()` hem query cache'i hem MUTATION cache'ini boşaltır → bekleyen offline
 * mutation kuyruğu da gider (aksi halde B'nin oturumunda A'nın kuyruğu resume olurdu).
 *
 * Not: signOut/deleteAccount'tan SONRA çağrılmalı — önce çağrılırsa aradaki refetch'ler
 * cache'i yeniden doldurabilir.
 */
/** queryClient.ts'teki persister anahtarıyla AYNI olmalı — fallback silme bunu kullanır. */
export const QUERY_CACHE_STORAGE_KEY = 'FYNPAD_QUERY_CACHE';

/**
 * Disk temizliğinin başarısız olduğu, yani hassas finans verisinin cihazda KALDIĞI durum.
 * Sessizce yutulmaz: çağıran taraf loglayabilir/telemetriye verebilir. Hiçbir kullanıcı
 * verisi (tutar, kategori, e-posta) taşımaz — yalnızca başarısızlık bilgisi.
 */
export class CacheClearError extends Error {
  constructor(readonly cause: unknown) {
    super('Persisted query cache could not be removed');
    this.name = 'CacheClearError';
  }
}

export async function clearAppCache(): Promise<void> {
  // Bellek her koşulda temizlenir; bu senkron ve başarısız olamaz.
  queryClient.clear();

  // Disk temizliği: persister → (başarısızsa) doğrudan AsyncStorage key silme.
  // Tek deneme yetmiyordu; geçici bir I/O hatası hassas veriyi diskte bırakıyordu.
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await asyncStoragePersister.removeClient();
      return;
    } catch (e) {
      lastError = e;
    }
  }

  // Fallback: persister API'si çalışmıyorsa anahtarı doğrudan kaldır.
  try {
    await AsyncStorage.removeItem(QUERY_CACHE_STORAGE_KEY);
    return;
  } catch (e) {
    lastError = e;
  }

  // Buraya gelindiyse veri diskte KALDI. Çıkış akışı bloklanmaz (kullanıcı yine de
  // çıkabilmeli) ama durum görünür kılınır.
  if (__DEV__) {
    console.warn('[FynPad/cache] persisted cache could not be cleared:', lastError);
  }
  throw new CacheClearError(lastError);
}
