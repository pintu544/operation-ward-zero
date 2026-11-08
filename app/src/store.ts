import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BASELINE,
  assessRisk,
  stepVitals,
  toReading,
  type Band,
  type ConnMode,
  type Reading,
  type Scenario,
  type VitalsState,
} from './sim';

export interface Alert {
  id: number;
  t: number; // sim minute created
  severity: Band;
  title: string;
  detail: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'escalated';
  createdReal: number;
  ackBy?: string;
  responseSec?: number;
}

export interface Caregiver {
  id: number;
  name: string;
  role: string;
  checkedIn: boolean;
  checkInT: number | null;
}

export interface Note {
  id: number;
  author: string;
  text: string;
  t: number;
}

const BAND_RANK: Record<Band, number> = { Low: 0, Moderate: 1, High: 2, Critical: 3 };
const ESCALATE_AFTER_SEC = 40;

const INITIAL_CAREGIVERS: Caregiver[] = [
  { id: 1, name: 'Meera K.', role: 'Family caregiver (daughter)', checkedIn: true, checkInT: 0 },
  { id: 2, name: 'Ravi S.', role: 'Trained attendant', checkedIn: false, checkInT: null },
  { id: 3, name: 'Dr. Nair (remote)', role: 'Supervising clinician', checkedIn: false, checkInT: null },
];

