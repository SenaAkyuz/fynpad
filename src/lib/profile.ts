import { supabase } from '@/lib/supabase';
import type { Currency } from '@/types';
import type { Locale } from '@/stores/useAppStore';

/**
 * Profil güncelleme servisi.
 *
 * Neden hook'un içinde değil: offline'da paused olan mutation'lar AsyncStorage'a yazılır,
 * fakat `mutationFn` serialize EDİLEMEZ. Uygulama yeniden başlatıldığında fonksiyon
 * kaybolduğu için mutation resume edilemez — `offlineMutations.ts` her mutationKey için
 * fn'i yeniden kaydeder. `['updateProfile']` bu kayıt listesinde yoktu, dolayısıyla
 * çevrimdışı yapılan profil değişikliği restart sonrası sessizce kayboluyordu.
 * Fonksiyonun test edilebilir ve hook'tan bağımsız olması için buraya taşındı.
 */
export type ProfilePatch = Partial<{
  fullName: string;
  defaultCurrency: Currency;
  locale: Locale;
}>;

/**
 * Persist edilen mutation payload'ı. `ownerUserId` ZORUNLU: bekleyen bir mutation
 * restore edildiğinde onu ÜRETEN kullanıcının hâlâ aktif oturum olduğunu doğrulamak
 * için kullanılır (bkz. assertOwner).
 */
export type UpdateProfileInput = {
  ownerUserId: string;
  patch: ProfilePatch;
};

/**
 * Bekleyen mutation'ın sahibi hâlâ aktif oturum mu?
 *
 * Çıkışta cache temizleniyor (clearAppCache) ama bu tek başına yeterli bir garanti değil:
 * beklenmeyen crash veya sign-out yarışında diskte kalmış bir mutation, BAŞKA kullanıcının
 * oturumunda resume olabilir ve onun verisini değiştirebilir. Bu kontrol o senaryoyu keser.
 */
export async function assertOwner(ownerUserId: string): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const currentUserId = data.user?.id;
  if (!currentUserId || currentUserId !== ownerUserId) {
    // Kontrollü iptal: DB'ye HİÇBİR ŞEY gönderilmez.
    throw new Error('MUTATION_OWNER_MISMATCH');
  }
}

export async function updateProfile(input: UpdateProfileInput): Promise<void> {
  await assertOwner(input.ownerUserId);

  const dbPatch: Record<string, unknown> = {};
  if (input.patch.fullName !== undefined) dbPatch.full_name = input.patch.fullName;
  if (input.patch.defaultCurrency !== undefined) {
    dbPatch.default_currency = input.patch.defaultCurrency;
  }
  if (input.patch.locale !== undefined) dbPatch.locale = input.patch.locale;

  // Hiç alan yoksa gereksiz DB çağrısı yapma.
  if (Object.keys(dbPatch).length === 0) return;

  const { error } = await supabase.from('profiles').update(dbPatch).eq('id', input.ownerUserId);
  if (error) {
    throw error;
  }
}
