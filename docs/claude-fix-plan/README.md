# FynPad Production Düzeltme Paketi

Bu klasör, Expo SDK 54 tabanlı FynPad uygulamasında statik analiz ve Android production bundle kontrolü sırasında tespit edilen kod/altyapı sorunlarını düzeltmek için hazırlanmıştır. Belgeler Claude'a sırayla verilmek üzere yazılmıştır.

## Değişmez proje kuralları

- Proje Expo SDK 54 kullanır: `package.json` içindeki `expo` sürümü `~54.0.0` ailesindedir.
- Kod değiştirmeden önce sürümlü resmi dokümantasyonu kontrol et: <https://docs.expo.dev/versions/v54.0.0/>
- SDK major sürümünü yükseltme. Bir SDK yükseltmesi yapılacaksa `AGENTS.md` içindeki doküman bağlantısını da güncelle.
- Mevcut kullanıcı değişikliklerini koru; ilgisiz dosyaları geri alma.
- Yeni migration ekle; production'da daha önce çalışmış migration dosyalarını geriye dönük değiştirme.
- Her görevden sonra en az `npm run lint`, `npx tsc --noEmit`, `npx expo install --check` ve Android export çalıştır.
- Gerçek secret değerlerini repoya yazma. Supabase anon key istemci tarafında kullanılabilir; service-role key kullanılamaz.

## Uygulama sırası

1. [01-supabase-security.md](./01-supabase-security.md) — yayın engelleyici SQL/RPC yetkilendirme açıkları.
2. [02-currency-accounting.md](./02-currency-accounting.md) — yanlış finansal toplamlar ve bütçe hesapları.
3. [03-biometric-pin-security.md](./03-biometric-pin-security.md) — PIN, SecureStore ve biyometri güvenilirliği.
4. [04-offline-cache-auth.md](./04-offline-cache-auth.md) — offline mutation, cache ve auth dayanıklılığı.
5. [05-validation-recurring-release.md](./05-validation-recurring-release.md) — form doğrulama, recurring sayaç, Expo patch ve testler.

Bu sıra önemlidir. İlk iki belge tamamlanmadan Play Store production yayını yapılmamalıdır.

## Önceden düzeltilmiş ve korunması gereken davranışlar

Aşağıdaki düzeltmeleri geri alma:

- Query key'leri kullanıcı ID'si içeriyor.
- Çıkışta React Query query/mutation cache'i ve persisted client temizleniyor.
- Transaction optimistic cache işlemleri aktif kullanıcı scope'una bağlı.
- Günlük bildirim `quick-add`, abonelik bildirimi `subscriptions` ekranına yönleniyor.
- Bildirim içeriği `data.type` taşıyor.
- Telefon dikey, tablet serbest orientation politikası uygulanıyor.

## Tamamlanma tanımı

Paket tamamlanmış sayılabilmesi için:

- Bütün P0/P1 maddeleri uygulanmış olmalı.
- SQL fonksiyon yetkileri production Supabase üzerinde doğrulanmış olmalı.
- Farklı para birimleri hiçbir ekranda ham olarak birbirine eklenmemeli.
- Kritik SecureStore yazmaları başarısızken UI başarı göstermemeli.
- Offline profil mutation'ı uygulama yeniden başladıktan sonra resume olmalı.
- Lint, TypeScript, dependency check ve Android export temiz geçmeli.
- Eklenen birim testleri başarıyla çalışmalı.

