# 05 — Validation, Recurring Sayaç, Bağımlılık ve Testler

## Öncelik

P2/P3 — P0/P1 düzeltmelerinden sonra uygulanmalı.

## 1. Recurring `created_count` doğruluğu

`supabase/migrations/0004_fix_recurring_dedupe.sql` içinde insert şu mantığı kullanıyor:

- Önce exists kontrolü.
- `INSERT ... ON CONFLICT DO NOTHING`.
- Ardından koşulsuz `created_count := created_count + 1`.

Eşzamanlı iki çağrıda ikinci insert conflict nedeniyle satır eklemese bile sayaç artabilir.

### Düzeltme

Yeni migration içinde fonksiyonu yeniden tanımla:

- `INSERT ... ON CONFLICT DO NOTHING RETURNING ...` kullan; veya
- Insert sonrası `GET DIAGNOSTICS affected_rows = ROW_COUNT` al.
- `created_count` yalnızca `affected_rows = 1` ise artsın.
- Exists kontrolü optimizasyon olarak kalabilir fakat doğruluğun garantisi unique index + row count olmalı.

Ek olarak hedef tarih güvenlik sınırı 01 belgesiyle uyumlu olmalı.

## 2. Form tarih doğrulamaları

`src/lib/validation.ts` içinde tarih alanları çoğunlukla yalnızca string olarak kabul ediliyor.

Ortak bir ISO date schema oluştur:

- Tam `YYYY-MM-DD` formatı.
- Gerçek takvim tarihi; `2026-02-31` kabul edilmemeli.
- Recurring ve subscription için `endDate >= startDate`.
- Ürün kuralına göre goal target date geçmişte olamamalı.
- Custom range için `end >= start`.
- Hatalar i18n key olmalı.

DB constraint hatalarını ham/generic göstermek yerine kullanıcı dostu alan hatasına dönüştür.

## 3. Şifre değiştirme yeniden doğrulaması

`src/app/set-password.tsx`, açık session ile doğrudan `updateUser({password})` çağırıyor.

Önerilen güvenli akış:

- E-posta/şifre hesabında mevcut şifreyi tekrar doğrula; veya
- E-posta OTP ile re-authentication yap.
- Google-only hesaba ilk şifre ekleme akışı ayrı değerlendirilsin.
- Hassas işlemden önce yakın zamanda doğrulanmış session şartı koy.
- Başarılı şifre değişiminden sonra diğer sessionların kapatılması ürün kararı olarak değerlendirilsin.

## 4. Expo patch uyumu

`npx expo install --check` sonucu:

- Kurulu: `expo@54.0.35`
- Beklenen: `~54.0.36`

SDK major sürümünü değiştirmeden Expo'nun önerdiği patch sürümüne eşitle. `npx expo install expo@~54.0.36` veya resmi SDK 54 dokümantasyonunun önerdiği komutu kullan. Ardından lockfile güncellenmeli.

## 5. Test altyapısı

Projede otomatik test scripti bulunmuyor. En azından saf fonksiyonlar ve güvenlik helper'ları için test altyapısı ekle.

Öncelikli test alanları:

- Currency-safe totals, breakdown, budgets, analytics.
- `getPeriodRange` ve inclusive tarih sınırları.
- Ayın 31'i, kısa ay, leap year ve 29 Şubat recurring hesapları.
- Concurrent recurring insert sayaç doğruluğu mümkünse SQL integration test.
- PIN hash/set/verify/clear ve storage failure.
- Kullanıcı bazlı cache/mutation ownership.
- Notification `data.type` routing helper'ı.
- Validation: sahte tarih, end-before-start, invalid UUID, negatif tutar.

## 6. Release doğrulamaları

Kod değişiklikleri bittiğinde çalıştır:

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit
npx.cmd expo install --check
npx.cmd expo export --platform android --output-dir C:\tmp\fynpad-release-audit
```

Ardından gerçek native doğrulama:

```powershell
npx.cmd eas-cli@latest build -p android --profile production-test-apk
npx.cmd eas-cli@latest build -p android --profile production
```

Production build öncesi doğrula:

- EAS `production` environment içinde `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY` var.
- AAB app bundle üretiyor.
- Remote version code artıyor.
- Release minify/R8 ile uygulama açılıyor.
- AdMob release initialization crash üretmiyor.
- Google OAuth production redirect `fynpad://auth/callback` izinli.
- Supabase migration 0011+ production'a uygulanmış.

## Kabul kriterleri

- Recurring RPC gerçek insert sayısını döndürür.
- Geçersiz tarih kombinasyonları submit edilmeden alan seviyesinde reddedilir.
- Şifre değişimi yeniden doğrulama gerektirir.
- Expo dependency check temizdir.
- Lint, TypeScript, unit test ve Android export temiz geçer.
- Production APK internal cihaz testinde açılır ve temel native özellikler çalışır.

