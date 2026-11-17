import { useMemo, useState } from 'react';
import {
  ArrowDownUp,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  Category,
  CurrencyCode,
  PAYMENT_METHODS,
  Transaction,
} from '../../types/budget';
import {
  exportTransactionsToCsv,
  formatCurrency,
  formatDisplayDate,
  formatMonthLabel,
  getMonthKey,
} from '../../lib/format';
import { CategoryIcon } from '../CategoryIcon';

interface TransactionsViewProps {
  transactions: Transaction[];
  categories: Category[];
  currency: CurrencyCode;
  availableMonths: string[];
  onAddTransaction: () => void;
  onClearAllTransactions: () => Promise<void>;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (txId: string) => Promise<void>;
}

type SortField = 'date' | 'amount' | 'merchant';
type SortDirection = 'asc' | 'desc';

export function TransactionsView({
  transactions,
  categories,
  currency,
  availableMonths,
  onAddTransaction,
  onClearAllTransactions,
  onEditTransaction,
  onDeleteTransaction,
}: TransactionsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const handleConfirmClearAll = async () => {
    setClearingAll(true);
    try {
      await onClearAllTransactions();
      setConfirmClearAll(false);
    } finally {
      setClearingAll(false);
    }
  };

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return transactions
      .filter((tx) => {
        if (monthFilter !== 'all' && getMonthKey(tx.date) !== monthFilter) return false;
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        if (categoryFilter !== 'all' && tx.categoryId !== categoryFilter) return false;
        if (methodFilter !== 'all' && tx.paymentMethod !== methodFilter) return false;
        if (q) {
          const catName = categoryMap.get(tx.categoryId)?.name.toLowerCase() ?? '';
          const match =
            tx.merchant.toLowerCase().includes(q) ||
            tx.note.toLowerCase().includes(q) ||
            catName.includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'date') cmp = a.date.localeCompare(b.date);
        else if (sortField === 'amount') cmp = a.amount - b.amount;
        else cmp = a.merchant.localeCompare(b.merchant);
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [
    transactions,
    searchQuery,
    monthFilter,
    typeFilter,
    categoryFilter,
    methodFilter,
    sortField,
    sortDir,
    categoryMap,
  ]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filteredTransactions) {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    }
    return { income, expense, net: income - expense };
  }, [filteredTransactions]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'merchant' ? 'asc' : 'desc');
    }
  };

  const handleExportCsv = () => {
    const nameMap = new Map(categories.map((c) => [c.id, c.name]));
    exportTransactionsToCsv(filteredTransactions, nameMap, currency);
  };

  const handleConfirmDelete = async (txId: string) => {
    setDeletingId(txId);
    try {
      await onDeleteTransaction(txId);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search merchant, note, or category..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {transactions.length > 0 &&
              (confirmClearAll ? (
                <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg">
                  <button
                    type="button"
                    disabled={clearingAll}
                    onClick={handleConfirmClearAll}
                    className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    {clearingAll ? 'Clearing...' : 'Confirm Clear All'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="px-1.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:underline whitespace-nowrap"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors whitespace-nowrap shrink-0"
                >
                  Clear All
                </button>
              ))}
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredTransactions.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={onAddTransaction}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-lg hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Transaction
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented Type Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {(['all', 'expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                  typeFilter === t
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {t === 'all' ? 'All Types' : `${t}s`}
              </button>
            ))}
          </div>

          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            aria-label="Filter by month"
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Months</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonthLabel(m)}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            aria-label="Filter by payment method"
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 capitalize"
          >
            <option value="all">All Channels</option>
            {PAYMENT_METHODS.map((pm) => (
              <option key={pm} value={pm} className="capitalize">
                {pm}
              </option>
            ))}
          </select>

          {(searchQuery ||
            monthFilter !== 'all' ||
            typeFilter !== 'all' ||
            categoryFilter !== 'all' ||
            methodFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setMonthFilter('all');
                setTypeFilter('all');
                setCategoryFilter('all');
                setMethodFilter('all');
              }}
              className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline ml-auto"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Filtered Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
        <span className="text-slate-600 dark:text-slate-400">
          Showing <strong className="font-mono text-slate-900 dark:text-slate-100">{filteredTransactions.length}</strong>{' '}
          {filteredTransactions.length === 1 ? 'transaction' : 'transactions'}
        </span>
        <div className="flex flex-wrap items-center gap-5 font-mono">
          <span className="text-emerald-700 dark:text-emerald-400">
            Inflow: +{formatCurrency(totals.income, currency)}
          </span>
          <span className="text-slate-800 dark:text-slate-200">
            Outflow: -{formatCurrency(totals.expense, currency)}
          </span>
          <span
            className={
              totals.net >= 0
                ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                : 'font-semibold text-red-600 dark:text-red-400'
            }
          >
            Net: {totals.net >= 0 ? '+' : ''}
            {formatCurrency(totals.net, currency)}
          </span>
        </div>
      </div>

      {/* Transactions Data Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              No transactions match your current filters
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Try adjusting your search criteria or add a new entry.
            </p>
            <button
              type="button"
              onClick={onAddTransaction}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-lg hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Log First Entry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/50">
                  <th className="py-3 px-6">
                    <button
                      type="button"
                      onClick={() => toggleSort('merchant')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-200"
                    >
                      Merchant & Note
                      <ArrowDownUp className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => toggleSort('date')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-200"
                    >
                      Date
                      <ArrowDownUp className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('amount')}
                      className="inline-flex items-center gap-1 ml-auto hover:text-slate-900 dark:hover:text-slate-200"
                    >
                      Amount
                      <ArrowDownUp className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {filteredTransactions.map((tx) => {
                  const cat = categoryMap.get(tx.categoryId);
                  const isConfirming = confirmDeleteId === tx.id;
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
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
                        className={`py-3 px-4 text-right font-mono font-semibold whitespace-nowrap ${
                          tx.type === 'income'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatCurrency(tx.amount, currency)}
                      </td>
                      <td className="py-3 px-6 text-right whitespace-nowrap">
                        {isConfirming ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              disabled={deletingId === tx.id}
                              onClick={() => handleConfirmDelete(tx.id)}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              {deletingId === tx.id ? 'Deleting...' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onEditTransaction(tx)}
                              aria-label={`Edit ${tx.merchant}`}
                              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(tx.id)}
                              aria-label={`Delete ${tx.merchant}`}
                              className="p-1.5 rounded-md text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
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
