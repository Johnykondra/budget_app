import { useMemo, useState } from 'react';
import { CurrencyCode } from '../../types/budget';
import { formatCurrency, formatShortMonth } from '../../lib/format';

export interface MonthlyPoint {
  monthKey: string;
  income: number;
  expenses: number;
}

interface MonthlyTrendChartProps {
  months: MonthlyPoint[];
  budgetTarget: number;
  selectedMonth: string;
  currency: CurrencyCode;
  onSelectMonth: (monthKey: string) => void;
}

export function MonthlyTrendChart({
  months,
  budgetTarget,
  selectedMonth,
  currency,
  onSelectMonth,
}: MonthlyTrendChartProps) {
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  const chartHeight = 220;
  const chartWidth = 560;
  const padLeft = 56;
  const padRight = 16;
  const padTop = 20;
  const padBottom = 34;
  const innerWidth = chartWidth - padLeft - padRight;
  const innerHeight = chartHeight - padTop - padBottom;

  const maxVal = useMemo(() => {
    const dataMax = months.reduce(
      (acc, m) => Math.max(acc, m.income, m.expenses),
      0
    );
    return Math.max(dataMax * 1.12, budgetTarget * 1.15, 1000);
  }, [months, budgetTarget]);

  const yTicks = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
      value: maxVal * ratio,
      y: padTop + innerHeight - ratio * innerHeight,
    }));
  }, [maxVal, innerHeight]);

  const budgetY = padTop + innerHeight - (budgetTarget / maxVal) * innerHeight;

  const inspectedMonth = useMemo(() => {
    const targetKey = hoveredMonth ?? selectedMonth;
    return months.find((m) => m.monthKey === targetKey) ?? months[months.length - 1] ?? null;
  }, [months, hoveredMonth, selectedMonth]);

  if (months.length === 0) {
    return null;
  }

  const groupWidth = innerWidth / months.length;
  const barWidth = Math.min(20, Math.max(10, groupWidth * 0.24));
  const barGap = 4;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            6-Month Cashflow & Budget Target
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select any month column to inspect that period
          </p>
        </div>

        {/* Inline Legend */}
        <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300 shrink-0">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 dark:bg-emerald-500 inline-block" />
            Income
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-800 dark:bg-slate-300 inline-block" />
            Spending
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-amber-600 dark:border-amber-400 inline-block" />
            Budget Target
          </span>
        </div>
      </div>

      {/* Live Inspected Month Strip */}
      {inspectedMonth && (
        <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 px-3 mb-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {formatShortMonth(inspectedMonth.monthKey)}
          </span>
          <div className="flex flex-wrap items-center gap-4 font-mono">
            <span className="text-emerald-700 dark:text-emerald-400">
              In: {formatCurrency(inspectedMonth.income, currency)}
            </span>
            <span className="text-slate-800 dark:text-slate-200">
              Out: {formatCurrency(inspectedMonth.expenses, currency)}
            </span>
            <span
              className={
                inspectedMonth.expenses <= budgetTarget
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }
            >
              {inspectedMonth.expenses <= budgetTarget
                ? `${formatCurrency(budgetTarget - inspectedMonth.expenses, currency)} under target`
                : `${formatCurrency(inspectedMonth.expenses - budgetTarget, currency)} over target`}
            </span>
          </div>
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full min-w-[420px] h-auto select-none"
          role="img"
          aria-label="Six month income versus spending bar chart"
        >
          {/* Horizontal gridlines */}
          {yTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={tick.y}
                x2={chartWidth - padRight}
                y2={tick.y}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
              >
                {formatCurrency(tick.value, currency, true)}
              </text>
            </g>
          ))}

          {/* Month Bars */}
          {months.map((m, idx) => {
            const centerX = padLeft + idx * groupWidth + groupWidth / 2;
            const isSelected = m.monthKey === selectedMonth;
            const isHovered = m.monthKey === hoveredMonth;

            const incomeHeight = (m.income / maxVal) * innerHeight;
            const expenseHeight = (m.expenses / maxVal) * innerHeight;
            const incomeY = padTop + innerHeight - incomeHeight;
            const expenseY = padTop + innerHeight - expenseHeight;
            const isOverTarget = budgetTarget > 0 && m.expenses > budgetTarget;

            return (
              <g
                key={m.monthKey}
                className="cursor-pointer"
                tabIndex={0}
                role="button"
                aria-label={`Select ${formatShortMonth(m.monthKey)}: Income ${formatCurrency(m.income, currency)}, Expenses ${formatCurrency(m.expenses, currency)}`}
                onMouseEnter={() => setHoveredMonth(m.monthKey)}
                onMouseLeave={() => setHoveredMonth(null)}
                onClick={() => onSelectMonth(m.monthKey)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectMonth(m.monthKey);
                  }
                }}
              >
                {/* Hover/Selected column highlight */}
                <rect
                  x={padLeft + idx * groupWidth + 4}
                  y={padTop}
                  width={groupWidth - 8}
                  height={innerHeight}
                  rx="6"
                  className={
                    isSelected
                      ? 'fill-slate-100 dark:fill-slate-800/70'
                      : isHovered
                      ? 'fill-slate-100/60 dark:fill-slate-800/40'
                      : 'fill-transparent'
                  }
                />

                {/* Income Bar */}
                <rect
                  x={centerX - barWidth - barGap / 2}
                  y={incomeY}
                  width={barWidth}
                  height={Math.max(2, incomeHeight)}
                  rx="3"
                  className="fill-emerald-600 dark:fill-emerald-500 transition-opacity duration-150"
                  opacity={isSelected || isHovered || !hoveredMonth ? 1 : 0.72}
                />

                {/* Expense Bar */}
                <rect
                  x={centerX + barGap / 2}
                  y={expenseY}
                  width={barWidth}
                  height={Math.max(2, expenseHeight)}
                  rx="3"
                  className={
                    isOverTarget
                      ? 'fill-red-600 dark:fill-red-500'
                      : 'fill-slate-800 dark:fill-slate-300'
                  }
                  opacity={isSelected || isHovered || !hoveredMonth ? 1 : 0.72}
                />

                {/* Month Axis Label */}
                <text
                  x={centerX}
                  y={chartHeight - 10}
                  textAnchor="middle"
                  className={`text-[11px] font-medium ${
                    isSelected
                      ? 'fill-slate-900 dark:fill-slate-100 font-semibold'
                      : 'fill-slate-500 dark:fill-slate-400'
                  }`}
                >
                  {formatShortMonth(m.monthKey)}
                </text>
              </g>
            );
          })}

          {/* Budget Target Reference Line */}
          {budgetTarget > 0 && budgetTarget <= maxVal && (
            <g pointerEvents="none">
              <line
                x1={padLeft}
                y1={budgetY}
                x2={chartWidth - padRight}
                y2={budgetY}
                stroke="#D97706"
                strokeWidth="1.5"
                strokeDasharray="5 4"
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
