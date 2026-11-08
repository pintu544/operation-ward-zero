import { useState } from 'react';
import { useWardSim } from './store';
import { BandBadge } from './components';
import { LiveView, RiskView } from './viewsLive';
import { AlertsView, CaregiverView, ReliabilityView } from './viewsCare';
import { DocsView } from './viewsDocs';
import { fmtClock } from './sim';

const TABS = [
  { id: 'live', label: 'Live Monitoring' },
  { id: 'risk', label: 'Risk Engine' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'caregiver', label: 'Caregiver' },
  { id: 'reliability', label: 'Reliability' },
  { id: 'docs', label: 'Docs' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const MISSION = ['Sense', 'Understand', 'Predict', 'Alert', 'Respond'];

export default function App() {
  const sim = useWardSim();
  const [tab, setTab] = useState<TabId>('live');
  const openAlerts = sim.alerts.filter((a) => a.status === 'open' || a.status === 'escalated').length;

  return (
    <div className="min-h-screen bg-[#0b1220] text-slate-200">
      {/* Synthetic-data banner — honesty first, always visible */}
      <div className="bg-amber-400/90 px-4 py-1.5 text-center text-xs font-semibold text-amber-950">
        Synthetic demo data — not for clinical use. The patient, vitals and caregivers are fictional and generated in
        your browser.
      </div>

      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-50">
              Ward<span className="text-teal-300">Zero</span>
            </h1>
            <p className="text-xs text-slate-400">Home Ward Monitoring &amp; Response · a hospital ward that fits in a bedroom</p>
          </div>
          <ol className="hidden items-center gap-1.5 md:flex" aria-label="Mission: Sense, Understand, Predict, Alert, Respond">
            {MISSION.map((m, i) => (
              <li key={m} className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                <span className="rounded-md bg-white/5 px-2 py-1 ring-1 ring-white/10">{m}</span>
                {i < MISSION.length - 1 && <span aria-hidden className="text-slate-600">→</span>}
              </li>
            ))}
          </ol>
          <div className="ml-auto flex items-center gap-3">
            <span className="tnum text-xs text-slate-400">Ward time {fmtClock(sim.base, sim.simMin)}</span>
            <BandBadge band={sim.risk.band} />
            <button
              onClick={() => setTab('alerts')}
              className="relative rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 ring-1 ring-white/15 transition hover:bg-white/10"
            >
              Alerts
              {openAlerts > 0 && (
                <span className="tnum absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                  {openAlerts}
                </span>
              )}
            </button>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl px-4 pb-3" aria-label="Ward views">
          <ul className="flex flex-wrap gap-1.5">
            {TABS.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id ? 'page' : undefined}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    tab === t.id ? 'bg-teal-400/15 text-teal-200 ring-1 ring-teal-400/40' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === 'live' && <LiveView sim={sim} />}
        {tab === 'risk' && <RiskView sim={sim} />}
        {tab === 'alerts' && <AlertsView sim={sim} />}
        {tab === 'caregiver' && <CaregiverView sim={sim} />}
        {tab === 'reliability' && <ReliabilityView sim={sim} />}
        {tab === 'docs' && <DocsView />}
      </main>

      <footer className="border-t border-white/10 py-4">
        <p className="mx-auto max-w-6xl px-4 text-xs text-slate-500">
          WardZero · Operation Ward Zero (Wooble Software Pvt Ltd) · Team Tech Bro · Simulated sensors, synthetic
          patient, rule-based explainable risk — no real patient data, no clinical claims.
        </p>
      </footer>
    </div>
  );
}
