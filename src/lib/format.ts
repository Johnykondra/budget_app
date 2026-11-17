import { CurrencyCode, Transaction } from '../types/budget';

export function formatCurrency(amount: number, currency: CurrencyCode, compact = false): string {
  const isZeroDecimal = currency === 'JPY';
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    minimumFractionDigits: compact ? 0 : isZeroDecimal ? 0 : 2,
    maximumFractionDigits: compact ? 1 : isZeroDecimal ? 0 : 2,
  }).format(amount);
}

export function formatMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return monthKey;
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
}

export function formatShortMonth(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return monthKey;
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(date);
}

export function formatDisplayDate(dateStr: string): string {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const date = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function getDaysInMonth(monthKey: string): number {
  const [yearStr, monthStr] = monthKey.split('-');
  return new Date(Number(yearStr), Number(monthStr), 0).getDate();
}

export function generateDocumentId(prefix: string): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 14)
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}_${Date.now().toString(36)}_${randomPart}`;
}

export function exportTransactionsToCsv(
  transactions: Transaction[],
  categoryMap: Map<string, string>,
  currency: CurrencyCode
) {
  const headers = ['Date', 'Type', 'Merchant', 'Category', 'Payment Method', `Amount (${currency})`, 'Note'];
  const escapeCell = (val: string) => `"${val.replace(/"/g, '""')}"`;

  const rows = transactions.map((tx) => [
    escapeCell(tx.date),
    escapeCell(tx.type),
    escapeCell(tx.merchant),
    escapeCell(categoryMap.get(tx.categoryId) ?? 'Uncategorized'),
    escapeCell(tx.paymentMethod),
    tx.type === 'expense' ? (-tx.amount).toFixed(2) : tx.amount.toFixed(2),
    escapeCell(tx.note || ''),
  ]);

  const csvContent = [headers.map(escapeCell).join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ledgerline-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
