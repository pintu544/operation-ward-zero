// WardZero simulation core: vitals generator, connection model, risk engine.
// Everything here is deterministic rule-based logic over SYNTHETIC data.
// There is no ML model and no clinical validity — see Docs view / README.

export interface Reading {
  /** simulated minutes since monitoring started */
  t: number;
  hr: number; // bpm
  spo2: number; // %
  sys: number; // mmHg
  dia: number; // mmHg
  temp: number; // °C
  source: 'live' | 'queued' | 'synced';
}

export type Scenario = 'stable' | 'deteriorating' | 'dropout';
export type ConnMode = 'online' | 'delayed' | 'dropout';

export interface VitalsState {
  hr: number;
  spo2: number;
  sys: number;
  dia: number;
  temp: number;
}

export const BASELINE: VitalsState = { hr: 72, spo2: 97.5, sys: 118, dia: 76, temp: 36.7 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Small seeded PRNG so a session is reproducible-ish and calm (no wild jumps).
let seed = 42;
function rnd() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
const jitter = (amp: number) => (rnd() - 0.5) * 2 * amp;

/** Advance the patient's true vitals by one simulated minute. */
export function stepVitals(v: VitalsState, scenario: Scenario): VitalsState {
  if (scenario === 'stable') {
    return {
      hr: clamp(v.hr + (BASELINE.hr - v.hr) * 0.08 + jitter(1.6), 55, 95),
      spo2: clamp(v.spo2 + (BASELINE.spo2 - v.spo2) * 0.1 + jitter(0.25), 95, 99.5),
      sys: clamp(v.sys + (BASELINE.sys - v.sys) * 0.08 + jitter(2.5), 100, 135),
      dia: clamp(v.dia + (BASELINE.dia - v.dia) * 0.08 + jitter(1.8), 60, 88),
      temp: clamp(v.temp + (BASELINE.temp - v.temp) * 0.08 + jitter(0.05), 36.2, 37.3),
    };
  }
  if (scenario === 'deteriorating') {
    // Slow drift: trends (not spikes) are what the risk engine is built to catch.
    return {
      hr: clamp(v.hr + 0.75 + jitter(1.2), 55, 148),
      spo2: clamp(v.spo2 - 0.075 + jitter(0.18), 82, 99.5),
      sys: clamp(v.sys + 0.55 + jitter(2), 95, 182),
      dia: clamp(v.dia + 0.3 + jitter(1.4), 55, 110),
      temp: clamp(v.temp + 0.022 + jitter(0.04), 36.2, 39.8),
    };
  }
  // dropout scenario: patient stays roughly stable; the SENSORS are what fail
  // (handled by the connection model), so vitals behave like the stable case.
  return stepVitals(v, 'stable');
}

export function toReading(v: VitalsState, t: number, source: Reading['source']): Reading {
  return {
    t,
    hr: Math.round(v.hr),
    spo2: Math.round(v.spo2 * 10) / 10,
    sys: Math.round(v.sys),
    dia: Math.round(v.dia),
    temp: Math.round(v.temp * 10) / 10,
    source,
  };
}

/* ---------------- Risk engine (deterministic, explainable) ---------------- */

export type Band = 'Low' | 'Moderate' | 'High' | 'Critical';

export interface RiskResult {
  score: number; // 0..100
  band: Band;
  factors: string[];
}

export function bandFor(score: number): Band {
  if (score >= 75) return 'Critical';
  if (score >= 50) return 'High';
  if (score >= 25) return 'Moderate';
  return 'Low';
}

const NOTE_KEYWORDS: Record<string, number> = {
  breathless: 8,
  breathing: 6,
  dizzy: 6,
  dizziness: 6,
  'not eating': 5,
  refused: 4,
  confused: 8,
  chest: 10,
  pale: 5,
  sweating: 5,
  vomit: 6,
  sleepy: 4,
  weak: 5,
};

export function noteFactors(noteTexts: string[]): { points: number; factors: string[] } {
  let points = 0;
  const factors: string[] = [];
  const joined = noteTexts.join(' ').toLowerCase();
  for (const [kw, pts] of Object.entries(NOTE_KEYWORDS)) {
    if (joined.includes(kw)) {
      points += pts;
      factors.push(`Caregiver note mentions "${kw}" — +${pts}`);
    }
  }
  return { points: Math.min(points, 20), factors };
}

/** Score the latest reading plus trend slopes over the recent window. */
export function assessRisk(history: Reading[], noteTexts: string[]): RiskResult {
  if (history.length === 0) return { score: 0, band: 'Low', factors: ['No readings received yet.'] };
  const last = history[history.length - 1];
  let score = 0;
  const factors: string[] = [];

  const add = (pts: number, label: string) => {
    if (pts > 0) {
      score += pts;
      factors.push(`${label} — +${pts}`);
    }
  };

  // Absolute thresholds (graded)
  if (last.spo2 < 90) add(34, `SpO2 ${last.spo2}% is critically below 90%`);
  else if (last.spo2 < 92) add(26, `SpO2 ${last.spo2}% is below 92%`);
  else if (last.spo2 < 94) add(16, `SpO2 ${last.spo2}% is below 94%`);
  else if (last.spo2 < 95) add(7, `SpO2 ${last.spo2}% is drifting under 95%`);

  if (last.hr > 130) add(24, `Heart rate ${last.hr} bpm is above 130`);
  else if (last.hr > 110) add(15, `Heart rate ${last.hr} bpm is above 110`);
  else if (last.hr > 100) add(7, `Heart rate ${last.hr} bpm is above 100`);
  else if (last.hr < 45) add(18, `Heart rate ${last.hr} bpm is below 45`);

  if (last.temp > 39.4) add(22, `Temperature ${last.temp}°C is above 39.4°C`);
  else if (last.temp > 38.3) add(13, `Temperature ${last.temp}°C is above 38.3°C (fever)`);
  else if (last.temp > 37.8) add(6, `Temperature ${last.temp}°C is above 37.8°C`);

  if (last.sys > 170) add(20, `Systolic BP ${last.sys} mmHg is above 170`);
  else if (last.sys > 150) add(11, `Systolic BP ${last.sys} mmHg is above 150`);
  else if (last.sys < 90) add(14, `Systolic BP ${last.sys} mmHg is below 90`);

  // Trends over the last ~10 received readings
  const win = history.slice(-10);
  if (win.length >= 6) {
    const first = win[0];
    const dSpo2 = last.spo2 - first.spo2;
    const dHr = last.hr - first.hr;
    const dTemp = last.temp - first.temp;
    if (dSpo2 <= -1.5) add(14, `SpO2 fell ${Math.abs(dSpo2).toFixed(1)} pts over the last ${win.length} readings`);
    else if (dSpo2 <= -0.8) add(7, `SpO2 trending down (${dSpo2.toFixed(1)} pts over ${win.length} readings)`);
    if (dHr >= 10) add(10, `Heart rate rose ${dHr} bpm over the last ${win.length} readings`);
    else if (dHr >= 6) add(5, `Heart rate trending up (+${dHr} bpm over ${win.length} readings)`);
    if (dTemp >= 0.5) add(6, `Temperature rose ${dTemp.toFixed(1)}°C over the last ${win.length} readings`);
  }

  // Context from caregiver notes
  const nf = noteFactors(noteTexts);
  score += nf.points;
  factors.push(...nf.factors);

  score = Math.min(100, score);
  if (factors.length === 0) factors.push('All vitals inside their watch ranges, no adverse trends.');
  return { score, band: bandFor(score), factors };
}

/* ------------- 24–48h outlook: rule-based projection, labelled ------------- */

export interface OutlookItem {
  text: string;
  horizon: string;
}

export function projectOutlook(history: Reading[]): OutlookItem[] {
  if (history.length < 8) return [{ text: 'Not enough readings yet to project a trend.', horizon: '—' }];
  const win = history.slice(-12);
  const first = win[0];
  const last = win[win.length - 1];
  const perHour = (delta: number) => (delta / Math.max(1, last.t - first.t)) * 60;
  const items: OutlookItem[] = [];

  const spo2Rate = perHour(last.spo2 - first.spo2);
  if (spo2Rate < -0.15) {
    const hours = (last.spo2 - 92) / Math.abs(spo2Rate);
    if (hours <= 48)
      items.push({
        text: `If the current SpO2 drift (${spo2Rate.toFixed(2)} pts/hour) continued unchanged, SpO2 would cross 92% in roughly ${Math.max(1, Math.round(hours))}h.`,
        horizon: '24–48h watch',
      });
  }
  const hrRate = perHour(last.hr - first.hr);
  if (hrRate > 1.5) {
    const hours = (120 - last.hr) / hrRate;
    if (hours <= 48 && hours > 0)
      items.push({
        text: `If the current heart-rate climb (+${hrRate.toFixed(1)} bpm/hour) continued unchanged, HR would cross 120 bpm in roughly ${Math.round(hours)}h.`,
        horizon: '24–48h watch',
      });
  }
  const tempRate = perHour(last.temp - first.temp);
  if (tempRate > 0.05) {
    const hours = (38.3 - last.temp) / tempRate;
    if (hours <= 48 && hours > 0)
      items.push({
        text: `If the current temperature rise (+${tempRate.toFixed(2)}°C/hour) continued unchanged, fever threshold 38.3°C would be reached in roughly ${Math.round(hours)}h.`,
        horizon: '24–48h watch',
      });
  }
  if (items.length === 0)
    items.push({
      text: 'No sustained adverse drift in the recent window — no threshold crossings projected in the next 24–48h at current rates.',
      horizon: '24–48h watch',
    });
  return items;
}

/* ------------------------------ Formatting ------------------------------ */

export const fmtClock = (base: Date, simMinutes: number) => {
  const d = new Date(base.getTime() + simMinutes * 60000);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

export const BAND_STYLES: Record<Band, { text: string; bg: string; ring: string; dot: string }> = {
  Low: { text: 'text-teal-300', bg: 'bg-teal-400/10', ring: 'ring-teal-400/30', dot: 'bg-teal-400' },
  Moderate: { text: 'text-amber-300', bg: 'bg-amber-400/10', ring: 'ring-amber-400/30', dot: 'bg-amber-400' },
  High: { text: 'text-orange-300', bg: 'bg-orange-400/10', ring: 'ring-orange-400/40', dot: 'bg-orange-400' },
  Critical: { text: 'text-red-300', bg: 'bg-red-400/10', ring: 'ring-red-400/40', dot: 'bg-red-400' },
};
