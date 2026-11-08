import { BAND_STYLES, fmtClock, projectOutlook, type Scenario } from './sim';
import { BandBadge, RiskMeter, SectionTitle, TrendChart, VitalCard } from './components';
import type { WardSim } from './store';

const SCENARIOS: { id: Scenario; label: string; desc: string }[] = [
  { id: 'stable', label: 'Stable', desc: 'Vitals hold near baseline' },
  { id: 'deteriorating', label: 'Deteriorating', desc: 'Slow drift: SpO2 ↓, HR ↑, temp ↑' },
  { id: 'dropout', label: 'Sensor dropout', desc: 'Connection fails; readings queue on-device' },
];

export function LiveView({ sim }: { sim: WardSim }) {
  const { history, latest, queue, conn, scenario, setScenario, base } = sim;
  const stale = conn === 'dropout';
  return (
    <div>
      <SectionTitle hint="Simulated bedside sensors stream one reading per simulated minute. Pick a scenario to drive the ward.">
        Live Monitoring — Aarav S., 68 (fictional patient)
      </SectionTitle>

      <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Scenario picker">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => setScenario(s.id)}
            aria-pressed={scenario === s.id}
            className={`rounded-xl px-3.5 py-2 text-left ring-1 transition ${
              scenario === s.id
                ? 'bg-teal-400/15 text-teal-200 ring-teal-400/40'
                : 'bg-slate-900/70 text-slate-300 ring-white/10 hover:ring-white/25'
            }`}
          >
            <span className="block text-sm font-semibold">{s.label}</span>
            <span className="block text-[11px] text-slate-400">{s.desc}</span>
          </button>
        ))}
        <span className={`ml-auto inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ring-1 ${stale ? 'bg-red-400/10 text-red-300 ring-red-400/30' : 'bg-teal-400/10 text-teal-300 ring-teal-400/30'}`}>
          <span className={`h-2 w-2 rounded-full ${stale ? 'bg-red-400' : 'bg-teal-400 animate-pulse'}`} aria-hidden />
          {stale ? `Sensor link down — ${queue.length} readings queued on device` : conn === 'delayed' ? 'Link degraded — readings arriving in bursts' : 'Sensor link live'}
        </span>
      </div>

      {!latest ? (
        <p className="rounded-2xl bg-slate-900/70 p-6 text-sm text-slate-400 ring-1 ring-white/10">Waiting for the first reading…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <VitalCard label="Heart rate" value={String(latest.hr)} unit="bpm" sub={`at ${fmtClock(base, latest.t)}`} warn={latest.hr > 110 || latest.hr < 45}>
              <TrendChart history={history} pick={(r) => r.hr} color="#2dd4bf" label="Heart rate trend" />
            </VitalCard>
            <VitalCard label="SpO2" value={latest.spo2.toFixed(1)} unit="%" sub="blood oxygen" warn={latest.spo2 < 94}>
              <TrendChart history={history} pick={(r) => r.spo2} color="#38bdf8" label="SpO2 trend" />
            </VitalCard>
            <VitalCard label="Blood pressure" value={`${latest.sys}/${latest.dia}`} unit="mmHg" sub="systolic / diastolic" warn={latest.sys > 150 || latest.sys < 90}>
              <TrendChart history={history} pick={(r) => r.sys} color="#a78bfa" label="Systolic blood pressure trend" />
            </VitalCard>
            <VitalCard label="Temperature" value={latest.temp.toFixed(1)} unit="°C" sub="body temperature" warn={latest.temp > 38.3}>
              <TrendChart history={history} pick={(r) => r.temp} color="#fbbf24" label="Temperature trend" />
            </VitalCard>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {history.length} readings received by the platform · {queue.length} queued on device · last platform reading at{' '}
            {fmtClock(base, latest.t)} ({latest.source}). Values are simulated — not from a real device.
          </p>
        </>
      )}
    </div>
  );
}

export function RiskView({ sim }: { sim: WardSim }) {
  const { risk, history, notes } = sim;
  const outlook = projectOutlook(history);
  const s = BAND_STYLES[risk.band];
  return (
    <div>
      <SectionTitle hint="A deterministic, rule-based score — every point is explained. No machine-learning model, no clinical claims.">
        Risk Engine — Understand &amp; Predict
      </SectionTitle>
      <div className="grid gap-3 lg:grid-cols-5">
        <section className={`rounded-2xl p-5 ring-1 lg:col-span-2 ${s.bg} ${s.ring}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Current risk</h3>
            <BandBadge band={risk.band} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`tnum text-6xl font-bold ${s.text}`}>{risk.score}</span>
            <span className="text-sm text-slate-400">/ 100</span>
          </div>
          <div className="mt-4">
            <RiskMeter score={risk.score} />
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-400">
            Bands: Low &lt;25 · Moderate 25–49 · High 50–74 · Critical ≥75. Recomputed on every received reading.
          </p>
        </section>
        <section className="rounded-2xl bg-slate-900/70 p-5 ring-1 ring-white/10 lg:col-span-3">
          <h3 className="text-sm font-semibold text-slate-100">Why this score — contributing factors</h3>
          <ul className="mt-3 space-y-2">
            {risk.factors.map((f, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
          <h3 className="mt-5 text-sm font-semibold text-slate-100">24–48h outlook (rule-based projection)</h3>
          <ul className="mt-2 space-y-2">
            {outlook.map((o, i) => (
              <li key={i} className="rounded-xl bg-slate-800/60 px-3 py-2 text-sm text-slate-300 ring-1 ring-white/5">
                {o.text} <span className="ml-1 text-[11px] uppercase tracking-wider text-slate-500">{o.horizon}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            The outlook simply extends today's measured drift rates in a straight line. It is a planning prompt for a
            human caregiver — not a diagnosis, not a prediction from a trained model, and not validated for clinical use.
          </p>
          {notes.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              Context in this score: {notes.length} caregiver note{notes.length > 1 ? 's' : ''} on file — concerning
              keywords in notes add listed points above.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
