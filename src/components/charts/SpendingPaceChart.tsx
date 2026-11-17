import { useMemo, useState } from 'react';
import { CurrencyCode, Transaction } from '../../types/budget';
import { formatCurrency, formatMonthLabel, getDaysInMonth } from '../../lib/format';

interface SpendingPaceChartProps {
  monthKey: string;
  transactions: Transaction[];
  budgetLimit: number;
  limitLabel: string;
  currency: CurrencyCode;
  accentColor?: string;
}

export function SpendingPaceChart({
  monthKey,
  transactions,
  budgetLimit,
  limitLabel,
  currency,
  accentColor = '#0F766E',
}: SpendingPaceChartProps) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const daysInMonth = getDaysInMonth(monthKey);

  const dailySeries = useMemo(() => {
    const dailyTotals = new Array<number>(daysInMonth).fill(0);
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      if (!tx.date.startsWith(monthKey)) continue;
      const day = Number(tx.date.slice(8, 10));
      if (day >= 1 && day <= daysInMonth) {
        dailyTotals[day - 1] += tx.amount;
      }
    }

    let running = 0;
    return dailyTotals.map((daySpend, idx) => {
      running += daySpend;
      const dayNumber = idx + 1;
      const paceTarget = budgetLimit > 0 ? (budgetLimit * dayNumber) / daysInMonth : 0;
      return {
        day: dayNumber,
        daySpend,
        cumulative: running,
        paceTarget,
      };
    });
  }, [transactions, monthKey, daysInMonth, budgetLimit]);

  const totalSpent = dailySeries[dailySeries.length - 1]?.cumulative ?? 0;

  const chartWidth = 960;
  const chartHeight = 220;
  const padLeft = 58;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;
  const innerWidth = chartWidth - padLeft - padRight;
  const innerHeight = chartHeight - padTop - padBottom;

  const maxY = Math.max(totalSpent * 1.12, budgetLimit * 1.12, 500);

  const points = useMemo(() => {
    return dailySeries.map((d, idx) => {
      const x = padLeft + (idx / Math.max(1, daysInMonth - 1)) * innerWidth;
      const y = padTop + innerHeight - (d.cumulative / maxY) * innerHeight;
      const paceY = padTop + innerHeight - (d.paceTarget / maxY) * innerHeight;
      return { ...d, x, y, paceY };
    });
  }, [dailySeries, daysInMonth, innerWidth, innerHeight, maxY]);

  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    return points
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const baseline = padTop + innerHeight;
    return `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${baseline} L ${points[0].x.toFixed(1)} ${baseline} Z`;
  }, [linePath, points, innerHeight]);

  const activePoint =
    hoveredDay !== null
      ? points[hoveredDay - 1] ?? points[points.length - 1]
      : points[points.length - 1];

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => ({
    value: maxY * r,
    y: padTop + innerHeight - r * innerHeight,
  }));

  const xTicks = [1, 7, 14, 21, daysInMonth];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Cumulative Spending Pace · {formatMonthLabel(monthKey)}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Move pointer across days to inspect cumulative spend against {limitLabel.toLowerCase()}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300 shrink-0">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="w-3 h-0.5 inline-block"
              style={{ backgroundColor: accentColor }}
            />
            Actual Cumulative
          </span>
          {budgetLimit > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-slate-400 dark:border-slate-500 inline-block" />
              Linear Pace ({formatCurrency(budgetLimit, currency, true)})
            </span>
          )}
        </div>
      </div>

      {/* Interactive Day Scrubber Readout */}
      {activePoint && (
        <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 px-3.5 mb-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs">
          <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
            {monthKey}-{String(activePoint.day).padStart(2, '0')}
          </span>
          <div className="flex flex-wrap items-center gap-5 font-mono">
            <span className="text-slate-700 dark:text-slate-300">
              Day Spend: {formatCurrency(activePoint.daySpend, currency)}
            </span>
            <span className="text-slate-900 dark:text-slate-100 font-semibold">
              Cumulative: {formatCurrency(activePoint.cumulative, currency)}
            </span>
            {budgetLimit > 0 && (
              <span
                className={
                  activePoint.cumulative <= activePoint.paceTarget
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }
              >
                {activePoint.cumulative <= activePoint.paceTarget
                  ? `${formatCurrency(activePoint.paceTarget - activePoint.cumulative, currency)} below pace`
                  : `${formatCurrency(activePoint.cumulative - activePoint.paceTarget, currency)} ahead of pace`}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full min-w-[540px] h-auto select-none"
          role="img"
          aria-label="Daily cumulative spending pace line chart"
          onMouseLeave={() => setHoveredDay(null)}
        >
          <defs>
            <linearGradient id="paceFillGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.22" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines */}
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

          {/* X Axis Labels */}
          {xTicks.map((day) => {
            const pt = points[day - 1];
            if (!pt) return null;
            return (
              <text
                key={day}
                x={pt.x}
                y={chartHeight - 8}
                textAnchor="middle"
                className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
              >
                Day {day}
              </text>
            );
          })}

          {/* Linear Pace Reference Line */}
          {budgetLimit > 0 && points.length > 1 && (
            <line
              x1={points[0].x}
              y1={points[0].paceY}
              x2={points[points.length - 1].x}
              y2={points[points.length - 1].paceY}
              stroke="currentColor"
              className="text-slate-400 dark:text-slate-500"
              strokeWidth="1.5"
              strokeDasharray="6 4"
            />
          )}

          {/* Area & Line */}
          <path d={areaPath} fill="url(#paceFillGradient)" />
          <path
            d={linePath}
            fill="none"
            stroke={accentColor}
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active Crosshair */}
          {hoveredDay !== null && activePoint && (
            <g pointerEvents="none">
              <line
                x1={activePoint.x}
                y1={padTop}
                x2={activePoint.x}
                y2={padTop + innerHeight}
                stroke="currentColor"
                className="text-slate-300 dark:text-slate-700"
                strokeWidth="1"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="5"
                fill={accentColor}
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Invisible hit columns for smooth day scrubbing */}
          {points.map((pt) => {
            const colWidth = innerWidth / daysInMonth;
            return (
              <rect
                key={pt.day}
                x={pt.x - colWidth / 2}
                y={padTop}
                width={colWidth}
                height={innerHeight}
                fill="transparent"
                onMouseEnter={() => setHoveredDay(pt.day)}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
