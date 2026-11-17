import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  CATEGORY_COLOR_SWATCHES,
  CATEGORY_ICONS,
  Category,
  CategoryIconKey,
  CurrencyCode,
  TransactionType,
  VALIDATION_LIMITS,
} from '../../types/budget';
import { CategoryIcon } from '../CategoryIcon';

interface CategoryModalProps {
  isOpen: boolean;
  editingCategory: Category | null;
  currency: CurrencyCode;
  onClose: () => void;
  onSave: (
    payload: Omit<Category, 'id' | 'userId'>,
    existingId?: string
  ) => Promise<void>;
}

export function CategoryModal({
  isOpen,
  editingCategory,
  currency,
  onClose,
  onSave,
}: CategoryModalProps) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<TransactionType>('expense');
  const [color, setColor] = useState<string>(CATEGORY_COLOR_SWATCHES[0]);
  const [icon, setIcon] = useState<CategoryIconKey>('layers');
  const [monthlyLimit, setMonthlyLimit] = useState('300');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editingCategory) {
      setName(editingCategory.name);
      setKind(editingCategory.kind);
      setColor(editingCategory.color);
      setIcon(editingCategory.icon);
      setMonthlyLimit(String(editingCategory.monthlyLimit));
    } else {
      setName('');
      setKind('expense');
      setColor(CATEGORY_COLOR_SWATCHES[0]);
      setIcon('layers');
      setMonthlyLimit('300');
    }
  }, [isOpen, editingCategory]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > VALIDATION_LIMITS.MAX_CATEGORY_NAME_LENGTH) {
      setError(`Category name must be 1 to ${VALIDATION_LIMITS.MAX_CATEGORY_NAME_LENGTH} characters.`);
      return;
    }

    if (!VALIDATION_LIMITS.HEX_COLOR_PATTERN.test(color)) {
      setError('Select a valid 6-digit hex color.');
      return;
    }

    const parsedLimit = kind === 'income' ? 0 : Number(monthlyLimit || 0);
    if (!Number.isFinite(parsedLimit) || parsedLimit < 0 || parsedLimit > VALIDATION_LIMITS.MAX_AMOUNT) {
      setError(`Monthly limit must be between 0 and ${VALIDATION_LIMITS.MAX_AMOUNT.toLocaleString()}.`);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(
        {
          name: trimmedName,
          kind,
          color,
          icon,
          monthlyLimit: Math.round(parsedLimit * 100) / 100,
          isArchived: editingCategory?.isArchived ?? false,
        },
        editingCategory?.id
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save category.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-modal-title"
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 id="category-modal-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {editingCategory ? 'Edit Custom Category' : 'Create Custom Category'}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Kind Toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setKind('expense')}
              className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                kind === 'expense'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Expense Category
            </button>
            <button
              type="button"
              onClick={() => setKind('income')}
              className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                kind === 'income'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Income Category
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Category Name
              </label>
              <input
                type="text"
                required
                maxLength={VALIDATION_LIMITS.MAX_CATEGORY_NAME_LENGTH}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Subscriptions, Pet Care"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {kind === 'expense' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Monthly Limit ({currency})
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max={VALIDATION_LIMITS.MAX_AMOUNT}
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(e.target.value)}
                  placeholder="0 for no cap"
                  className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            )}
          </div>

          {/* Color Swatches */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Chart Color
              </label>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {color.toUpperCase()}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {CATEGORY_COLOR_SWATCHES.map((swatch) => {
                const selected = color.toLowerCase() === swatch.toLowerCase();
                return (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setColor(swatch)}
                    aria-label={`Select color ${swatch}`}
                    className={`w-7 h-7 rounded-lg transition-transform ${
                      selected
                        ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-slate-100 dark:ring-offset-slate-900 scale-105'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: swatch }}
                  />
                );
              })}
            </div>
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Category Icon
            </label>
            <div className="grid grid-cols-7 gap-2">
              {CATEGORY_ICONS.map((iconKey) => {
                const selected = icon === iconKey;
                return (
                  <button
                    key={iconKey}
                    type="button"
                    onClick={() => setIcon(iconKey)}
                    aria-label={`Select ${iconKey} icon`}
                    className={`h-10 rounded-lg border flex items-center justify-center transition-colors ${
                      selected
                        ? 'border-slate-900 dark:border-emerald-500 bg-slate-900 dark:bg-emerald-600 text-white'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <CategoryIcon icon={iconKey} className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-lg hover:bg-slate-800 dark:hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Saving...' : editingCategory ? 'Save Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
