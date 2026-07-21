# 04 — Offline Mutation, Cache ve Auth Dayanıklılığı

## Öncelik

P2 — Önceki hesaplar arası cache problemi büyük ölçüde düzeltilmiş; kalan offline profil ve hata dayanıklılığı tamamlanmalı.

## Korunması gereken mevcut düzeltmeler

- Query key'leri user ID içeriyor.
- Prefix key'ler invalidation için korunuyor.
- Transaction optimistic güncellemeleri user-scoped.
- `queryClient.clear()` çıkışta mutation cache'ini de temizliyor.
- Persisted React Query client diskten kaldırılıyor.

## Sorun 1 — `updateProfile` restore edilemiyor

`src/hooks/useProfile.ts` mutation key olarak `['updateProfile']` kullanıyor. Fakat `src/lib/offlineMutations.ts` bu key için `setMutationDefaults` kaydetmiyor.

Offline mutation uygulama kapanıp yeniden açıldığında function serialize edilmediği için resume edilemeyebilir.

### İstenen düzeltme

- Profile update DB fonksiyonunu hook içinden çıkarıp `src/lib/profile.ts` benzeri test edilebilir bir service'e taşı.
- `offlineMutations.ts` içinde `['updateProfile']` default mutation function ekle.
- Success sonrası yalnızca doğru kullanıcının `['profile', userId]` query'sini invalidate et.
- Mutation payload kullanıcı ID içermeli veya resume sırasında bekleyen mutation'ın sahibi doğrulanmalı.
- Başka bir kullanıcı session'ında eski kullanıcının mutation'ı çalıştırılmamalı.

## Sorun 2 — Persisted mutation kullanıcı sahipliği

Çıkışta cache temizlenmesi iyi bir savunmadır, fakat mutation payload'ları kendi kullanıcı ID'sini taşımıyor. Beklenmeyen crash/sign-out yarışlarında restore edilen mutation aktif session kullanıcısıyla çalışabilir.

### İstenen sertleştirme

- Persist edilen bütün mutation variable'larına `ownerUserId` eklemeyi değerlendir.
- Mutation function başında `ownerUserId === currentSession.user.id` doğrula.
- Eşleşmiyorsa mutation'ı DB'ye göndermeden kontrollü hata/iptal ile düşür.
- Create işlemlerinde DB `user_id` aktif session'dan alınsa bile owner doğrulaması yap.

## Sorun 3 — Cache temizleme hatası görünmez

`clearAppCache` persisted client removal hatasını yutuyor. User-scoped query key'ler cross-account gösterimi azaltıyor; yine de hassas finans verisinin diskte kaldığı durum loglanmalı ve yeniden denenmelidir.

### İstenen düzeltme

- Release'te hassas veri içermeyen bir hata telemetrisi veya retry stratejisi ekle.
- `removeClient` başarısızsa doğrudan AsyncStorage key removal fallback değerlendir.
- Cache format buster'ı değiştirirken eski key'lerin temizlendiğinden emin ol.

## Sorun 4 — Auth initialization hata dayanıklılığı

Root layout ilk URL ve Supabase session yüklemesini tek async blokta yapıyor. Beklenmeyen bir exception `setInitialized` çağrısını engellerse splash sonsuza kadar kalabilir.

### İstenen düzeltme

- Initial auth bootstrap'i `try/catch/finally` içine al.
- `setInitialized` kontrollü biçimde `finally` içinde çalışsın.
- OAuth callback hatası kullanıcıya çevrilmiş hata versin ve login'e dönsün.
- Session storage okunamazsa uygulama güvenli biçimde signed-out başlasın.
- Component unmount sonrası store/navigation güncellemesi yapılmasın.

## Sorun 5 — Profile form başlangıç yarışı

`profile-edit.tsx` local state'i ilk render'daki `profile?.fullName ?? ''` ile başlatıyor. Profile query o anda yüklenmemişse daha sonra gelen isim local state'e aktarılmıyor ve kullanıcı yanlışlıkla boş isim kaydedebilir.

### İstenen düzeltme

- Profile yüklenmeden formu render/save etme; veya
- Profile ilk kez geldiğinde form dirty değilse local state/reset uygula.
- Kullanıcı yazmaya başladıktan sonra background refetch input'u ezmemeli.

## Testler

- Offline profile update → force-stop → online restart → mutation resume.
- A hesabında offline mutation → çıkış → B hesabı → A mutation'ı B altında çalışmamalı.
- Persisted cache remove hatası senaryosunda B hiçbir A verisini görmemeli.
- Supabase session storage exception'ında splash takılı kalmamalı.
- Profile geç yüklenirken isim alanı doğru populate olmalı.
- Profile refetch, dirty formu ezmemeli.

## Kabul kriterleri

- Bütün persisted mutation key'lerinin restart sonrası çalışan default function'ı vardır.
- Mutationlar kullanıcı sahibine bağlıdır.
- Auth bootstrap hiçbir exception'da sonsuz splash üretmez.
- Profile edit veri yükleme yarışı yoktur.

