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
export async function clearAppCache(): Promise<void> {
  queryClient.clear();
  try {
    await asyncStoragePersister.removeClient();
  } catch {
    // Disk temizliği başarısız olsa bile bellek temizlendi; çıkış akışını bloklama.
  }
}
