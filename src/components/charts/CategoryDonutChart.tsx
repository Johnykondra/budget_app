import { useMemo, useState } from 'react';
import { Category, CurrencyCode } from '../../types/budget';
import { formatCurrency } from '../../lib/format';
import { CategoryIcon } from '../CategoryIcon';

export interface CategorySpendSlice {
  category: Category;
  spent: number;
  transactionCount: number;
  sharePercent: number;
}

interface CategoryDonutChartProps {
  slices: CategorySpendSlice[];
  totalSpent: number;
  currency: CurrencyCode;
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  onCreateCategory: () => void;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeRingArc(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
) {
  const startOuter = polarToCartesian(cx, cy, outerRadius, endAngle);
  const endOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
  const startInner = polarToCartesian(cx, cy, innerRadius, endAngle);
  const endInner = polarToCartesian(cx, cy, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', startOuter.x, startOuter.y,
    'A', outerRadius, outerRadius, 0, largeArcFlag, 0, endOuter.x, endOuter.y,
    'L', endInner.x, endInner.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 1, startInner.x, startInner.y,
    'Z',
  ].join(' ');
}

export function CategoryDonutChart({
  slices,
  totalSpent,
  currency,
  selectedCategoryId,
  onSelectCategory,
  onCreateCategory,
}: CategoryDonutChartProps) {
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null);

  const activeCategoryId = hoveredCategoryId ?? selectedCategoryId;

  const activeSlice = useMemo(
    () => slices.find((s) => s.category.id === activeCategoryId) ?? null,
    [slices, activeCategoryId]
  );

  const arcPaths = useMemo(() => {
    if (slices.length === 0 || totalSpent <= 0) return [];
    const gapDeg = slices.length === 1 ? 0 : 2.2;
    let currentAngle = 0;

    return slices.map((slice) => {
      const sweep = Math.max(2, (slice.spent / totalSpent) * 360);
      const start = currentAngle + gapDeg / 2;
      const end = currentAngle + sweep - gapDeg / 2;
      currentAngle += sweep;

      const isSingleFull = slices.length === 1 && sweep >= 359.5;
      const path = isSingleFull
        ? describeRingArc(110, 110, 96, 62, 0, 359.99)
        : describeRingArc(110, 110, 96, 62, start, Math.max(start + 0.5, end));

      return {
        slice,
        path,
      };
    });
  }, [slices, totalSpent]);

  if (slices.length === 0 || totalSpent <= 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between min-h-[340px]">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Spending by Category
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Click a slice or row to filter transactions
          </p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            No expenses recorded for this period
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
            Log an expense or switch months to inspect category distribution.
          </p>
          <button
            type="button"
            onClick={onCreateCategory}
            className="mt-4 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Manage Custom Categories
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Spending by Category
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Click a slice or category row to cross-filter the dashboard
          </p>
        </div>
        {selectedCategoryId && (
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            Clear filter
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Interactive SVG Ring */}
        <div className="lg:col-span-5 flex items-center justify-center">
          <div className="relative w-[220px] h-[220px]">
            <svg
              viewBox="0 0 220 220"
              className="w-full h-full overflow-visible"
              role="img"
              aria-label="Category spending distribution donut chart"
            >
              {arcPaths.map(({ slice, path }) => {
                const isSelected = selectedCategoryId === slice.category.id;
                const isHovered = hoveredCategoryId === slice.category.id;
                const isDimmed =
                  activeCategoryId !== null && activeCategoryId !== slice.category.id;

                return (
                  <path
                    key={slice.category.id}
                    d={path}
                    fill={slice.category.color}
                    opacity={isDimmed ? 0.28 : 1}
                    transform={
                      isSelected || isHovered ? 'scale(1.035)' : 'scale(1)'
                    }
                    style={{
                      transformOrigin: '110px 110px',
                      transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1), opacity 160ms ease',
                      cursor: 'pointer',
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${slice.category.name}: ${formatCurrency(slice.spent, currency)} (${slice.sharePercent.toFixed(1)}%)`}
                    onMouseEnter={() => setHoveredCategoryId(slice.category.id)}
                    onMouseLeave={() => setHoveredCategoryId(null)}
                    onClick={() =>
                      onSelectCategory(
                        selectedCategoryId === slice.category.id
                          ? null
                          : slice.category.id
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectCategory(
                          selectedCategoryId === slice.category.id
                            ? null
                            : slice.category.id
                        );
                      }
                    }}
                  />
                );
              })}
            </svg>

            {/* Center Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6 text-center">
              {activeSlice ? (
                <>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[116px]">
                    {activeSlice.category.name}
                  </span>
                  <span className="text-lg font-semibold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                    {formatCurrency(activeSlice.spent, currency)}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                    {activeSlice.sharePercent.toFixed(1)}% of spend
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Total Expenses
                  </span>
                  <span className="text-lg font-semibold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                    {formatCurrency(totalSpent, currency)}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {slices.length} active {slices.length === 1 ? 'category' : 'categories'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Synchronized Category Matrix */}
        <div className="lg:col-span-7 divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[260px] overflow-y-auto pr-1">
          {slices.map((slice) => {
            const isSelected = selectedCategoryId === slice.category.id;
            const limit = slice.category.monthlyLimit;
            const utilization = limit > 0 ? (slice.spent / limit) * 100 : 0;
            const isOver = limit > 0 && slice.spent > limit;
            const isWarning = limit > 0 && !isOver && utilization >= 80;

            return (
              <button
                key={slice.category.id}
                type="button"
                onMouseEnter={() => setHoveredCategoryId(slice.category.id)}
                onMouseLeave={() => setHoveredCategoryId(null)}
                onClick={() =>
                  onSelectCategory(isSelected ? null : slice.category.id)
                }
                className={`w-full text-left py-2.5 px-2.5 rounded-lg transition-colors flex items-center justify-between gap-3 focus-visible:outline-2 focus-visible:outline-emerald-600 ${
                  isSelected
                    ? 'bg-slate-100 dark:bg-slate-800'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-white"
                    style={{ backgroundColor: slice.category.color }}
                  >
                    <CategoryIcon icon={slice.category.icon} className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {slice.category.name}
                      </span>
                      {isOver && (
                        <span className="text-[11px] font-medium text-red-600 dark:text-red-400 shrink-0">
                          Over budget
                        </span>
                      )}
                      {isWarning && (
                        <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 shrink-0">
                          Near limit
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono">{slice.sharePercent.toFixed(1)}%</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {slice.transactionCount}{' '}
                        {slice.transactionCount === 1 ? 'entry' : 'entries'}
                      </span>
                      {limit > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">
                            Limit {formatCurrency(limit, currency, true)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-semibold font-mono text-slate-900 dark:text-slate-100">
                    {formatCurrency(slice.spent, currency)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
