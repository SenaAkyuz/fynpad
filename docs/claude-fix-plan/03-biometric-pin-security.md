# 03 — Biyometri, PIN ve SecureStore Güvenilirliği

## Öncelik

P1/P2 — Veri kaybı değil, fakat finans uygulamasının güvenlik özelliği yanlış başarı gösterebilir veya yerel artıkları temizlemeyebilir.

## Mevcut doğru davranışlar

Bunları koru:

- PIN tam 6 rakam.
- PIN düz metin tutulmuyor; random salt + SHA-256 hash kullanılıyor.
- PIN/lock anahtarları kullanıcı UUID'siyle ayrılıyor.
- Biyometri enable edilirken önce sistem doğrulaması isteniyor.
- Device passcode fallback kapalı; uygulamanın PIN'i fallback.
- Background/inactive durumunda kilit devreye giriyor.
- Soğuk açılışta lock enabled kullanıcı kilitli başlıyor.
- iOS Face ID permission config mevcut.

## Sorun 1 — Kritik SecureStore yazmaları sessizce yutuluyor

`src/lib/storage.ts` bütün get/set/delete hatalarını yutuyor. Bu nedenle:

- Salt yazılıp hash yazılamayabilir.
- UI PIN başarıyla kuruldu sanabilir.
- `lockEnabled` bellekte true olup SecureStore'da yazılmamış olabilir.
- Uygulama yeniden başlayınca lock kaybolabilir veya PIN doğrulanamaz.

### İstenen düzeltme

- Genel storage wrapper kritik yazmalarda hata fırlatabilsin.
- `setPin` atomik davranmalı. Tercihen salt ve hash tek JSON kaydında saklansın.
- Kayıttan sonra değer tekrar okunup doğrulansın.
- PIN setup yalnızca kalıcı kayıt doğrulandıktan sonra `done` aşamasına geçsin.
- Hata halinde kullanıcıya çevrilmiş hata gösterilsin; lock enabled yapılmasın.
- `setLockEnabled` ve `setBiometricEnabled` async ve await edilebilir tasarlanmalı; persistence başarı sonucu UI state güncellenmeli.

## Sorun 2 — “PIN'i unuttum” sırası

`LockScreen` şu anda önce `signOut`, sonra `clearPin` çağırıyor. `clearPin` aktif user ID'yi auth store'dan aldığı için sign-out sonrası no-op olabilir.

### İstenen düzeltme

- PIN helper fonksiyonlarını açık `userId` alabilecek şekilde tasarla: `clearPinForUser(userId)`.
- Forgot PIN başında user ID'yi yakala.
- Önce bu kullanıcıya ait PIN/hash/salt/lock/biometric kayıtlarını temizle.
- Sonra Supabase sign-out ve query cache temizliği yap.
- Her adımın hata davranışını belirle. Yerel cleanup başarısızsa kullanıcıya güvenli bir mesaj göster.

## Sorun 3 — Hesap silme yerel güvenlik kayıtları

`deleteAccount` server hesabını ve React Query cache'ini temizliyor; SecureStore'daki kullanıcıya özel lock kayıtları kalıyor.

### İstenen düzeltme

- Hesabı silmeden önce user ID'yi yakala.
- Server deletion başarılı olduktan sonra o ID'ye ait PIN ve lock kayıtlarını temizle.
- Temizlik helper'ı tek yerde olsun; sign-out, forgot PIN ve delete-account aynı güvenilir API'yi kullansın.
- Başka kullanıcıların SecureStore kayıtlarına dokunma.

## Sorun 4 — Kalıcı olmayan brute-force kilidi

`attempts` ve `lockoutUntil` yalnızca component state'inde. Force-stop kilit süresini sıfırlayabilir.

### İstenen düzeltme

- `attemptCount` ve `lockoutUntil` kullanıcı bazlı SecureStore kaydı olsun.
- Her yanlış PIN sonrası kalıcı güncelle.
- Başarılı PIN/biyometri sonrası sıfırla.
- Uygulama yeniden açıldığında kalan lockout süresini restore et.
- Cihaz saati geriye alınmasına karşı davranışı dokümante et; mümkünse monotonic zaman yoksa makul sınır uygula.
- Lockout sırasında biyometri politikasını açık belirle. Tavsiye: sistem biyometrisi kullanılabilir, PIN keypad kapalı kalabilir.

## Sorun 5 — Android weak biometric

Mevcut ayar `biometricsSecurityLevel: 'weak'`. Bu Class 2/2D yüz tanımayı kabul edebilir.

### Önerilen düzeltme

Finans uygulaması için `strong` tercih et:

- `canUseBiometric` en az `BIOMETRIC_STRONG` arasın.
- `authenticateAsync` Android'de `biometricsSecurityLevel: 'strong'` kullansın.
- Yalnızca weak biometric olan cihazlarda toggle unavailable/hint gösterilsin; PIN çalışmaya devam etsin.

Ürün kararıyla weak kalacaksa bu karar kod yorumunda ve risk dokümanında açık yazılmalı.

## Hata eşleme

`authenticateAsync` hata kodlarını ayır:

- `user_cancel`: sessiz iptal.
- `not_enrolled` / `not_available`: toggle'ı kapat ve ayarlara yönlendirme açıklaması göster.
- `lockout`: sistem biyometri kilidi mesajı.
- `authentication_failed`: kullanıcı tekrar deneyebilir.
- `system_cancel` / `app_cancel`: uygulama akışını bozma.

## Testler

- Storage set hatası simüle edildiğinde PIN kurulmuş görünmemeli.
- Yarım PIN kaydı oluşmamalı.
- Forgot PIN, sign-out öncesi doğru kullanıcının bütün lock kayıtlarını silmeli.
- Account deletion aynı temizliği yapmalı.
- Kullanıcı A'nın temizliği kullanıcı B kayıtlarına dokunmamalı.
- Force-stop sonrası lockout devam etmeli.
- Strong biometric olmayan cihazda PIN fallback çalışmalı.
- Face ID testi Expo Go ile yapılmamalı; development/production build kullanılmalı.

## Kabul kriterleri

- Persistence başarısızken güvenlik özelliği başarı göstermiyor.
- PIN/lock lifecycle kullanıcı bazlı ve deterministik.
- Forgot PIN ve account deletion yerel artıkları bırakmıyor.
- Brute-force lockout restart ile aşılamıyor.
- Biyometri güvenlik seviyesi ürün kararına uygun ve test edilmiş.

