import { markIntentionalSignOut } from '@/lib/auth';
import { clearAppCache } from '@/lib/clearAppCache';
import { clearLocalSecurityForUser } from '@/lib/lockSecurity';
import { supabase } from '@/lib/supabase';

/**
 * Hesabı kalıcı olarak siler (geri alınamaz). `delete_user_account` RPC auth.users
 * kaydını siler, FK cascade ile tüm kullanıcı verisi temizlenir. Ardından session
 * temizlenir → root guard Welcome'a yönlendirir.
 */
export async function deleteAccount(): Promise<void> {
  // userId'yi SİLMEDEN ÖNCE yakala: silme sonrası oturum kapanacağı için yerel
  // temizlikte kullanılacak kimlik kaybolur (bkz. lib/lockSecurity.ts).
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const { error } = await supabase.rpc('delete_user_account');
  if (error) {
    throw error;
  }

  // Sunucu tarafı silindi → bu kullanıcının YEREL güvenlik artıkları da gitmeli:
  // PIN (v1+v2), kilit tercihi, biyometri tercihi, brute-force sayacı. Eskiden yalnızca
  // React Query cache'i temizleniyor, SecureStore kayıtları cihazda kalıyordu.
  // BAŞKA kullanıcıların kayıtlarına dokunulmaz (key'ler userId ile ayrılmıştır).
  if (userId) {
    try {
      await clearLocalSecurityForUser(userId);
    } catch (e) {
      if (__DEV__) console.warn('[FynPad/account] local security cleanup failed:', e);
    }
  }
  // User artık yok — kalan session'ı temizle (onAuthStateChange guard'ı tetikler).
  // Kasıtlı çıkış: "oturum süresi doldu" bildirimi tetiklenmesin.
  markIntentionalSignOut();
  await supabase.auth.signOut();
  // Hesap silindi ama cache'teki verisi diskte kalırdı → sonraki kullanıcıya sızabilirdi.
  // Temizlik başarısız olsa bile hesap SİLİNMİŞ durumda; akışı bloklamak kullanıcıyı
  // ölü bir oturumda bırakır. Hata görünür kılınır, akış devam eder.
  try {
    await clearAppCache();
  } catch (e) {
    if (__DEV__) console.warn('[FynPad/account] cache clear after deletion failed:', e);
  }
}
