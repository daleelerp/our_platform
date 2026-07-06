"use client";

import { useId, useState } from "react";

type MonthlyPoint = {
  month: string; // "YYYY-MM"
  gross: number;
  fees: number;
  net: number;
  expenses: number;
  profit: number;
  paid_count: number;
};

type Props = {
  monthly: MonthlyPoint[];
};

// Fixed categorical slot order (validated: node scripts/validate_palette.js "#2a78d6,#1baf7a,#eda100" --mode light -> PASS).
const SERIES = [
  { key: "gross" as const, label: "Gross revenue", color: "#2a78d6" },
  { key: "fees" as const, label: "Gateway fees", color: "#1baf7a" },
  { key: "profit" as const, label: "Net profit", color: "#eda100" },
];

const WIDTH = 960;
const HEIGHT = 320;
const PAD_LEFT = 56;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 32;

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, 1)).toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });
}

function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const steps = [1, 2, 2.5, 5, 10];
  for (const step of steps) {
    const candidate = step * magnitude;
    if (candidate >= value) return candidate;
  }
  return 10 * magnitude;
}

function formatCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}K`;
  return `${sign}${Math.round(abs)}`;
}

export function FinanceTrendChart({ monthly }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const gradientId = useId();

  if (monthly.length === 0) {
    return <p className="text-sm text-slate-500">No revenue data yet.</p>;
  }

  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const maxVal = niceMax(Math.max(...monthly.map((m) => Math.max(m.gross, m.fees, m.profit, 0))));
  const n = monthly.length;
  const xFor = (i: number) => PAD_LEFT + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yFor = (v: number) => PAD_TOP + plotH - (Math.max(v, 0) / maxVal) * plotH;

  const linePath = (key: (typeof SERIES)[number]["key"]) =>
    monthly.map((m, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(m[key]).toFixed(1)}`).join(" ");

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxVal * f));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-wrap items-center gap-4">
          {SERIES.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5 text-sm text-slate-600">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowTable((v) => !v)}
          className="text-xs text-teal-600 hover:text-teal-700 font-medium"
        >
          {showTable ? "View as chart" : "View as table"}
        </button>
      </div>

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-4">Month</th>
                <th className="py-2 pr-4 text-right">Gross</th>
                <th className="py-2 pr-4 text-right">Fees</th>
                <th className="py-2 pr-4 text-right">Expenses</th>
                <th className="py-2 pr-4 text-right">Net profit</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((m) => (
                <tr key={m.month} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-700">{monthLabel(m.month)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{Math.round(m.gross).toLocaleString()}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{Math.round(m.fees).toLocaleString()}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{Math.round(m.expenses).toLocaleString()}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{Math.round(m.profit).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full min-w-[640px]"
            role="img"
            aria-label="Monthly gross revenue, gateway fees, and net profit trend"
            onMouseLeave={() => setHoverIdx(null)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
              const idx = Math.round(((relX - PAD_LEFT) / plotW) * (n - 1));
              setHoverIdx(Math.min(Math.max(idx, 0), n - 1));
            }}
          >
            <defs>
              <clipPath id={gradientId}>
                <rect x={PAD_LEFT} y={PAD_TOP} width={plotW} height={plotH} />
              </clipPath>
            </defs>

            {/* Gridlines + y ticks */}
            {yTicks.map((t) => (
              <g key={t}>
                <line
                  x1={PAD_LEFT}
                  x2={WIDTH - PAD_RIGHT}
                  y1={yFor(t)}
                  y2={yFor(t)}
                  stroke="#e1e0d9"
                  strokeWidth={1}
                />
                <text x={PAD_LEFT - 8} y={yFor(t) + 4} textAnchor="end" fontSize={11} fill="#898781">
                  {formatCompact(t)}
                </text>
              </g>
            ))}

            {/* Baseline */}
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={PAD_TOP + plotH}
              y2={PAD_TOP + plotH}
              stroke="#c3c2b7"
              strokeWidth={1}
            />

            {/* X labels (every other month if crowded) */}
            {monthly.map((m, i) => {
              const skip = n > 8 && i % 2 !== 0 && i !== n - 1;
              if (skip) return null;
              return (
                <text
                  key={m.month}
                  x={xFor(i)}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#898781"
                >
                  {monthLabel(m.month)}
                </text>
              );
            })}

            {/* Hover crosshair */}
            {hoverIdx !== null && (
              <line
                x1={xFor(hoverIdx)}
                x2={xFor(hoverIdx)}
                y1={PAD_TOP}
                y2={PAD_TOP + plotH}
                stroke="#c3c2b7"
                strokeWidth={1}
              />
            )}

            {/* Series lines + end markers */}
            {SERIES.map((s) => (
              <g key={s.key} clipPath={`url(#${gradientId})`}>
                <path d={linePath(s.key)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              </g>
            ))}
            {SERIES.map((s) => {
              const last = monthly[monthly.length - 1];
              return (
                <g key={`${s.key}-end`}>
                  <circle cx={xFor(n - 1)} cy={yFor(last[s.key])} r={5} fill={s.color} stroke="#fcfcfb" strokeWidth={2} />
                  <text
                    x={xFor(n - 1) + 8}
                    y={yFor(last[s.key]) + 4}
                    fontSize={11}
                    fill="#52514e"
                    className="tabular-nums"
                  >
                    {formatCompact(last[s.key])}
                  </text>
                </g>
              );
            })}

            {/* Hover dots */}
            {hoverIdx !== null &&
              SERIES.map((s) => (
                <circle
                  key={`${s.key}-hover`}
                  cx={xFor(hoverIdx)}
                  cy={yFor(monthly[hoverIdx][s.key])}
                  r={4}
                  fill={s.color}
                  stroke="#fcfcfb"
                  strokeWidth={2}
                />
              ))}
          </svg>

          {hoverIdx !== null && (
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm">
              <span className="font-medium text-slate-700">{monthLabel(monthly[hoverIdx].month)}</span>
              {SERIES.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5 text-slate-600 tabular-nums">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}: {Math.round(monthly[hoverIdx][s.key]).toLocaleString()} EGP
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
