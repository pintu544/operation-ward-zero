import { useState } from 'react';
import { fmtClock, type ConnMode } from './sim';
import { BandBadge, SectionTitle } from './components';
import type { WardSim } from './store';

export function AlertsView({ sim }: { sim: WardSim }) {
  const { alerts, ackAlert, resolveAlert, onDuty, base, escalateAfterSec } = sim;
  const open = alerts.filter((a) => a.status === 'open' || a.status === 'escalated');
  return (
    <div>
      <SectionTitle hint={`Alerts fire when the risk band rises. Critical alerts left unacknowledged for ${escalateAfterSec}s escalate to the remote supervisor.`}>
        Alerts &amp; Escalation — Alert → Respond
      </SectionTitle>
      {alerts.length === 0 ? (
        <p className="rounded-2xl bg-slate-900/70 p-6 text-sm text-slate-400 ring-1 ring-white/10">
          No alerts yet. Switch the Live Monitoring scenario to <strong className="text-slate-200">Deteriorating</strong> and
          watch the risk band rise — an alert will appear here with its reason.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {alerts.map((a) => {
            const secsLeft =
              a.status === 'open' && a.severity === 'Critical'
                ? Math.max(0, escalateAfterSec - Math.floor((Date.now() - a.createdReal) / 1000))
                : null;
            return (
              <li key={a.id} className="rounded-2xl bg-slate-900/70 p-4 ring-1 ring-white/10">
                <div className="flex flex-wrap items-center gap-2">
                  <BandBadge band={a.severity} />
                  <span className="text-sm font-semibold text-slate-100">
                    #{a.id} {a.title}
                  </span>
                  <span className="text-xs text-slate-500">{fmtClock(base, a.t)}</span>
                  <span className="ml-auto text-xs font-medium uppercase tracking-wider text-slate-400">
                    {a.status === 'escalated' ? 'Escalated → Dr. Nair' : a.status}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-slate-300">Trigger: {a.detail}.</p>
                {secsLeft !== null && (
                  <p className="mt-1 text-xs font-medium text-red-300">Escalates to supervisor in {secsLeft}s if unacknowledged.</p>
                )}
                {a.ackBy && (
                  <p className="mt-1 text-xs text-slate-400">
                    Acknowledged by {a.ackBy}
                    {a.responseSec ? ` after ${a.responseSec}s` : ''}.
                  </p>
                )}
                {(a.status === 'open' || a.status === 'escalated') && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => ackAlert(a.id, onDuty.name)}
                      className="rounded-lg bg-teal-400/15 px-3 py-1.5 text-sm font-semibold text-teal-200 ring-1 ring-teal-400/40 transition hover:bg-teal-400/25"
                    >
                      Acknowledge as {onDuty.name}
                    </button>
                    <span className="self-center text-xs text-slate-500">{open.length} alert(s) awaiting response</span>
                  </div>
                )}
                {a.status === 'acknowledged' && (
                  <button
                    onClick={() => resolveAlert(a.id)}
                    className="mt-3 rounded-lg bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate-200 ring-1 ring-white/15 transition hover:bg-white/10"
                  >
                    Mark resolved
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function CaregiverView({ sim }: { sim: WardSim }) {
  const { caregivers, toggleCheckIn, notes, addNote, alerts, base } = sim;
  const [text, setText] = useState('');
  const [author, setAuthor] = useState(caregivers[0].name);
  const responded = alerts.filter((a) => a.ackBy);
  return (
    <div>
      <SectionTitle hint="Who is on watch, how fast they respond, and what they observe. Notes feed the risk engine's context.">
        Caregiver — Attendance, Response &amp; Notes
      </SectionTitle>
      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-2xl bg-slate-900/70 p-5 ring-1 ring-white/10">
          <h3 className="text-sm font-semibold text-slate-100">Roster &amp; attendance</h3>
          <ul className="mt-3 space-y-2">
            {caregivers.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-xl bg-slate-800/50 px-3 py-2.5 ring-1 ring-white/5">
                <span className={`h-2 w-2 rounded-full ${c.checkedIn ? 'bg-teal-400' : 'bg-slate-600'}`} aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-100">{c.name}</p>
                  <p className="truncate text-xs text-slate-400">
                    {c.role}
                    {c.checkedIn && c.checkInT !== null ? ` · on watch since ${fmtClock(base, c.checkInT)}` : ' · off watch'}
                  </p>
                </div>
                <button
                  onClick={() => toggleCheckIn(c.id)}
                  className="ml-auto shrink-0 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 ring-1 ring-white/15 transition hover:bg-white/10"
                >
                  {c.checkedIn ? 'End watch' : 'Check in'}
                </button>
              </li>
            ))}
          </ul>
          <h3 className="mt-5 text-sm font-semibold text-slate-100">Alert response log</h3>
          {responded.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">No alert responses recorded yet.</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
              {responded.map((a) => (
                <li key={a.id} className="flex justify-between gap-3">
                  <span>
                    #{a.id} {a.severity} — {a.ackBy}
                  </span>
                  <span className="tnum text-slate-400">{a.responseSec}s response</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-2xl bg-slate-900/70 p-5 ring-1 ring-white/10">
          <h3 className="text-sm font-semibold text-slate-100">Caregiver notes</h3>
          <form
            className="mt-3 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) {
                addNote(author, text.trim());
                setText('');
              }
            }}
          >
            <label className="block text-xs text-slate-400">
              Author
              <select
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 ring-1 ring-white/10"
              >
                {caregivers.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} — {c.role}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-slate-400">
              Observation (try words like “breathless” or “dizzy” — the Risk view shows how notes change the score)
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder="e.g. Seemed breathless after walking to the door"
                className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 ring-1 ring-white/10 placeholder:text-slate-500"
              />
            </label>
            <button type="submit" className="rounded-lg bg-teal-400/15 px-3.5 py-2 text-sm font-semibold text-teal-200 ring-1 ring-teal-400/40 transition hover:bg-teal-400/25">
              Add note
            </button>
          </form>
          <ul className="mt-4 space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="rounded-xl bg-slate-800/50 px-3 py-2.5 ring-1 ring-white/5">
                <p className="text-sm text-slate-200">{n.text}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {n.author} · {fmtClock(base, n.t)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

const CONN_MODES: { id: ConnMode; label: string; desc: string }[] = [
  { id: 'online', label: 'Online', desc: 'Readings reach the platform as they are taken' },
  { id: 'delayed', label: 'Delayed', desc: 'Weak link — readings arrive in bursts every ~5 minutes' },
  { id: 'dropout', label: 'Dropout', desc: 'Link down — readings queue on the device (store-and-forward)' },
];

export function ReliabilityView({ sim }: { sim: WardSim }) {
  const { conn, setConn, queue, history, lastSyncT, syncLog, base } = sim;
  const queuedCount = queue.length;
  return (
    <div>
      <SectionTitle hint="Home links fail. WardZero queues readings on the device during an outage and syncs them, visibly, when the link returns.">
        Reliability — Surviving a Bad Connection
      </SectionTitle>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Connection simulator">
        {CONN_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setConn(m.id)}
            aria-pressed={conn === m.id}
            className={`rounded-xl px-3.5 py-2 text-left ring-1 transition ${
              conn === m.id ? 'bg-teal-400/15 text-teal-200 ring-teal-400/40' : 'bg-slate-900/70 text-slate-300 ring-white/10 hover:ring-white/25'
            }`}
          >
            <span className="block text-sm font-semibold">{m.label}</span>
            <span className="block text-[11px] text-slate-400">{m.desc}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <section className="rounded-2xl bg-slate-900/70 p-4 ring-1 ring-white/10">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Queued on device</h3>
          <p className={`tnum mt-1 text-3xl font-semibold ${queuedCount > 0 ? 'text-amber-300' : 'text-slate-50'}`}>{queuedCount}</p>
          <p className="text-xs text-slate-500">readings waiting to sync</p>
        </section>
        <section className="rounded-2xl bg-slate-900/70 p-4 ring-1 ring-white/10">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Received by platform</h3>
          <p className="tnum mt-1 text-3xl font-semibold text-slate-50">{history.length}</p>
          <p className="text-xs text-slate-500">readings, incl. back-filled syncs</p>
        </section>
        <section className="rounded-2xl bg-slate-900/70 p-4 ring-1 ring-white/10">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Last sync</h3>
          <p className="tnum mt-1 text-3xl font-semibold text-slate-50">{fmtClock(base, lastSyncT)}</p>
          <p className="text-xs text-slate-500">simulated ward time</p>
        </section>
      </div>
      <section className="mt-3 rounded-2xl bg-slate-900/70 p-5 ring-1 ring-white/10">
        <h3 className="text-sm font-semibold text-slate-100">Sync &amp; event log</h3>
        <ul className="mt-2 space-y-1 text-sm text-slate-300">
          {syncLog.map((l, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" aria-hidden />
              {l}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Design note: in a production deployment this queue would live in the sensor hub's local storage with
          at-least-once delivery and server-side de-duplication by reading timestamp. Here it is simulated in the
          browser so judges can watch the behaviour end to end.
        </p>
      </section>
    </div>
  );
}
