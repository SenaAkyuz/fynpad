import type { Currency, Transaction } from '@/types';

/**
 * Para birimi güvenliği (docs/claude-fix-plan/02).
 *
 * Uygulama TRY/USD/EUR işlem girişine izin veriyor ama özet hesapları `currency`'yi
 * yok sayıp ham `amount` topluyordu: 1000 TRY gelir + 100 USD gider → "900 TRY".
 * Bu matematik geçersiz.
 *
 * Kur servisi ve tarihsel FX altyapısı olmadığı için dönüşüm YAPILMAZ. Seçilen politika:
 * bütün özet/analiz/bütçe hesapları profilin varsayılan para birimine FİLTRELENİR.
 * Diğer para birimlerindeki işlemler silinmez, değiştirilmez ve listede kendi
 * para birimiyle görünmeye devam eder — yalnızca toplamların dışında kalır.
 *
 * Bu yüzden hesaplama fonksiyonlarında `currency` parametresi ZORUNLUDUR: opsiyonel
 * olsaydı unutulan bir çağrı sessizce eski yanlış davranışa düşerdi.
 */
export function filterByCurrency(
  transactions: Transaction[],
  currency: Currency
): Transaction[] {
  return transactions.filter((tx) => tx.currency === currency);
}

/**
 * Verilen işlemler arasında özet dışında kalan (farklı para birimli) kayıt var mı?
 * UI bunu kullanıp "özetler yalnızca X cinsindendir" açıklamasını yalnızca gerçekten
 * gerektiğinde gösterir.
 */
export function hasOtherCurrencies(
  transactions: Transaction[],
  currency: Currency
): boolean {
  return transactions.some((tx) => tx.currency !== currency);
}
