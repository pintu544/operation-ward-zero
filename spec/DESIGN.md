# WardZero — DESIGN

## Stack
React + Vite + TypeScript + Tailwind CSS (SPA, no backend). State: a single simulation
store in React (context + reducer-style hooks). Charts: hand-rolled SVG sparklines/line
charts (no chart dependency — keeps the bundle light and the build reliable).

## Simulation model
- Tick = 1 simulated reading every 1.2s (labelled "1 reading / min, accelerated").
- Each vital is a scenario-driven random walk around a baseline:
  - Stable: tight walk near healthy baselines.
  - Deteriorating: slow drift — HR up, SpO2 down, temp up, systolic up — so trends,
    not single spikes, drive the risk score.
  - Sensor dropout: vitals freeze at last value, readings are marked "queued".
- History: rolling window of readings (timestamp, HR, SpO2, systolic, diastolic, temp,
  source: live | queued | synced).

## Risk engine (deterministic, explainable)
Points-based, evaluated on the latest reading + trend slopes over the window:
- SpO2 < 94 / < 90, HR > 110 / > 130 or < 45, temp > 38.3 / > 39.4,
  systolic > 150 / > 170 or < 90 — graded points.
- Trend points: SpO2 falling ≥1.5 pts / 10 readings, HR rising ≥10 bpm / 10 readings.
- Context points: caregiver note keywords (e.g. "breathless", "dizzy", "not eating")
  add a small, listed contribution.
Score → band: Low <25, Moderate 25–49, High 50–74, Critical ≥75.
Every evaluation returns a factor list ("SpO2 91% is below 94 — +18") rendered verbatim
in the UI. Outlook: if the current drift rates persisted, the engine projects which
thresholds would be crossed in 24–48h — rendered as a labelled projection, not a diagnosis.

## Alerts
Generated when a vital crosses a threshold or the risk band rises. Severity mirrors the
band. An alert is Open → Acknowledged (caregiver + timestamp) → Resolved. Critical alerts
unacknowledged for 45 simulated seconds escalate (banner + log entry + "escalated to
supervisor" state). Response times are recorded for the caregiver log.

## Reliability model
Connection mode: Online | Delayed (readings arrive in bursts after a lag) | Dropout
(no readings reach the "platform"; they accumulate in a visible offline queue).
On reconnect, queued readings flush with a sync animation/log and last-sync updates.
This is a simulation of store-and-forward, labelled as such.

## UI direction (Impeccable, Operate mode)
Calm clinical precision: deep slate/ink surface, one accent (teal) for healthy/live,
amber for moderate, red reserved for high/critical. Dense but scannable vital cards,
tabular numerals, small caps labels, no decorative gradients. Left rail navigation for
the six views; persistent synthetic-data banner; live clock of simulated time.
Accessibility: severity never carried by colour alone (icon + label), focus-visible
states, semantic buttons.

## Files
- src/sim/engine.ts — vitals generator + scenarios + connection model
- src/sim/risk.ts — risk scoring, factors, outlook projection
- src/sim/alerts.ts — alert derivation + escalation logic (pure helpers where possible)
- src/App.tsx + src/views/*.tsx — the six views
- src/components/* — VitalCard, TrendChart, RiskGauge, AlertRow, banners
