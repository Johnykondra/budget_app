import { useMemo, useState } from 'react';
import { Archive, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Category, CurrencyCode, Transaction } from '../../types/budget';
import { formatCurrency, formatMonthLabel, getMonthKey } from '../../lib/format';
import { CategoryIcon } from '../CategoryIcon';

interface CategoriesViewProps {
  categories: Category[];
  transactions: Transaction[];
  currency: CurrencyCode;
  monthlyBudgetTarget: number;
  selectedMonth: string;
  onCreateCategory: () => void;
  onEditCategory: (cat: Category) => void;
  onToggleArchiveCategory: (cat: Category) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
}

export function CategoriesView({
  categories,
  transactions,
  currency,
  monthlyBudgetTarget,
  selectedMonth,
  onCreateCategory,
  onEditCategory,
  onToggleArchiveCategory,
  onDeleteCategory,
}: CategoriesViewProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const monthSpendByCategory = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const tx of transactions) {
      if (getMonthKey(tx.date) !== selectedMonth) continue;
      const prev = map.get(tx.categoryId) ?? { total: 0, count: 0 };
      prev.total += tx.amount;
      prev.count += 1;
      map.set(tx.categoryId, prev);
    }
    return map;
  }, [transactions, selectedMonth]);

  const txCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) {
      map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + 1);
    }
    return map;
  }, [transactions]);

  const activeExpenseCats = useMemo(
    () => categories.filter((c) => !c.isArchived && c.kind === 'expense'),
    [categories]
  );

  const activeIncomeCats = useMemo(
    () => categories.filter((c) => !c.isArchived && c.kind === 'income'),
    [categories]
  );

  const archivedCats = useMemo(
    () => categories.filter((c) => c.isArchived),
    [categories]
  );

  const totalAllocatedLimits = useMemo(
    () => activeExpenseCats.reduce((sum, c) => sum + c.monthlyLimit, 0),
    [activeExpenseCats]
  );

  const handleDelete = async (catId: string) => {
    setBusyId(catId);
    try {
      await onDeleteCategory(catId);
      setConfirmDeleteId(null);
    } finally {
      setBusyId(null);
    }
  };

  const handleArchiveToggle = async (cat: Category) => {
    setBusyId(cat.id);
    try {
      await onToggleArchiveCategory(cat);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Allocation Overview */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Custom Categories & Limits · {formatMonthLabel(selectedMonth)}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Allocated expense limits total{' '}
            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(totalAllocatedLimits, currency)}
            </span>{' '}
            against your{' '}
            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(monthlyBudgetTarget, currency)}
            </span>{' '}
            monthly target.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateCategory}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-lg hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          New Custom Category
        </button>
      </div>

      {/* Expense Categories */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Expense Categories ({activeExpenseCats.length})
          </h3>
        </div>

        {activeExpenseCats.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No active expense categories yet
            </p>
            <button
              type="button"
              onClick={onCreateCategory}
              className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-lg"
            >
              Create First Category
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeExpenseCats.map((cat) => {
              const monthStats = monthSpendByCategory.get(cat.id) ?? { total: 0, count: 0 };
              const totalLinkedTx = txCountByCategory.get(cat.id) ?? 0;
              const pct = cat.monthlyLimit > 0 ? (monthStats.total / cat.monthlyLimit) * 100 : 0;
              const isOver = cat.monthlyLimit > 0 && monthStats.total > cat.monthlyLimit;
              const isWarn = cat.monthlyLimit > 0 && !isOver && pct >= 80;
              const isConfirmingDelete = confirmDeleteId === cat.id;

              return (
                <div
                  key={cat.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: cat.color }}
                      >
                        <CategoryIcon icon={cat.icon} className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {cat.name}
                        </h4>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          <span>{monthStats.count} this month</span>
                          <span aria-hidden="true"> · </span>
                          <span>{totalLinkedTx} total</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditCategory(cat)}
                        aria-label={`Edit ${cat.name}`}
                        className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={busyId === cat.id}
                        onClick={() => handleArchiveToggle(cat)}
                        aria-label={`Archive ${cat.name}`}
                        className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                      {totalLinkedTx === 0 && (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(cat.id)}
                          aria-label={`Delete ${cat.name}`}
                          className="p-1.5 rounded-md text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {isConfirmingDelete ? (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        Delete unused category?
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busyId === cat.id}
                          onClick={() => handleDelete(cat.id)}
                          className="px-2.5 py-1 bg-red-600 text-white font-semibold rounded"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-slate-600 dark:text-slate-300 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline justify-between text-xs mb-1.5">
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(monthStats.total, currency)}
                        </span>
                        <span className="font-mono text-slate-500 dark:text-slate-400">
                          {cat.monthlyLimit > 0
                            ? `of ${formatCurrency(cat.monthlyLimit, currency)}`
                            : 'No monthly cap'}
                        </span>
                      </div>

                      {cat.monthlyLimit > 0 && (
                        <>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(100, pct)}%`,
                                backgroundColor: isOver
                                  ? '#DC2626'
                                  : isWarn
                                  ? '#D97706'
                                  : cat.color,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1.5 text-[11px]">
                            <span
                              className={
                                isOver
                                  ? 'font-medium text-red-600 dark:text-red-400'
                                  : isWarn
                                  ? 'font-medium text-amber-600 dark:text-amber-400'
                                  : 'text-slate-500 dark:text-slate-400'
                              }
                            >
                              {isOver
                                ? `Over budget by ${formatCurrency(monthStats.total - cat.monthlyLimit, currency)}`
                                : isWarn
                                ? 'Approaching limit'
                                : 'On track'}
                            </span>
                            <span className="font-mono text-slate-500 dark:text-slate-400">
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Income Categories */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Income Categories ({activeIncomeCats.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeIncomeCats.map((cat) => {
            const monthStats = monthSpendByCategory.get(cat.id) ?? { total: 0, count: 0 };
            return (
              <div
                key={cat.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: cat.color }}
                  >
                    <CategoryIcon icon={cat.icon} className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {cat.name}
                    </h4>
                    <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400">
                      +{formatCurrency(monthStats.total, currency)} this month
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onEditCategory(cat)}
                  aria-label={`Edit ${cat.name}`}
                  className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Archived Categories */}
      {archivedCats.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Archived Categories ({archivedCats.length})
          </h3>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
            {archivedCats.map((cat) => (
              <div
                key={cat.id}
                className="px-5 py-3 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-7 h-7 rounded-md flex items-center justify-center text-white opacity-60"
                    style={{ backgroundColor: cat.color }}
                  >
                    <CategoryIcon icon={cat.icon} className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {cat.name}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={busyId === cat.id}
                  onClick={() => handleArchiveToggle(cat)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
