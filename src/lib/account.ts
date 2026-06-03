import { markIntentionalSignOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

/**
 * Hesabı kalıcı olarak siler (geri alınamaz). `delete_user_account` RPC auth.users
 * kaydını siler, FK cascade ile tüm kullanıcı verisi temizlenir. Ardından session
 * temizlenir → root guard Welcome'a yönlendirir.
 */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_user_account');
  if (error) {
    throw error;
  }
  // User artık yok — kalan session'ı temizle (onAuthStateChange guard'ı tetikler).
  // Kasıtlı çıkış: "oturum süresi doldu" bildirimi tetiklenmesin.
  markIntentionalSignOut();
  await supabase.auth.signOut();
}
