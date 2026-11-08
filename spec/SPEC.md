# WardZero — SPEC

## Event
Operation Ward Zero (Wooble Software Pvt Ltd, Unstop). Team: Tech Bro. Leader: Pintu Kumar.
Deadline: 9 Nov 2026, 11:03 PM IST. Submission: one project link (the live app URL).

## Problem (brief, verbatim core)
"Build an Intelligent Home Healthcare Monitoring and Response System" — a patient's
bedroom functioning like a smart hospital ward. Mission: Sense → Understand → Predict →
Alert → Respond. No hardware; simulated sensors + synthetic patient data are permitted.
No real patient data, ever.

## Product
WardZero — Home Ward Monitoring & Response. A single-page web app that simulates a
home ward for ONE fictional patient and runs the full loop end to end:
simulated vitals → deterministic explainable risk assessment → categorised alerts →
caregiver acknowledgement / escalation → documented response.

## Users
- Family caregiver (primary): watches vitals, acknowledges alerts, adds notes.
- Remote family member / supervising clinician (secondary): reads risk outlook and logs.

## Functional requirements
1. Live Monitoring: streaming simulated HR, SpO2, BP, temperature with trend charts;
   scenario picker — Stable / Deteriorating / Sensor dropout.
2. Risk Engine: deterministic rule-based scoring over the simulated series. Every score
   lists its contributing factors in plain language. A 24–48h deterioration outlook is
   shown as a clearly-labelled rule-based projection on synthetic data.
3. Alerts & Escalation: severity-categorised alert feed; acknowledge flow; unacknowledged
   critical alerts escalate on a visible timer.
4. Caregiver: roster, check-in/attendance, alert response-time log, free-text notes that
   feed the risk view.
5. Reliability: connection simulator (online / delayed / dropout); readings taken while
   offline are queued visibly and sync on reconnect; last-sync timestamps shown.
6. Docs view: architecture, risk approach, assumptions, limitations, future work, plus
   links to the source repo and the demo video.

## Non-goals / honesty constraints
- No real patient data; the patient is fictional and labelled synthetic everywhere.
- No clinical claims. The risk engine is rule-based, not ML; no accuracy figures.
- No backend, no accounts, no external APIs. State lives in the browser.
- Persistent banner: "Synthetic demo data — not for clinical use."

## Acceptance
- `npm run build` and typecheck pass.
- All six views work without a backend; scenario + dropout flows visibly change state.
- Live on Vercel; repo public; ~3-minute demo video linked from the app and README.
