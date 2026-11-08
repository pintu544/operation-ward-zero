import { SectionTitle } from './components';

export const REPO_URL = 'https://github.com/pintu544/operation-ward-zero';
export const VIDEO_URL = '/demo.mp4';

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-slate-900/70 p-5 ring-1 ring-white/10">
      <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export function DocsView() {
  return (
    <div>
      <SectionTitle hint="Everything a judge needs: what this is, how it works, what it assumes, and where its limits are.">
        Documentation — WardZero
      </SectionTitle>
      <div className="mb-3 flex flex-wrap gap-2">
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="rounded-lg bg-teal-400/15 px-3.5 py-2 text-sm font-semibold text-teal-200 ring-1 ring-teal-400/40 transition hover:bg-teal-400/25">
          Source code (GitHub)
        </a>
        <a href={VIDEO_URL} className="rounded-lg bg-white/5 px-3.5 py-2 text-sm font-semibold text-slate-100 ring-1 ring-white/15 transition hover:bg-white/10">
          ▶ Demo video (~3 min)
        </a>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Block title="Problem understanding">
          <p>
            Patients recovering or living with chronic conditions at home are monitored far less than in a hospital
            ward, yet most deterioration announces itself gradually — in drifting vitals, missed context, and slow
            responses. Operation Ward Zero asks for a bedroom that behaves like a smart hospital ward.
          </p>
          <p>
            WardZero runs the whole loop in software: <strong>Sense</strong> (simulated vitals) →{' '}
            <strong>Understand</strong> (an explainable risk score) → <strong>Predict</strong> (a labelled 24–48h
            outlook) → <strong>Alert</strong> (severity-categorised alerts with escalation) →{' '}
            <strong>Respond</strong> (caregiver acknowledgement and response logging).
          </p>
        </Block>
        <Block title="Architecture & stack">
          <p>
            React + TypeScript + Tailwind single-page app; no backend. Three layers: (1) a simulation engine that
            generates vitals under selectable scenarios and models the sensor link (online / delayed / dropout with a
            store-and-forward queue); (2) a deterministic risk engine that scores the latest reading, trend slopes,
            and caregiver-note context; (3) the alerting workflow (raise → acknowledge → escalate → resolve) with a
            response-time log.
          </p>
          <p>State lives in the browser; charts are hand-rolled SVG. Deployed as a static site on Vercel.</p>
        </Block>
        <Block title="Data processing & risk approach">
          <p>
            Readings arrive once per simulated minute. The risk engine adds graded points for threshold breaches
            (SpO2, heart rate, temperature, systolic BP), trend points for sustained drift over the last ~10 readings,
            and small capped points for concerning keywords in caregiver notes. The total maps to Low / Moderate /
            High / Critical bands, and every point is printed next to the score — a caregiver or judge can audit
            exactly why the number moved.
          </p>
          <p>
            The 24–48h outlook extends current drift rates linearly and names the threshold that would be crossed and
            roughly when. It is deliberately simple and is labelled a projection everywhere it appears.
          </p>
        </Block>
        <Block title="Assumptions">
          <ul className="list-disc space-y-1 pl-5">
            <li>One patient, one home, one on-duty caregiver at a time.</li>
            <li>Sensors are simulated; thresholds are common adult watch ranges chosen for demonstration.</li>
            <li>Simulated time runs at 1 minute per ~1.1 real seconds so a full deterioration arc is watchable.</li>
            <li>The supervising clinician is a remote escalation contact, not an emergency service.</li>
          </ul>
        </Block>
        <Block title="Limitations — read before judging the risk score">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Not a medical device.</strong> The score is a rule-based demonstration on synthetic data. It has
              never seen a real patient and carries no clinical validation or accuracy claim.
            </li>
            <li>Thresholds are illustrative, not personalised to any patient's baseline or medication.</li>
            <li>The outlook is linear extrapolation; real physiology is not linear.</li>
            <li>Note keyword matching is a transparent stand-in for NLP triage, and it can miss or misread context.</li>
            <li>Nothing here replaces professional assessment; in a real emergency, call emergency services.</li>
          </ul>
        </Block>
        <Block title="Future improvements">
          <ul className="list-disc space-y-1 pl-5">
            <li>Real device ingestion (BLE wearables / FHIR-shaped APIs) behind the same queue-and-sync contract.</li>
            <li>Per-patient baselines learned from their own history, with clinician-approved thresholds.</li>
            <li>Push/SMS escalation chains and multi-caregiver shift handovers with signed hand-off notes.</li>
            <li>Offline-first PWA hub so the ward keeps working through real outages, with encrypted local storage.</li>
            <li>Clinician review console: acknowledge projections, tune sensitivity, audit every alert decision.</li>
          </ul>
        </Block>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Built for Operation Ward Zero (Wooble Software Pvt Ltd, Unstop) — Team Tech Bro, leader Pintu Kumar. All
        patient data in this app is synthetic and generated in your browser.
      </p>
    </div>
  );
}
