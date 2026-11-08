# WardZero — Home Ward Monitoring & Response

**An Intelligent Home Healthcare Monitoring and Response System** — a patient's bedroom
that functions like a smart hospital ward.

- **Live app (the project link):** https://operation-ward-zero.vercel.app
- **Demo video (~3 min):** https://operation-ward-zero.vercel.app/demo.mp4
  (also linked in the app under **Docs**)
- **Built for:** Operation Ward Zero — Wooble Software Pvt Ltd (Unstop)
- **Team:** Tech Bro · Leader: Pintu Kumar

> **Honesty note:** everything in this project runs on **synthetic data**. The patient,
> vitals and caregivers are fictional and generated in the browser. The risk engine is
> **deterministic and rule-based** — there is no ML model and no clinical validation.
> This is not a medical device and is not for clinical use.

Mission: **Sense → Understand → Predict → Alert → Respond**

---

## Problem understanding

Patients recovering or living with chronic conditions at home are monitored far less
than in a hospital ward, yet deterioration usually announces itself gradually — drifting
vitals, missed context in a caregiver's head, slow responses to the first warning signs.
The challenge: design a software-based monitoring solution that demonstrates how a
patient's bedroom can function like a smart hospital ward, using simulated sensors and
synthetic data (no hardware, no real patient information).

## Proposed solution

WardZero runs the full ward loop in one web app, for one fictional patient:

1. **Sense — Live Monitoring.** Simulated bedside sensors stream heart rate, SpO2, blood
   pressure and temperature once per simulated minute, with trend charts. A scenario
   picker drives the ward: *Stable*, *Deteriorating* (slow drift), or *Sensor dropout*.
2. **Understand — Risk Engine.** A deterministic, explainable risk score (0–100) computed
   from the latest reading, trend slopes over the recent window, and caregiver-note
   context. **Every point is listed in plain language** next to the score.
3. **Predict — 24–48h outlook.** Current drift rates are extended linearly to name which
   threshold would be crossed and roughly when. It is labelled a rule-based projection
   everywhere it appears — a planning prompt for a human, not a diagnosis.
4. **Alert — Alerts & Escalation.** When the risk band rises, an alert fires with its
   trigger. Severity is categorised (Low / Moderate / High / Critical). Critical alerts
   left unacknowledged for 40 seconds **escalate to the remote supervising clinician**.
5. **Respond — Caregiver.** Roster with check-in/attendance, alert acknowledgement with
   response-time logging, and free-text caregiver notes that feed back into the risk
   score's context.

### Reliability by design (a graded theme)

Home connections fail. The **Reliability** view simulates the sensor link:

- **Online** — readings reach the platform as taken.
- **Delayed** — readings arrive in bursts every ~5 simulated minutes.
- **Dropout** — readings queue **on the device** (store-and-forward); on reconnect they
  sync visibly, with queue counts, last-sync timestamps and an event log. No reading is
  silently lost.

## System architecture

```
Simulated sensors ──► Connection model ──► Reading history ──► Risk engine ──► Alerts
 (scenario-driven      (online / delayed /   (received +         (thresholds +    (raise →
  random walk)          dropout + queue)      back-filled sync)    trends + notes)  ack → escalate)
        ▲                                                                            │
        └──────────────── Caregiver notes / check-ins ◄── Response log ◄────────────┘
```

- **Frontend only:** React + TypeScript + Tailwind CSS (Vite SPA), deployed on Vercel.
- **Simulation engine** (`app/src/sim.ts`): vitals generator with three scenarios,
  connection model, deterministic risk scoring, outlook projection.
- **State store** (`app/src/store.ts`): tick loop, offline queue, alert lifecycle,
  escalation watcher, caregiver roster and notes.
- **Views** (`app/src/views*.tsx`): Live Monitoring, Risk Engine, Alerts & Escalation,
  Caregiver, Reliability, Docs. Charts are hand-rolled SVG — no chart dependency.
- Spec pack: [`spec/SPEC.md`](spec/SPEC.md) · [`spec/DESIGN.md`](spec/DESIGN.md) ·
  [`spec/TASKS.md`](spec/TASKS.md)

## Major features

- Streaming simulated vitals with per-vital trend charts and scenario control
- Explainable risk score — factor list rendered verbatim in the UI
- Clearly-labelled 24–48h deterioration outlook (linear projection on synthetic data)
- Severity-categorised alerts with acknowledgement, resolution and timed escalation
- Caregiver roster, check-in/attendance, response-time log, contextual notes
- Connection simulator with a visible offline queue and sync-on-reconnect
- Persistent "synthetic demo data" labelling in the UI itself

## Data processing & risk assessment approach

Readings arrive once per simulated minute. Scoring (max 100, capped):

| Signal | Examples |
| --- | --- |
| Absolute thresholds (graded) | SpO2 <94/92/90 → +16/+26/+34 · HR >100/110/130 → +7/+15/+24 · Temp >37.8/38.3/39.4 → +6/+13/+22 · Systolic >150/170 → +11/+20, <90 → +14 |
| Trends (last ~10 readings) | SpO2 −0.8/−1.5 pts → +7/+14 · HR +6/+10 bpm → +5/+10 · Temp +0.5 °C → +6 |
| Caregiver-note context (capped +20) | Keywords such as "breathless", "dizzy", "chest", "confused" add listed points |

Bands: **Low <25 · Moderate 25–49 · High 50–74 · Critical ≥75**. Recomputed on every
received reading; a band rise raises an alert.

## Sample / synthetic dataset

There is no dataset file: readings are generated at runtime by a seeded random walk
around healthy baselines (HR 72, SpO2 97.5, BP 118/76, temp 36.7), with the
*Deteriorating* scenario applying slow directional drift. The fictional patient is
"Aarav S., 68"; caregivers are fictional. **No real patient data is used anywhere.**

## Setup & run

Requirements: Node.js 20+ and npm.

```bash
cd app
npm install
npm run dev        # local dev server
npm run build      # typecheck + production build
npm run preview    # serve the production build
```

No environment variables, accounts or API keys are needed.

## Assumptions

- One patient, one home, one on-duty caregiver at a time.
- Thresholds are common adult watch ranges chosen for demonstration.
- Simulated time runs at 1 minute per ~1.1 real seconds so a full deterioration arc is
  watchable in a demo.
- The supervising clinician is a remote escalation contact, not an emergency service.

## Limitations

- **Not a medical device.** The risk score is a rule-based demonstration on synthetic
  data; it has never seen a real patient and carries no accuracy or clinical claim.
- Thresholds are illustrative, not personalised to any patient's baseline or medication.
- The 24–48h outlook is linear extrapolation; real physiology is not linear.
- Caregiver-note keyword matching is a transparent stand-in for NLP triage and can miss
  or misread context.
- Nothing here replaces professional assessment; in a real emergency, call emergency
  services.

## Future improvements

- Real device ingestion (BLE wearables, FHIR-shaped APIs) behind the same
  queue-and-sync contract.
- Per-patient baselines from their own history, with clinician-approved thresholds.
- Push/SMS escalation chains and multi-caregiver shift handovers.
- Offline-first PWA sensor hub with encrypted local storage.
- Clinician review console to tune sensitivity and audit every alert decision.

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · Vercel (hosting) · Playwright + ffmpeg
(demo video) · GitHub (source)

---

*WardZero — built for Operation Ward Zero (Wooble Software Pvt Ltd) · Team Tech Bro ·
Simulated sensors, synthetic patient, rule-based explainable risk.*
