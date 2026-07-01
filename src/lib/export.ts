import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { listCategories } from '@/lib/categories';
import { formatAbsoluteDate, formatCurrency } from '@/lib/format';
import { getTotals, listTransactions } from '@/lib/transactions';
import type { Category, Currency, Locale, Transaction } from '@/types';

/** Çağıran taraftan gelen çevirici (react-i18next `t`). */
export type Translate = (key: string, options?: Record<string, unknown>) => string;

export type ExportFormat = 'csv' | 'pdf';

export type ExportParams = {
  /** ISO 'YYYY-MM-DD' */
  from: string;
  /** ISO 'YYYY-MM-DD' */
  to: string;
  format: ExportFormat;
  locale: Locale;
  t: Translate;
};

/** Sebebi koda göre ayırt edilebilen export hatası (UI mesajı için). */
export class ExportError extends Error {
  constructor(public code: 'NO_TRANSACTIONS' | 'SHARING_UNAVAILABLE' | 'UNKNOWN') {
    super(code);
    this.name = 'ExportError';
  }
}

/** Kategori adı: default'larda i18n anahtarı, custom'da düz metin → her ikisi de t() ile çözülür. */
function categoryName(tx: Transaction, byId: Map<string, Category>, t: Translate): string {
  const cat = byId.get(tx.categoryId);
  return cat ? t(cat.name) : t('dashboard.categories.other');
}

