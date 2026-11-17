import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { buildSampleTransaction } from '../../lib/seedData';
import { CurrencySelector } from '../CurrencySelector';
import {
  Category,
  CurrencyCode,
  PAYMENT_METHODS,
  PaymentMethod,
  Transaction,
  TransactionType,
  VALIDATION_LIMITS,
} from '../../types/budget';

interface TransactionModalProps {
  isOpen: boolean;
  editingTransaction: Transaction | null;
  categories: Category[];
  currency: CurrencyCode;
  defaultMonth: string;
  onChangeCurrency: (nextCurrency: CurrencyCode) => void | Promise<void>;
  onClose: () => void;
  onSave: (payload: Omit<Transaction, 'id' | 'userId'>, existingId?: string) => Promise<void>;
  onOpenNewCategory: () => void;
}

export function TransactionModal({
  isOpen,
  editingTransaction,
  categories,
  currency,
  defaultMonth,
  onChangeCurrency,
  onClose,
  onSave,
  onOpenNewCategory,
}: TransactionModalProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(`${defaultMonth}-17`);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const matchingCategories = categories.filter(
    (c) => !c.isArchived && c.kind === type
  );

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editingTransaction) {
      setType(editingTransaction.type);
      setCategoryId(editingTransaction.categoryId);
      setAmount(String(editingTransaction.amount));
      setMerchant(editingTransaction.merchant);
      setNote(editingTransaction.note);
      setDate(editingTransaction.date);
      setPaymentMethod(editingTransaction.paymentMethod);
    } else {
      setType('expense');
      const firstExpense = categories.find((c) => !c.isArchived && c.kind === 'expense');
      setCategoryId(firstExpense?.id ?? '');
      setAmount('');
      setMerchant('');
      setNote('');
      const todayIso = new Date().toISOString().slice(0, 10);
      setDate(todayIso.startsWith(defaultMonth) ? todayIso : `${defaultMonth}-15`);
      setPaymentMethod('card');
    }
  }, [isOpen, editingTransaction, categories, defaultMonth]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    const firstMatch = categories.find((c) => !c.isArchived && c.kind === nextType);
    setCategoryId(firstMatch?.id ?? '');
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > VALIDATION_LIMITS.MAX_AMOUNT) {
      setError(`Enter a valid amount between 0.01 and ${VALIDATION_LIMITS.MAX_AMOUNT.toLocaleString()}.`);
      return;
    }

    const trimmedMerchant = merchant.trim();
    if (!trimmedMerchant || trimmedMerchant.length > VALIDATION_LIMITS.MAX_MERCHANT_LENGTH) {
      setError(`Merchant description must be 1 to ${VALIDATION_LIMITS.MAX_MERCHANT_LENGTH} characters.`);
      return;
    }

    const trimmedNote = note.trim();
    if (trimmedNote.length > VALIDATION_LIMITS.MAX_NOTE_LENGTH) {
      setError(`Note cannot exceed ${VALIDATION_LIMITS.MAX_NOTE_LENGTH} characters.`);
      return;
    }

    if (!VALIDATION_LIMITS.DATE_PATTERN.test(date)) {
      setError('Select a valid calendar date.');
      return;
    }

    if (!categoryId || !categories.some((c) => c.id === categoryId)) {
      setError('Select a valid category first.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(
        {
          type,
          categoryId,
          amount: Math.round(parsedAmount * 100) / 100,
          merchant: trimmedMerchant,
          note: trimmedNote,
          date,
          paymentMethod,
        },
        editingTransaction?.id
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save transaction.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-modal-title"
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 id="transaction-modal-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Segmented Type Selector */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                type === 'expense'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                type === 'income'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Income
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Currency Type
            </span>
            <CurrencySelector
              currency={currency}
              onChange={onChangeCurrency}
              compact
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Amount ({currency})
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={VALIDATION_LIMITS.MAX_AMOUNT}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Merchant / Description
            </label>
            <input
              type="text"
              required
              maxLength={VALIDATION_LIMITS.MAX_MERCHANT_LENGTH}
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder={type === 'expense' ? 'e.g. Whole Harvest Market' : 'e.g. Direct Deposit'}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenNewCategory();
                  }}
                  className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  + New category
                </button>
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {matchingCategories.length === 0 ? (
                  <option value="">No active {type} categories</option>
                ) : (
                  matchingCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 capitalize focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm} className="capitalize">
                    {pm === 'bank' ? 'Bank Account' : pm.charAt(0).toUpperCase() + pm.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Note (optional)
            </label>
            <input
              type="text"
              maxLength={VALIDATION_LIMITS.MAX_NOTE_LENGTH}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Line-item context or receipt reference"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {error && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            {!editingTransaction ? (
              <button
                type="button"
                onClick={() => {
                  const sample = buildSampleTransaction(categories, defaultMonth, currency);
                  if (!sample) return;
                  setType(sample.type);
                  setCategoryId(sample.categoryId);
                  setAmount(String(sample.amount));
                  setMerchant(sample.merchant);
                  setNote(sample.note);
                  setDate(sample.date);
                  setPaymentMethod(sample.paymentMethod);
                  setError(null);
                }}
                className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
              >
                Fill Sample Entry
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || matchingCategories.length === 0}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-lg hover:bg-slate-800 dark:hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                {isSaving ? 'Saving...' : editingTransaction ? 'Save Changes' : 'Add Transaction'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
