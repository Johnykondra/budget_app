export const CURRENCY_CODES = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'JPY',
  'INR',
  'PKR',
  'AED',
] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  USD: 'USD — US Dollar ($)',
  EUR: 'EUR — Euro (€)',
  GBP: 'GBP — British Pound (£)',
  CAD: 'CAD — Canadian Dollar (CA$)',
  AUD: 'AUD — Australian Dollar (A$)',
  JPY: 'JPY — Japanese Yen (¥)',
  INR: 'INR — Indian Rupee (₹)',
  PKR: 'PKR — Pakistani Rupee (PKR)',
  AED: 'AED — UAE Dirham (AED)',
};

export const CATEGORY_ICONS = [
  'home',
  'utensils',
  'car',
  'shopping-bag',
  'zap',
  'heart-pulse',
  'film',
  'briefcase',
  'plane',
  'book',
  'gift',
  'layers',
  'wallet',
  'trending-up',
] as const;
export type CategoryIconKey = (typeof CATEGORY_ICONS)[number];

export const PAYMENT_METHODS = ['card', 'bank', 'cash', 'transfer'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type TransactionType = 'expense' | 'income';

export const VALIDATION_LIMITS = {
  MAX_ID_LENGTH: 128,
  MAX_CATEGORY_NAME_LENGTH: 40,
  MAX_MERCHANT_LENGTH: 80,
  MAX_NOTE_LENGTH: 200,
  MAX_AMOUNT: 10000000,
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  HEX_COLOR_PATTERN: /^#[0-9A-Fa-f]{6}$/,
  DATE_PATTERN: /^\d{4}-\d{2}-\d{2}$/,
} as const;

export const CATEGORY_COLOR_SWATCHES = [
  '#0F766E', // Deep Teal
  '#2563EB', // Cobalt Blue
  '#D97706', // Warm Amber
  '#DC2626', // Crimson
  '#7C3AED', // Indigo Violet
  '#059669', // Emerald
  '#DB2777', // Berry Rose
  '#4F46E5', // Royal Indigo
  '#0284C7', // Sky Cyan
  '#65A30D', // Olive Green
  '#EA580C', // Burnt Orange
  '#475569', // Slate
] as const;

export interface UserProfile {
  userId: string;
  currency: CurrencyCode;
  monthlyBudgetTarget: number;
  seededDemoData: boolean;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  kind: TransactionType;
  color: string;
  icon: CategoryIconKey;
  monthlyLimit: number;
  isArchived: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string;
  type: TransactionType;
  amount: number;
  merchant: string;
  note: string;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
}

export type ActiveView =
  | 'overview'
  | 'transactions'
  | 'new-transaction'
  | 'categories'
  | 'settings';