/** RFC 4180: virgül/çift tırnak/yeni satır içeren alanları tırnakla, iç tırnağı ikiye katla. */
function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsv(
  transactions: Transaction[],
  byId: Map<string, Category>,
  t: Translate
): string {
  const header = [
    t('export.columns.date'),
    t('export.columns.kind'),
    t('export.columns.category'),
    t('export.columns.amount'),
    t('export.columns.currency'),
    t('export.columns.note'),
    t('export.columns.recurring'),
  ];

  const rows = transactions.map((tx) => [
    tx.date,
    tx.kind === 'income' ? t('export.kindIncome') : t('export.kindExpense'),
    categoryName(tx, byId, t),
    tx.amount.toFixed(2),
    tx.currency,
    tx.note ?? '',
    tx.recurringRuleId ? t('export.yes') : t('export.no'),
  ]);

  return [header, ...rows].map((cols) => cols.map(csvCell).join(',')).join('\r\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtml(
  transactions: Transaction[],
  byId: Map<string, Category>,
  params: ExportParams
): string {
  const { from, to, locale, t } = params;
  const totals = getTotals(transactions);
  // Toplamlar kullanıcının ilk işleminin para birimine göre etiketlenir (MVP, brief: tek toplam).
  const currency: Currency = transactions[0]?.currency ?? 'TRY';

  const rows = transactions
    .map((tx) => {
      const sign = tx.kind === 'income' ? '+' : '-';
      const amount = `${sign}${formatCurrency(tx.amount, tx.currency, locale)}`;
      return `<tr>
        <td>${escapeHtml(formatAbsoluteDate(tx.date, locale))}</td>
        <td>${escapeHtml(tx.kind === 'income' ? t('export.kindIncome') : t('export.kindExpense'))}</td>
        <td>${escapeHtml(categoryName(tx, byId, t))}</td>
        <td class="num ${tx.kind}">${escapeHtml(amount)}</td>
        <td>${escapeHtml(tx.note ?? '')}</td>
        <td>${escapeHtml(tx.recurringRuleId ? t('export.yes') : t('export.no'))}</td>
      </tr>`;
    })
    .join('');

  const period = `${formatAbsoluteDate(from, locale)} – ${formatAbsoluteDate(to, locale)}`;

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #191c1e;
      padding: 32px;
      font-size: 12px;
    }
    h1 { font-size: 22px; color: #6b38d4; margin: 0 0 4px; }
    .period { color: #494454; margin: 0 0 24px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e1e2e5; }
    th { background: #f2f3f6; color: #494454; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
    td.num { text-align: right; white-space: nowrap; }
    td.income { color: #006c49; }
    td.expense { color: #b90538; }
    .summary { width: 280px; margin-left: auto; }
    .summary tr td { border: none; padding: 4px 10px; }
    .summary .label { color: #494454; }
    .summary .value { text-align: right; font-weight: 600; white-space: nowrap; }
    .summary .net td { border-top: 2px solid #cbc3d7; padding-top: 8px; }
  </style>
</head>
<body>
  <h1>FynPad — ${escapeHtml(t('export.report.title'))}</h1>
  <p class="period">${escapeHtml(t('export.report.period'))}: ${escapeHtml(period)}</p>

  <table>
    <thead>
      <tr>
        <th>${escapeHtml(t('export.columns.date'))}</th>
        <th>${escapeHtml(t('export.columns.kind'))}</th>
        <th>${escapeHtml(t('export.columns.category'))}</th>
        <th style="text-align:right">${escapeHtml(t('export.columns.amount'))}</th>
        <th>${escapeHtml(t('export.columns.note'))}</th>
        <th>${escapeHtml(t('export.columns.recurring'))}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <table class="summary">
    <tr>
      <td class="label">${escapeHtml(t('export.report.totalIncome'))}</td>
      <td class="value">${escapeHtml(formatCurrency(totals.income, currency, locale))}</td>
    </tr>
    <tr>
      <td class="label">${escapeHtml(t('export.report.totalExpense'))}</td>
      <td class="value">${escapeHtml(formatCurrency(totals.expense, currency, locale))}</td>
    </tr>
    <tr class="net">
      <td class="label">${escapeHtml(t('export.report.net'))}</td>
      <td class="value">${escapeHtml(formatCurrency(totals.net, currency, locale))}</td>
    </tr>
  </table>
</body>
</html>`;
}

/** Cache'e dosya yazar (varsa üzerine yazar) ve uri'sini döner. */
function writeCacheFile(filename: string, content: string): string {
  const file = new File(Paths.cache, filename);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(content);
  return file.uri;
}

/**
 * Seçili tarih aralığındaki işlemleri CSV veya PDF olarak üretip native share sheet'i açar.
 * Brief 5 madde 2. DB değişmez; sadece okuma + dosya üretimi.
 */
export async function exportTransactions(params: ExportParams): Promise<void> {
  const { from, to, format, t } = params;

  if (!(await Sharing.isAvailableAsync())) {
    throw new ExportError('SHARING_UNAVAILABLE');
  }

  const [transactions, categories] = await Promise.all([
    listTransactions({ from, to }),
    listCategories(),
  ]);

  if (transactions.length === 0) {
    throw new ExportError('NO_TRANSACTIONS');
  }

  const byId = new Map(categories.map((c) => [c.id, c]));
  const base = `fynpad-transactions-${from}-to-${to}`;

  if (format === 'csv') {
    // Excel'in TR karakterlerini UTF-8 okuması için BOM ekle.
    const csv = '﻿' + buildCsv(transactions, byId, t);
    const uri = writeCacheFile(`${base}.csv`, csv);
    await Sharing.shareAsync(uri, {
      mimeType: 'text/csv',
      UTI: 'public.comma-separated-values-text',
      dialogTitle: t('export.title'),
    });
    return;
  }

  const html = buildHtml(transactions, byId, params);
  const { uri: printedUri } = await Print.printToFileAsync({ html });

  // printToFileAsync rastgele isim verir → istenen isme taşı (kullanıcıya düzgün dosya adı).
  const dest = new File(Paths.cache, `${base}.pdf`);
  if (dest.exists) {
    dest.delete();
  }
  new File(printedUri).move(dest);

  await Sharing.shareAsync(dest.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: t('export.title'),
  });
}

/** Hızlı seçim aralıkları için ISO tarih aralığı üretir. */
export type QuickPick = 'thisMonth' | 'lastMonth' | 'thisYear' | 'last3Months' | 'allTime';