export function useWardSim() {
  const [base] = useState(() => new Date());
  const [history, setHistory] = useState<Reading[]>([]);
  const [queue, setQueue] = useState<Reading[]>([]);
  const [scenario, setScenarioState] = useState<Scenario>('stable');
  const [conn, setConnState] = useState<ConnMode>('online');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>(INITIAL_CAREGIVERS);
  const [notes, setNotes] = useState<Note[]>([
    { id: 1, author: 'Meera K.', text: 'Morning medicines given. Ate half his breakfast, seemed tired.', t: 0 },
  ]);
  const [syncLog, setSyncLog] = useState<string[]>(['Monitoring started — sensors connected.']);
  const [lastSyncT, setLastSyncT] = useState(0);
  const [simMin, setSimMin] = useState(0);
  const [, setNowTick] = useState(0); // forces escalation countdown re-render

  const vitals = useRef<VitalsState>({ ...BASELINE });
  const delayBuf = useRef<Reading[]>([]);
  const tickCount = useRef(0);
  const lastBand = useRef<Band>('Low');
  const alertId = useRef(0);
  const noteId = useRef(1);
  const connRef = useRef<ConnMode>('online');
  const scenarioRef = useRef<Scenario>('stable');

  const noteTexts = useMemo(() => notes.map((n) => n.text), [notes]);
  const risk = useMemo(() => assessRisk(history, noteTexts), [history, noteTexts]);
  const latest = history.length ? history[history.length - 1] : null;

  const pushLog = (msg: string) => setSyncLog((l) => [msg, ...l].slice(0, 30));

  const maybeAlert = (hist: Reading[]) => {
    const r = assessRisk(hist, noteTexts);
    if (BAND_RANK[r.band] > BAND_RANK[lastBand.current] && BAND_RANK[r.band] >= 1) {
      alertId.current += 1;
      const top = r.factors[0] ?? 'Risk band rose';
      setAlerts((a) => [
        {
          id: alertId.current,
          t: hist[hist.length - 1].t,
          severity: r.band,
          title: `${r.band} risk — score ${r.score}/100`,
          detail: top.replace(/ — \+\d+$/, ''),
          status: 'open',
          createdReal: Date.now(),
        },
        ...a,
      ]);
    }
    if (BAND_RANK[r.band] < BAND_RANK[lastBand.current]) {
      // auto-resolve acknowledged alerts when the patient recovers a band
      setAlerts((a) =>
        a.map((al) =>
          al.status === 'acknowledged' && BAND_RANK[al.severity] > BAND_RANK[r.band]
            ? { ...al, status: 'resolved' as const }
            : al,
        ),
      );
    }
    lastBand.current = r.band;
  };

  // Main simulation tick: 1 tick = 1 simulated minute, every 1.1s real time.
  useEffect(() => {
    const iv = setInterval(() => {
      tickCount.current += 1;
      const t = tickCount.current;
      setSimMin(t);
      vitals.current = stepVitals(vitals.current, scenarioRef.current);
      const mode = connRef.current;

      if (mode === 'dropout') {
        const r = toReading(vitals.current, t, 'queued');
        setQueue((q) => [...q.slice(-120), r]);
        return;
      }
      if (mode === 'delayed') {
        delayBuf.current.push(toReading(vitals.current, t, 'live'));
        if (tickCount.current % 5 === 0) {
          const batch = delayBuf.current;
          delayBuf.current = [];
          setHistory((h) => {
            const next = [...h, ...batch].slice(-240);
            maybeAlert(next);
            return next;
          });
          setLastSyncT(t);
        }
        return;
      }
      const r = toReading(vitals.current, t, 'live');
      setHistory((h) => {
        const next = [...h, r].slice(-240);
        maybeAlert(next);
        return next;
      });
      setLastSyncT(t);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 1100);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteTexts]);

  // Escalation watcher (real seconds) + countdown ticker
  useEffect(() => {
    const iv = setInterval(() => {
      setNowTick((n) => n + 1);
      setAlerts((a) =>
        a.map((al) => {
          if (al.status === 'open' && al.severity === 'Critical' && Date.now() - al.createdReal > ESCALATE_AFTER_SEC * 1000) {
            pushLog(`Alert #${al.id} unacknowledged for ${ESCALATE_AFTER_SEC}s — escalated to Dr. Nair (remote supervisor).`);
            return { ...al, status: 'escalated' as const };
          }
          return al;
        }),
      );
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setScenario = (s: Scenario) => {
    scenarioRef.current = s;
    setScenarioState(s);
    if (s === 'dropout') setConn('dropout');
    else if (connRef.current === 'dropout') setConn('online');
    pushLog(`Scenario changed to "${s}".`);
  };

  const setConn = (mode: ConnMode) => {
    const prev = connRef.current;
    connRef.current = mode;
    setConnState(mode);
    if (prev === 'dropout' && mode !== 'dropout') {
      // store-and-forward flush: everything queued while offline now syncs
      setQueue((q) => {
        if (q.length > 0) {
          const synced = q.map((r) => ({ ...r, source: 'synced' as const }));
          setHistory((h) => [...h, ...synced].slice(-240));
          setLastSyncT(tickCount.current);
          pushLog(`Connection restored — ${q.length} queued readings synced to the platform.`);
        } else {
          pushLog('Connection restored — no queued readings.');
        }
        return [];
      });
    }
    if (mode === 'dropout') pushLog('Connection lost (simulated) — readings are being queued on the device.');
    if (mode === 'delayed') pushLog('Connection degraded (simulated) — readings arriving in delayed bursts.');
    if (mode === 'online' && prev === 'delayed') pushLog('Connection healthy again — live readings resumed.');
  };

  const ackAlert = (id: number, by: string) => {
    setAlerts((a) =>
      a.map((al) =>
        al.id === id && (al.status === 'open' || al.status === 'escalated')
          ? { ...al, status: 'acknowledged', ackBy: by, responseSec: Math.max(1, Math.round((Date.now() - al.createdReal) / 1000)) }
          : al,
      ),
    );
    pushLog(`Alert #${id} acknowledged by ${by}.`);
  };

  const resolveAlert = (id: number) =>
    setAlerts((a) => a.map((al) => (al.id === id ? { ...al, status: 'resolved' as const } : al)));

  const toggleCheckIn = (id: number) =>
    setCaregivers((cs) =>
      cs.map((c) =>
        c.id === id ? { ...c, checkedIn: !c.checkedIn, checkInT: !c.checkedIn ? tickCount.current : null } : c,
      ),
    );

  const addNote = (author: string, text: string) => {
    noteId.current += 1;
    setNotes((n) => [{ id: noteId.current, author, text, t: tickCount.current }, ...n]);
  };

  const onDuty = caregivers.find((c) => c.checkedIn) ?? caregivers[0];

  return {
    base,
    history,
    queue,
    scenario,
    setScenario,
    conn,
    setConn,
    alerts,
    ackAlert,
    resolveAlert,
    caregivers,
    toggleCheckIn,
    notes,
    addNote,
    syncLog,
    lastSyncT,
    simMin,
    risk,
    latest,
    onDuty,
    escalateAfterSec: ESCALATE_AFTER_SEC,
  };
}

export type WardSim = ReturnType<typeof useWardSim>;
