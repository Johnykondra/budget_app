import { CURRENCY_CODES, CURRENCY_LABELS, CurrencyCode } from '../types/budget';

interface CurrencySelectorProps {
  currency: CurrencyCode;
  onChange: (nextCurrency: CurrencyCode) => void | Promise<void>;
  compact?: boolean;
  showQuickToggle?: boolean;
}

const FEATURED_CURRENCIES: CurrencyCode[] = ['AED', 'INR'];

export function CurrencySelector({
  currency,
  onChange,
  compact = false,
  showQuickToggle = true,
}: CurrencySelectorProps) {
  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      {showQuickToggle && (
        <div
          className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          role="group"
          aria-label="Quick currency selection"
        >
          {FEATURED_CURRENCIES.map((code) => {
            const active = currency === code;
            return (
              <button
                key={code}
                type="button"
                aria-pressed={active}
                onClick={() => void onChange(code)}
                className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-md transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {code}
              </button>
            );
          })}
        </div>
      )}

      <select
        value={currency}
        onChange={(e) => void onChange(e.target.value as CurrencyCode)}
        aria-label="Select currency type"
        className={`${
          compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs'
        } font-medium bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600`}
      >
        {CURRENCY_CODES.map((code) => (
          <option key={code} value={code}>
            {compact ? code : CURRENCY_LABELS[code]}
          </option>
        ))}
      </select>
    </div>
  );
}
