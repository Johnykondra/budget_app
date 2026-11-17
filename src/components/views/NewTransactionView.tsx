import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eraser, Plus, Sparkles } from 'lucide-react';
import {
  Category,
  CurrencyCode,
  PAYMENT_METHODS,
  PaymentMethod,
  Transaction,
  TransactionType,
  VALIDATION_LIMITS,
} from '../../types/budget';
import { buildSampleTransaction } from '../../lib/seedData';
import { formatCurrency, formatDisplayDate } from '../../lib/format';
import { CategoryIcon } from '../CategoryIcon';
import { CurrencySelector } from '../CurrencySelector';

interface NewTransactionViewProps {
  categories: Category[];
  transactions: Transaction[];
  currency: CurrencyCode;
  defaultMonth: string;
  onChangeCurrency: (nextCurrency: CurrencyCode) => void | Promise<void>;
  onSaveTransaction: (payload: Omit<Transaction, 'id' | 'userId'>) => Promise<void>;
  onClearAllTransactions: () => Promise<void>;
  onOpenNewCategory: () => void;
  onNavigateToLedger: () => void;
}

export function NewTransactionView({
  categories,
  transactions,
  currency,
  defaultMonth,
  onChangeCurrency,
  onSaveTransaction,
  onClearAllTransactions,
  onOpenNewCategory,
  onNavigateToLedger,
}: NewTransactionViewProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [confirmClear, setConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearedNotice, setClearedNotice] = useState(false);

  const [sessionCreated, setSessionCreated] = useState<Array<Omit<Transaction, 'id' | 'userId'>>>([]);

  const matchingCategories = useMemo(
    () => categories.filter((c) => !c.isArchived && c.kind === type),
    [categories, type]
  );

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  useEffect(() => {
    if (!matchingCategories.some((c) => c.id === categoryId)) {
      setCategoryId(matchingCategories[0]?.id ?? '');
    }
  }, [matchingCategories, categoryId]);

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    const firstMatch = categories.find((c) => !c.isArchived && c.kind === nextType);
    setCategoryId(firstMatch?.id ?? '');
  };

  const resetFormFields = () => {
    setAmount('');
    setMerchant('');
    setNote('');
    setDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod('card');
    setError(null);
  };

  const handleFillSample = () => {
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
    setSavedNotice(null);
  };

  const saveEntry = async (goToLedger: boolean) => {
    setError(null);
    setSavedNotice(null);

    const parsedAmount = Number(amount);
    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      parsedAmount > VALIDATION_LIMITS.MAX_AMOUNT
    ) {
      setError(
        `Enter a valid amount between 0.01 and ${VALIDATION_LIMITS.MAX_AMOUNT.toLocaleString()}.`
      );
      return;
    }

    const trimmedMerchant = merchant.trim();
    if (!trimmedMerchant || trimmedMerchant.length > VALIDATION_LIMITS.MAX_MERCHANT_LENGTH) {
      setError(
        `Merchant description must be 1 to ${VALIDATION_LIMITS.MAX_MERCHANT_LENGTH} characters.`
      );
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
      setError('Select or create a category first.');
      return;
    }

    const payload: Omit<Transaction, 'id' | 'userId'> = {
      type,
      categoryId,
      amount: Math.round(parsedAmount * 100) / 100,
      merchant: trimmedMerchant,
      note: trimmedNote,
      date,
      paymentMethod,
    };

    setIsSaving(true);
    try {
      await onSaveTransaction(payload);
      setSessionCreated((prev) => [payload, ...prev].slice(0, 6));
      if (goToLedger) {
        onNavigateToLedger();
      } else {
        setSavedNotice(`Saved ${payload.merchant} (${formatCurrency(payload.amount, currency)}).`);
        resetFormFields();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save transaction.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveEntry(false);
  };

  const handleClearConfirm = async () => {
    setIsClearing(true);
    setClearedNotice(false);
    try {
      await onClearAllTransactions();
      setSessionCreated([]);
      setConfirmClear(false);
      setClearedNotice(true);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Main Entry Form */}
      <div className="xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Record New Transaction
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enter spending or income details to update your charts and budget progress immediately.
            </p>
          </div>
          <button
            type="button"
            onClick={handleFillSample}
            disabled={categories.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Fill Sample Entry
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pt-5 space-y-5">
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

          <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Currency Type
            </span>
            <CurrencySelector
              currency={currency}
              onChange={onChangeCurrency}
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
                className="w-full px-3 py-2.5 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Transaction Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Merchant / Source Description
            </label>
            <input
              type="text"
              required
              maxLength={VALIDATION_LIMITS.MAX_MERCHANT_LENGTH}
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder={
                type === 'expense'
                  ? 'e.g. Supermarket, Fuel Station, Utility Bill'
                  : 'e.g. Monthly Salary, Client Retainer'
              }
              className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
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
                  onClick={onOpenNewCategory}
                  className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  + New category
                </button>
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
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
                Payment Channel
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 capitalize focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
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
              placeholder="Optional receipt number, tag, or line-item context"
              className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {error && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {savedNotice && (
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{savedNotice}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={resetFormFields}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
            >
              Reset Form
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={isSaving || matchingCategories.length === 0}
                onClick={() => void saveEntry(true)}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                Save & View Ledger
              </button>
              <button
                type="submit"
                disabled={isSaving || matchingCategories.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-lg hover:bg-slate-800 dark:hover:bg-emerald-500 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                {isSaving ? 'Saving...' : 'Save & Add Another'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Right Column: Start From Scratch + Session Log */}
      <div className="xl:col-span-5 space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
              <Eraser className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Start Ledger from Scratch
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Remove all{' '}
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {transactions.length}
                </span>{' '}
                existing sample or logged transactions to begin with an empty balance sheet while keeping your custom categories.
              </p>
            </div>
          </div>

          {clearedNotice && (
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg px-3 py-2">
              All transactions cleared. Your ledger is now ready from scratch.
            </p>
          )}

          {confirmClear ? (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                Delete all {transactions.length} transactions?
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isClearing}
                  onClick={handleClearConfirm}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isClearing ? 'Clearing...' : 'Confirm Clear All'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={transactions.length === 0}
              onClick={() => {
                setConfirmClear(true);
                setClearedNotice(false);
              }}
              className="w-full py-2 px-4 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/70 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 disabled:opacity-40 transition-colors"
            >
              {transactions.length === 0
                ? 'Ledger Already Empty'
                : 'Clear All Transactions & Start from Scratch'}
            </button>
          )}
        </div>

        {/* Entries Added in Current Session */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Added This Session
            </h3>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {sessionCreated.length} {sessionCreated.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {sessionCreated.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Entries you save on this page will appear here immediately.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {sessionCreated.map((item, idx) => {
                const cat = categoryMap.get(item.categoryId);
                return (
                  <div
                    key={`${item.merchant}-${idx}`}
                    className="px-6 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {cat && (
                        <span
                          className="w-6 h-6 rounded flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: cat.color }}
                        >
                          <CategoryIcon icon={cat.icon} className="w-3 h-3" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                          {item.merchant}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {cat?.name ?? 'Uncategorized'}
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono">{formatDisplayDate(item.date)}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-mono font-semibold whitespace-nowrap ${
                        item.type === 'income'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {item.type === 'income' ? '+' : '-'}
                      {formatCurrency(item.amount, currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
