import React, { useEffect, useState } from 'react';
import { Cloud, LogIn, LogOut, RotateCcw } from 'lucide-react';
import { User } from 'firebase/auth';
import {
  CURRENCY_CODES,
  CURRENCY_LABELS,
  CurrencyCode,
  VALIDATION_LIMITS,
} from '../../types/budget';

interface SettingsViewProps {
  user: User | null;
  currency: CurrencyCode;
  monthlyBudgetTarget: number;
  transactionCount: number;
  onSavePreferences: (currency: CurrencyCode, monthlyBudgetTarget: number) => Promise<void>;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onReseedSampleData: () => Promise<void>;
  onClearAllTransactions: () => Promise<void>;
}

export function SettingsView({
  user,
  currency,
  monthlyBudgetTarget,
  transactionCount,
  onSavePreferences,
  onSignIn,
  onSignOut,
  onReseedSampleData,
  onClearAllTransactions,
}: SettingsViewProps) {
  const [draftCurrency, setDraftCurrency] = useState<CurrencyCode>(currency);
  const [draftTarget, setDraftTarget] = useState(String(monthlyBudgetTarget));
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmReseed, setConfirmReseed] = useState(false);
  const [reseeding, setReseeding] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    setDraftCurrency(currency);
    setDraftTarget(String(monthlyBudgetTarget));
  }, [currency, monthlyBudgetTarget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedNotice(false);

    const parsedTarget = Number(draftTarget);
    if (!Number.isFinite(parsedTarget) || parsedTarget < 0 || parsedTarget > VALIDATION_LIMITS.MAX_AMOUNT) {
      setError(`Budget target must be between 0 and ${VALIDATION_LIMITS.MAX_AMOUNT.toLocaleString()}.`);
      return;
    }

    setSaving(true);
    try {
      await onSavePreferences(draftCurrency, Math.round(parsedTarget * 100) / 100);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleReseed = async () => {
    setReseeding(true);
    try {
      await onReseedSampleData();
      setConfirmReseed(false);
    } finally {
      setReseeding(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await onClearAllTransactions();
      setConfirmClear(false);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Budget Preferences */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5"
      >
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Budget Preferences
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Set your display currency and overall monthly spending cap used across trend charts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Display Currency
            </label>
            <select
              value={draftCurrency}
              onChange={(e) => setDraftCurrency(e.target.value as CurrencyCode)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {CURRENCY_CODES.map((code) => (
                <option key={code} value={code}>
                  {CURRENCY_LABELS[code]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Monthly Spending Target ({draftCurrency})
            </label>
            <input
              type="number"
              min="0"
              max={VALIDATION_LIMITS.MAX_AMOUNT}
              step="10"
              required
              value={draftTarget}
              onChange={(e) => setDraftTarget(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        {error && (
          <p className="text-xs font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            {savedNotice ? 'Preferences saved' : ''}
          </span>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-lg hover:bg-slate-800 dark:hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>

      {/* Cloud Sync Account */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {user ? 'Cloud Sync Active' : 'Local Preview Mode'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {user
                ? `Signed in as ${user.email ?? 'Google Account'}. Categories and transactions sync automatically to Firestore.`
                : 'Sign in with Google to persist your custom categories and transactions securely across sessions.'}
            </p>
          </div>
        </div>

        {user ? (
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        ) : (
          <button
            type="button"
            onClick={onSignIn}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-lg hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign in with Google
          </button>
        )}
      </div>

      {/* Start From Scratch */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Start from Scratch
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Clear all {transactionCount} transactions to begin with a blank ledger while keeping custom categories.
          </p>
        </div>

        {confirmClear ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={clearing}
              onClick={handleClear}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {clearing ? 'Clearing...' : 'Confirm Clear All'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={transactionCount === 0}
            onClick={() => setConfirmClear(true)}
            className="px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/70 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            {transactionCount === 0 ? 'Ledger Empty' : 'Clear All Transactions'}
          </button>
        )}
      </div>

      {/* Starter Dataset Restore */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Restore Sample Dataset
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Restore the 9 starter categories and 6 months of sample transactions.
          </p>
        </div>

        {confirmReseed ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={reseeding}
              onClick={handleReseed}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-lg hover:bg-slate-800 dark:hover:bg-emerald-500 disabled:opacity-50"
            >
              {reseeding ? 'Restoring...' : 'Confirm Restore'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmReseed(false)}
              className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReseed(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restore Sample Data
          </button>
        )}
      </div>
    </div>
  );
}
