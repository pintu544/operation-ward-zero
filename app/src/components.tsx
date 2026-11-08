import type { Reading } from './sim';
import { BAND_STYLES, type Band } from './sim';

/** Multi-series SVG line chart over the received readings. */
export function TrendChart({
  history,
  pick,
  color,
  height = 84,
  label,
}: {
  history: Reading[];
  pick: (r: Reading) => number;
  color: string;
  height?: number;
  label: string;
}) {
  const W = 560;
  const H = height;
  const data = history.slice(-60);
  if (data.length < 2)
    return (
      <div className="flex items-center justify-center text-xs text-slate-500" style={{ height }}>
        Collecting readings…
      </div>
    );
  const vals = data.map(pick);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = (max - min) * 0.25 || 1;
  const lo = min - pad;
  const hi = max + pad;
  const pts = data
    .map((r, i) => `${((i / (data.length - 1)) * W).toFixed(1)},${(H - 6 - ((pick(r) - lo) / (hi - lo)) * (H - 12)).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label} preserveAspectRatio="none" style={{ height }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function VitalCard({
  label,
  value,
  unit,
  sub,
  warn,
  children,
}: {
  label: string;
  value: string;
  unit: string;
  sub: string;
  warn?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl bg-slate-900/70 ring-1 ${warn ? 'ring-red-400/40' : 'ring-white/10'} p-4`}>
      <div className="flex items-baseline justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</h3>
        <span className="text-[11px] text-slate-500">{sub}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={`tnum text-3xl font-semibold ${warn ? 'text-red-300' : 'text-slate-50'}`}>{value}</span>
        <span className="text-xs text-slate-400">{unit}</span>
      </div>
      {children}
    </section>
  );
}

export function BandBadge({ band, extra = '' }: { band: Band; extra?: string }) {
  const s = BAND_STYLES[band];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${s.bg} ${s.text} ${s.ring} ${extra}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {band}
    </span>
  );
}

/** Horizontal risk meter 0–100 with band ticks. */
export function RiskMeter({ score }: { score: number }) {
  return (
    <div>
      <div className="relative h-3 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ${score >= 75 ? 'bg-red-400' : score >= 50 ? 'bg-orange-400' : score >= 25 ? 'bg-amber-400' : 'bg-teal-400'}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-slate-500">
        <span>Low &lt;25</span>
        <span>Moderate 25–49</span>
        <span>High 50–74</span>
        <span>Critical ≥75</span>
      </div>
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-slate-50">{children}</h2>
      {hint && <p className="mt-0.5 text-sm text-slate-400">{hint}</p>}
    </div>
  );
}
