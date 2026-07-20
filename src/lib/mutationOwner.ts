import { supabase } from '@/lib/supabase';

/**
 * Persist edilen (offline kuyruğa giren) mutation'ların SAHİPLİK katmanı.
 *
 * Sorun: paused mutation'lar tek bir ortak anahtarda (FYNPAD_QUERY_CACHE) 7 gün diskte durur.
 * Çıkışta cache temizleniyor, ama beklenmedik bir kapanma/crash veya sign-out yarışında kuyruk
 * diskte kalabilir. Restore edilen mutation ÇALIŞMA ANINDAKİ oturumla insert yapıyordu
 * → A'nın çevrimdışı eklediği işlem B'nin hesabına yazılabiliyordu.
 *
 * Çözüm: her mutation payload'ı, oluşturulduğu andaki `ownerUserId`'yi taşır ve çalışmadan
 * ÖNCE aktif oturumla karşılaştırılır. Uyuşmazlıkta DB'ye hiçbir şey gönderilmez.
 */

/** Sahiplik bilgisi taşıyan mutation payload'ı. */
export type Owned<T> = T & { ownerUserId: string };

/** Sahiplik uyuşmazlığında fırlatılan hata mesajı (retry edilmemeli — kuyruktan düşmeli). */
export const OWNER_MISMATCH = 'MUTATION_OWNER_MISMATCH';

/**
 * Bekleyen mutation'ın sahibi hâlâ aktif oturum mu?
 * Değilse kontrollü iptal: DB'ye HİÇBİR ŞEY gönderilmez.
 */
export async function assertOwner(ownerUserId: string): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const currentUserId = data.user?.id;
  if (!currentUserId || currentUserId !== ownerUserId) {
    throw new Error(OWNER_MISMATCH);
  }
}

/**
 * Bir mutation fonksiyonunu sahiplik kontrolüyle sarmalar: önce `assertOwner`, sonra
 * `ownerUserId` payload'dan ayıklanıp asıl servis fonksiyonuna geçilir. Servis
 * (lib/transactions.ts vb.) imzaları DEĞİŞMEZ.
 */
export function withOwner<TInput, TResult>(
  fn: (input: TInput) => Promise<TResult>
): (vars: Owned<TInput>) => Promise<TResult> {
  return async (vars: Owned<TInput>) => {
    await assertOwner(vars.ownerUserId);
    const { ownerUserId: _ownerUserId, ...input } = vars;
    return fn(input as TInput);
  };
}
