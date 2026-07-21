import { SegmentedControl, type SegmentOption } from '@/components/ui/SegmentedControl';
import type { Currency } from '@/types';

export type CurrencyScopeSelectorProps = {
  /** Kayıtlarda gerçekten bulunan para birimleri (bkz. lib/currencyScope → distinctCurrencies). */
  currencies: Currency[];
  value: Currency;
  onChange: (currency: Currency) => void;
};

/**
 * Raporlama para birimi seçicisi (FynPad para birimi modeli, FIX 2). Dashboard / Analiz /
 * Abonelikler özetlerinin hangi para birimine göre hesaplandığını değiştirir.
 *
 * KOŞULLU: yalnızca kullanıcının **birden fazla** para biriminde kaydı varsa görünür — tek
 * para birimi kullanan çoğunluğun deneyimi hiç değişmez (önceki "3 buton kalabalık" kararı
 * iptal edilmez, koşullandırılır). Yalnızca gerçekten var olan para birimleri listelenir.
 * Var olan `SegmentedControl` yeniden kullanılır; yeni bir seçim pattern'i getirilmez.
 */
export function CurrencyScopeSelector({ currencies, value, onChange }: CurrencyScopeSelectorProps) {
  if (currencies.length < 2) {
    return null;
  }

  const options: SegmentOption[] = currencies.map((c) => ({ value: c, label: c }));

  return (
    <SegmentedControl
      options={options}
      value={value}
      onChange={(v) => onChange(v as Currency)}
    />
  );
}
