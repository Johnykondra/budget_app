import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, Plus } from 'lucide-react';
import {
  Category,
  CurrencyCode,
  Transaction,
} from '../../types/budget';
import {
  formatCurrency,
  formatDisplayDate,
  formatMonthLabel,
  getMonthKey,
} from '../../lib/format';
import { CategoryDonutChart, CategorySpendSlice } from '../charts/CategoryDonutChart';
import { MonthlyPoint, MonthlyTrendChart } from '../charts/MonthlyTrendChart';
import { SpendingPaceChart } from '../charts/SpendingPaceChart';
import { CategoryIcon } from '../CategoryIcon';
import { CurrencySelector } from '../CurrencySelector';

interface OverviewViewProps {
  transactions: Transaction[];
  categories: Category[];
  currency: CurrencyCode;
  monthlyBudgetTarget: number;
  selectedMonth: string;
  selectedCategoryId: string | null;
  availableMonths: string[];
  onSelectMonth: (monthKey: string) => void;
  onSelectCategory: (categoryId: string | null) => void;
  onChangeCurrency: (nextCurrency: CurrencyCode) => void | Promise<void>;
  onAddTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onOpenCategories: () => void;
  onViewAllTransactions: () => void;
}

export function OverviewView({
  transactions,
  categories,
  currency,
  monthlyBudgetTarget,
  selectedMonth,
  selectedCategoryId,
  availableMonths,
  onSelectMonth,
  onSelectCategory,
  onChangeCurrency,
  onAddTransaction,
  onEditTransaction,
  onOpenCategories,
  onViewAllTransactions,
}: OverviewViewProps) {
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const selectedCategory = selectedCategoryId
    ? categoryMap.get(selectedCategoryId) ?? null
    : null;

  const monthTransactions = useMemo(
    () => transactions.filter((t) => getMonthKey(t.date) === selectedMonth),
    [transactions, selectedMonth]
  );

  const monthIncome = useMemo(
    () =>
      monthTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0),
    [monthTransactions]
  );

  const monthExpenses = useMemo(
    () =>
      monthTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0),
    [monthTransactions]
  );

  const netCashflow = monthIncome - monthExpenses;
  const savingsRate = monthIncome > 0 ? (netCashflow / monthIncome) * 100 : 0;
  const budgetRemaining = monthlyBudgetTarget - monthExpenses;
  const budgetUsedPct =
    monthlyBudgetTarget > 0 ? (monthExpenses / monthlyBudgetTarget) * 100 : 0;

  // Category breakdown slices for selected month
  const categorySlices: CategorySpendSlice[] = useMemo(() => {
    const totals = new Map<string, { spent: number; count: number }>();
    for (const tx of monthTransactions) {
      if (tx.type !== 'expense') continue;
      const existing = totals.get(tx.categoryId) ?? { spent: 0, count: 0 };
      existing.spent += tx.amount;
      existing.count += 1;
      totals.set(tx.categoryId, existing);
    }

    const result: CategorySpendSlice[] = [];
    for (const [catId, stats] of totals.entries()) {
      const cat = categoryMap.get(catId);
      if (!cat) continue;
      result.push({
        category: cat,
        spent: stats.spent,
        transactionCount: stats.count,
        sharePercent: monthExpenses > 0 ? (stats.spent / monthExpenses) * 100 : 0,
      });
    }

    return result.sort((a, b) => b.spent - a.spent);
  }, [monthTransactions, categoryMap, monthExpenses]);

  // 6-month trend window ending at latest available month (or selectedMonth)
  const sixMonthSeries: MonthlyPoint[] = useMemo(() => {
    const baseMonths = availableMonths.slice(0, 6).reverse();
    return baseMonths.map((mKey) => {
      let income = 0;
      let expenses = 0;
      for (const tx of transactions) {
        if (getMonthKey(tx.date) !== mKey) continue;
        if (selectedCategoryId && tx.categoryId !== selectedCategoryId) continue;
        if (tx.type === 'income') income += tx.amount;
        else expenses += tx.amount;
      }
      return { monthKey: mKey, income, expenses };
    });
  }, [availableMonths, transactions, selectedCategoryId]);

  const paceTransactions = useMemo(() => {
    if (!selectedCategoryId) return monthTransactions;
    return monthTransactions.filter((t) => t.categoryId === selectedCategoryId);
  }, [monthTransactions, selectedCategoryId]);

  const paceLimit =
    selectedCategory && selectedCategory.kind === 'expense'
      ? selectedCategory.monthlyLimit
      : monthlyBudgetTarget;

  const paceLabel =
    selectedCategory && selectedCategory.kind === 'expense'
      ? `${selectedCategory.name} Limit`
      : 'Monthly Target';

  const recentTransactions = useMemo(() => {
    const list = selectedCategoryId
      ? monthTransactions.filter((t) => t.categoryId === selectedCategoryId)
      : monthTransactions;
    return [...list].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  }, [monthTransactions, selectedCategoryId]);

  const currentMonthIdx = availableMonths.indexOf(selectedMonth);
  const canGoPrev = currentMonthIdx >= 0 && currentMonthIdx < availableMonths.length - 1;
  const canGoNext = currentMonthIdx > 0;

  return (
    <div className="space-y-6">
      {transactions.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Clean Slate Ready
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              All sample records are cleared. Add your first expense or income transaction to populate your charts.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddTransaction}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-lg hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Record First Transaction
          </button>
        </div>
      )}

      {/* Period Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={() => canGoPrev && onSelectMonth(availableMonths[currentMonthIdx + 1])}
            aria-label="Previous month"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <select
            value={selectedMonth}
            onChange={(e) => onSelectMonth(e.target.value)}
            aria-label="Select budget month"
            className="px-3.5 py-2 text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonthLabel(m)}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={!canGoNext}
            onClick={() => canGoNext && onSelectMonth(availableMonths[currentMonthIdx - 1])}
            aria-label="Next month"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {selectedCategory && (
            <div className="flex items-center gap-3 px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200">
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: selectedCategory.color }}
              />
              <span>
                Filtered by category: <strong>{selectedCategory.name}</strong>
              </span>
              <button
                type="button"
                onClick={() => onSelectCategory(null)}
                className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                Reset
              </button>
            </div>
          )}

          <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Currency
            </span>
            <CurrencySelector
              currency={currency}
              onChange={onChangeCurrency}
              compact
            />
          </div>
        </div>
      </div>

      {/* 4-Column KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Monthly Income</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-semibold font-mono text-slate-900 dark:text-slate-100">
            {formatCurrency(monthIncome, currency)}
          </div>
          <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {monthTransactions.filter((t) => t.type === 'income').length} inflow entries
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Monthly Spending</span>
            <ArrowDownRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-semibold font-mono text-slate-900 dark:text-slate-100">
            {formatCurrency(monthExpenses, currency)}
          </div>
          <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {monthTransactions.filter((t) => t.type === 'expense').length} expense entries
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Net Cashflow</span>
            <span
              className={`text-xs font-medium ${
                netCashflow >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {netCashflow >= 0 ? 'Positive' : 'Deficit'}
            </span>
          </div>
          <div className="mt-2 text-2xl font-semibold font-mono text-slate-900 dark:text-slate-100">
            {netCashflow >= 0 ? '+' : ''}
            {formatCurrency(netCashflow, currency)}
          </div>
          <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
            {monthIncome > 0
              ? `${savingsRate.toFixed(1)}% savings rate`
              : 'No income logged'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Budget Remaining</span>
            <span
              className={`text-xs font-medium ${
                budgetRemaining < 0
                  ? 'text-red-600 dark:text-red-400'
                  : budgetUsedPct >= 80
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {budgetRemaining < 0
                ? 'Over Target'
                : budgetUsedPct >= 80
                ? 'Approaching Cap'
                : 'On Track'}
            </span>
          </div>
          <div className="mt-2 text-2xl font-semibold font-mono text-slate-900 dark:text-slate-100">
            {formatCurrency(Math.abs(budgetRemaining), currency)}
          </div>
          <div className="mt-2 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                budgetRemaining < 0
                  ? 'bg-red-600'
                  : budgetUsedPct >= 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-600'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, budgetUsedPct))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Primary Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        <div className="xl:col-span-6">
          <CategoryDonutChart
            slices={categorySlices}
            totalSpent={monthExpenses}
            currency={currency}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={onSelectCategory}
            onCreateCategory={onOpenCategories}
          />
        </div>

        <div className="xl:col-span-6">
          <MonthlyTrendChart
            months={sixMonthSeries}
            budgetTarget={monthlyBudgetTarget}
            selectedMonth={selectedMonth}
            currency={currency}
            onSelectMonth={onSelectMonth}
          />
        </div>
      </div>

      {/* Daily Pace Trajectory */}
      <SpendingPaceChart
        monthKey={selectedMonth}
        transactions={paceTransactions}
        budgetLimit={paceLimit}
        limitLabel={paceLabel}
        currency={currency}
        accentColor={selectedCategory?.color ?? '#0F766E'}
      />

      {/* Recent Transactions Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Recent Activity · {formatMonthLabel(selectedMonth)}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {selectedCategory
                ? `Showing entries in ${selectedCategory.name}`
                : 'Latest transactions recorded in this period'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onViewAllTransactions}
              className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 underline-offset-4 hover:underline"
            >
              View full ledger
            </button>
            <button
              type="button"
              onClick={onAddTransaction}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-lg hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Entry
            </button>
          </div>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No transactions match this view
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Add a new transaction or clear the active category filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/50">
                  <th className="py-2.5 px-6">Merchant & Note</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Channel</th>
                  <th className="py-2.5 px-6 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {recentTransactions.map((tx) => {
                  const cat = categoryMap.get(tx.categoryId);
                  return (
                    <tr
                      key={tx.id}
                      onClick={() => onEditTransaction(tx)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-6">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {tx.merchant}
                        </div>
                        {tx.note && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                            {tx.note}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                          {cat && (
                            <span
                              className="w-5 h-5 rounded flex items-center justify-center text-white shrink-0"
                              style={{ backgroundColor: cat.color }}
                            >
                              <CategoryIcon icon={cat.icon} className="w-3 h-3" />
                            </span>
                          )}
                          <span>{cat?.name ?? 'Uncategorized'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDisplayDate(tx.date)}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 capitalize whitespace-nowrap">
                        {tx.paymentMethod}
                      </td>
                      <td
                        className={`py-3 px-6 text-right font-mono font-semibold whitespace-nowrap ${
                          tx.type === 'income'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatCurrency(tx.amount, currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
