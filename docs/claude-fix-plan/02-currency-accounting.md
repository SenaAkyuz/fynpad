# 02 — Para Birimi ve Finansal Hesaplama Düzeltmeleri

## Öncelik

P1 — Finansal sonuçlar yanlış olduğu için production öncesi zorunlu.

## Kök neden

Uygulama TRY, USD ve EUR işlem girişine izin veriyor. Buna rağmen dashboard ve analytics fonksiyonları çoğu yerde yalnızca `amount` topluyor, `currency` alanını dikkate almıyor. Sonuç daha sonra profilin varsayılan para birimiyle formatlanıyor.

Örnek yanlış davranış:

- `1000 TRY` gelir
- `100 USD` gider
- UI sonucu `900 TRY` gösterebilir.

Bu matematik geçersizdir.

## Etkilenen alanlar

- `src/lib/transactions.ts`
  - `getTotals`
  - `getBreakdown`
- `src/lib/analytics.ts`
  - `cashFlowSeries`
  - `netSavings`
  - `avgDailySpend`
  - `topCategories`
- `src/lib/budgets.ts`
  - `computeBudgetStatus`
- `src/app/(tabs)/dashboard.tsx`
- `src/app/(tabs)/analytics.tsx`
- Dashboard ve analytics kart/chart componentleri.
- Insight kurallarında kategori harcama ortalamaları.

## Ürün kararı

Kur servisi ve tarihsel FX altyapısı olmadığı için bu aşamada otomatik kur dönüşümü ekleme. MVP için önerilen politika:

**Bütün ana dashboard/analytics/bütçe hesaplarını profilin varsayılan para birimine filtrele; diğer para birimlerindeki işlemleri ayrı göster veya hesap dışı bırakıldığını açıkça belirt.**

Alternatif olarak metrikleri para birimi başına ayrı kart/seri olarak gösterebilirsin. Ham tutarları asla birleştirme.

Claude uygulamaya başlamadan önce tek bir yaklaşım seçmeli ve tüm ekranlarda tutarlı uygulamalıdır.

## Önerilen veri modeli/API tasarımı

### Seçenek A — Varsayılan para birimine filtreleme

- `getTotals(transactions, currency)` yalnızca `tx.currency === currency` kayıtlarını toplar.
- `getBreakdown(transactions, categories, currency)` aynı filtreyi uygular.
- Analytics fonksiyonlarının tamamına `currency` parametresi eklenir.
- Dashboard/Analytics profil currency değerini hesap fonksiyonlarına geçirir.
- Farklı para birimindeki işlem listede kendi currency'siyle görünmeye devam eder.
- UI'da “Özetler varsayılan para birimine göre hesaplanır” açıklaması eklenir.

### Seçenek B — Para birimi başına gruplama

- Fonksiyonlar `Map<Currency, Totals>` veya typed record döndürür.
- Her currency için ayrı toplam/kart/chart render edilir.
- Bütçeler kendi currency'sindeki işlemlerle karşılaştırılır.

## Bütçe için zorunlu düzeltme

`computeBudgetStatus` yalnızca şu işlemleri toplamalı:

- `tx.kind === 'expense'`
- `tx.categoryId === budget.categoryId`
- Aynı takvim ayı
- `tx.currency === budget.currency`

Bu son şart mutlaka DB/UI testleriyle korunmalı.

## Insight düzeltmeleri

`sumExpense` ve “önceki üç ay ortalaması” kuralları currency bilmeden çalışmamalı. Aynı kategori içinde farklı para birimleri bulunabiliyorsa:

- Profil currency'sine filtrele; veya
- Currency başına ayrı insight üret.

Insight metni hangi currency üzerinden hesaplandığını açıkça göstermeli.

## Form davranışı

MVP tek-currency seçilirse:

- Quick add, transaction edit, recurring, subscription ve budget ekranlarında currency seçimlerini profil default currency'ye kilitle veya kaldır.
- Profil currency değiştiğinde eski işlemler otomatik dönüştürülmemeli.
- Eski işlemlerin currency'si korunmalı.
- Kullanıcıya yeni varsayılanın yalnızca yeni kayıtları/özet filtresini nasıl etkilediği anlatılmalı.

## Birim testleri

En az şu testleri ekle:

1. TRY toplamına USD/EUR dahil edilmez.
2. USD toplamına TRY dahil edilmez.
3. Aynı kategoride 500 TRY + 50 USD, TRY bütçede yalnızca 500 harcanmış sayılır.
4. Cash-flow bucket'ları currency karıştırmaz.
5. Top categories currency karıştırmaz.
6. Savings rate yalnızca aynı currency gelir/gider üzerinden hesaplanır.
7. Tek currency kullanılan mevcut kullanıcı davranışı değişmez.
8. Sıfır işlem ve sıfır gelir durumunda `NaN`/`Infinity` oluşmaz.

## Kabul kriterleri

- Uygulamanın hiçbir finansal özeti farklı currency ham tutarlarını toplamaz.
- UI'daki currency etiketi hesaplamada kullanılan currency ile aynıdır.
- Bütçe ve insight hesapları currency-safe'tir.
- Transaction satırları kendi gerçek currency'sini göstermeye devam eder.
- Davranış birim testleriyle korunur.

