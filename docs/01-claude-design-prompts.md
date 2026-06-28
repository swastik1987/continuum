# Continuum — Claude Design Prompts

**Product:** *Continuum* (working title) — Connect & Heal's closed-loop care-continuity engine.
**How to use this file:** Run **Prompt 0 first** to establish the design system. Then run each screen prompt in order, in the same Claude Design project, so the system stays consistent. Export each screen; Claude Code will reference the exports when wiring the front end.

**Design north star:** modern, calm, trustworthy — *not* sterile-hospital. It should feel like a premium consumer health app for the patient surfaces and a focused operations tool for the staff surfaces. Generous whitespace, soft cards, clear status semantics, large tap targets on mobile.

---

## Prompt 0 — Design System Foundation

```
Create a design system foundation for a healthcare product called "Continuum" — a care-continuity platform that helps patients complete their recommended follow-ups (lab tests, second consults, medications) and helps care teams catch the ones who drop off.

Establish and lay out on a single styleguide canvas:

BRAND FEEL: Calm, trustworthy, modern, human. Premium-consumer for patients; focused-operational for staff. Avoid clinical coldness and avoid childish/playful.

COLOR PALETTE:
- Primary: a calm healing teal (#0E8C7F or similar). Use for primary actions, active states, progress.
- Ink: deep slate-navy (#13233A) for primary text.
- Surface: warm off-white background (#F7F6F3), white cards.
- Status semantics (use consistently everywhere):
  - Done / on-track = green (#1F9D55)
  - Due soon / pending = slate-grey (#64748B)
  - Overdue / needs attention = amber (#D9821B)
  - Declined / urgent / high-risk = warm red (#D24B47)
- Soft tints of each status for backgrounds/badges.

TYPOGRAPHY: A humanist sans (Inter or similar). Clear type scale: display, h1, h2, body, caption. Tabular numerals for dashboard figures.

COMPONENTS to define: buttons (primary/secondary/ghost), status badges (the 4 semantics above), cards (elevated soft shadow, 16px radius), progress ring, list rows, data tiles/KPI cards, input fields, tabs, avatar+name row, a "provenance" badge (a small shield-style tag reading "Clinician-authored"), and a segment chip (small coloured chip for behaviour segments like "Feels better", "Cost barrier").

ICONOGRAPHY: line icons, rounded, consistent weight.

Show light mode. Spacing on an 8px grid. Make it feel cohesive and premium.
```

---

## Prompt 1 — Patient App: Home (mobile)

```
Design a MOBILE screen (390px wide) for the Continuum patient app, using the Continuum design system.

SCREEN: Patient Home / "My Care Plan".
USER & JOB: An insured employee who just had a doctor consult. They need to see, at a glance, what their doctor recommended next and do the next step with one tap.

LAYOUT top to bottom:
1. Greeting header: "Hi Ananya" + a small line "Your care plan from Dr. Mehra, 12 Jun".
2. A prominent progress ring card: "2 of 4 steps done" with the teal progress ring, and a one-line encouraging status.
3. "Next steps" section — a vertical list of care-action cards. Each card shows:
   - Action icon + title (e.g. "Fasting blood sugar test", "Follow-up with Dr. Mehra")
   - A status badge (Due soon / Overdue / Done) using the status semantics
   - The plain-language WHY ("To check if your sugar levels are improving")
   - Due date ("Due by 25 Jun")
   - A small "Clinician-authored" provenance badge
   - A primary action button on the card: "Book home collection" or "Reschedule" or, if done, a green check row "Completed on 18 Jun".
   Show one card OVERDUE (amber), one DUE SOON (slate), one DONE (green).
4. A subtle bottom card: "Questions? Chat with your care team" leading to the chat.
5. Bottom tab bar: Home, Chat, Records, Profile.

States to also show as small variants: an empty state ("No pending steps — you're all caught up ✓").

Make it feel reassuring and effortless, like a top-tier consumer health app.
```

---

## Prompt 2 — Patient App: Action Detail + Booking + Decline (mobile)

```
Design a MOBILE screen (390px) for the Continuum patient app, using the Continuum design system.

SCREEN: Care Action Detail — the screen a patient sees after tapping a recommended step.
USER & JOB: Patient decides whether and how to complete a recommended follow-up, with the least possible friction.

LAYOUT:
1. Header with action title ("Fasting blood sugar test") + status badge + "Clinician-authored" provenance badge.
2. A "Why this matters" explainer block in plain language.
3. A frictionless booking block — this is the hero of the screen:
   - Toggle: "Home sample collection" (ON by default) vs "Visit a centre".
   - Date/time slot picker (show a couple of selectable slot chips).
   - A cost line that resolves the cost objection: "Covered by your Acme health wallet — ₹0 to pay" with a small wallet balance line.
   - Primary button: "Confirm home collection".
4. A secondary, lower-emphasis row: "Can't do this right now?" expanding to options: "Remind me later" and "I've decided not to".
5. Show the DECLINE flow as a second frame: tapping "I've decided not to" opens a gentle sheet asking a single reason (chips: "Feeling better", "Too busy", "Cost concern", "Don't think I need it", "Other") and a reassuring line: "No problem — we'll let your care team know in case they can help." (This routes to a human navigator — design it to feel supportive, never guilt-trippy.)

Tone: supportive, never coercive. The decline path must feel as respected as the confirm path.
```

---

## Prompt 3 — Patient App: WhatsApp-style Nudge Chat (mobile)

```
Design a MOBILE screen (390px) for the Continuum patient app, using the Continuum design system.

SCREEN: Care chat — a WhatsApp-style conversational thread between the patient and their care team / the Continuum assistant.
USER & JOB: The patient receives reminders and can respond conversationally ("reschedule", "I'm not sure I need this"), and can reach a human.

LAYOUT:
- A messaging thread that visually echoes WhatsApp familiarity (chat bubbles, light-green tint for the patient's own messages, white for incoming) BUT branded as Continuum (Continuum logo + "Care Team" in the header, an "online" presence line).
- Show a realistic exchange:
  - Incoming nudge: a friendly reminder about the overdue blood sugar test, with two quick-reply chips under it: "Book now" and "I have a question".
  - Patient reply bubble: "Is this really needed? I feel fine."
  - Incoming empathetic reply that does NOT pressure, and offers a human: "Totally fair to ask. Your doctor flagged this because your last reading was borderline. Want me to connect you to a care navigator to talk it through?"
  - A subtle system chip showing "Connecting you to Priya, Care Navigator…" to show human handoff.
- A quick-reply bar and a text input with send button.
- A small banner at top: "This is a simulated WhatsApp experience for the prototype."

Make it feel warm and human, clearly distinct from a cold automated bot.
```

---

## Prompt 4 — Care Navigator Console: Worklist (web)

```
Design a DESKTOP web screen (1440px) for the Continuum Care Navigator Console, using the Continuum design system.

SCREEN: Navigator Worklist — the daily prioritised queue of patients who need a human touch.
USER & JOB: A care navigator triages the risk-stratified tail: patients who declined a mandatory step, recent ER discharges, repeat drop-offs, or high-risk overdue.

LAYOUT:
- Left sidebar nav: Worklist, My Patients, Tasks, Search.
- Top bar: navigator name/avatar, a date, and 3 small KPI tiles ("Open tasks: 14", "Resolved today: 6", "P1 urgent: 2").
- Main area: a prioritised task table/list. Each row shows:
  - Priority pill (P1 red / P2 amber / P3 slate)
  - Patient name + age/gender
  - Risk tier badge (High/Med/Low)
  - Behaviour SEGMENT chip ("Feels better", "Cost barrier", "Avoidance", etc.)
  - Trigger reason ("Declined mandatory test", "ER discharge — 72h follow-up", "Repeat drop-off")
  - The pending action at risk
  - Quick action buttons: "Call", "WhatsApp", "Open"
- Filters across the top: by priority, risk tier, segment, trigger reason.
- Make P1 rows visually stand out (subtle red left-border).

Feel: a focused, calm operations cockpit — dense but not cluttered, fast to scan.
```

---

## Prompt 5 — Care Navigator Console: Member Detail (web)

```
Design a DESKTOP web screen (1440px) for the Continuum Care Navigator Console, using the Continuum design system.

SCREEN: Member Detail — the full picture of one patient when a navigator opens a task.
USER & JOB: The navigator understands why this person is at risk and acts (call, reschedule, resolve, note).

LAYOUT (two/three column):
- Header: patient name, age/gender, employer (Acme Corp), risk tier badge, behaviour segment chip, preferred language.
- Left column: "Why flagged" risk drivers as a small bulleted list ("Borderline HbA1c", "Declined mandatory test on 22 Jun", "Missed last 2 follow-ups"). A "Risk score" gauge.
- Centre column: the CARE PLAN — a vertical timeline of care-plan actions with their statuses (Done / Overdue / Declined), each stamped with provenance ("Clinician-authored"). Show the closed-loop clearly: a completed action shows "Auto-completed from diagnostics event, 18 Jun".
- Right column: ENGAGEMENT history — a compact log of nudges sent / read / responded, with channel icons (WhatsApp/app/call), and the decline reason captured. Plus an "Add note" box and action buttons: "Call", "Send WhatsApp", "Reschedule for patient", "Resolve task".

Show one action that was AUTO-COMPLETED by a diagnostics event (highlight this — it's the product's signature).

Feel: complete context at a glance, action always one click away.
```

---

## Prompt 6 — Employer / HR Outcome Dashboard (web)

```
Design a DESKTOP web screen (1440px) for the Continuum Employer Dashboard, using the Continuum design system.

SCREEN: Employer (HR / Benefits head) outcome dashboard for "Acme Corp".
USER & JOB: The benefits buyer needs to see that their spend is producing health engagement AND avoided future claims cost — and that Continuum is NOT just billing tests.

LAYOUT:
1. Header: "Acme Corp — Care Continuity", date range selector, covered-lives count ("12,480 lives").
2. Top KPI row (4 large tiles, tabular numerals):
   - "Follow-up completion rate: 71% ▲ from 54%"
   - "Care gaps closed this quarter: 1,932"
   - "Est. claims cost avoided: ₹1.4 Cr" (with a small "illustrative model" info tag)
   - "Active engagement: 68% of members"
3. A chart row:
   - Left: a line/area chart of follow-up completion rate over time vs a baseline line.
   - Right: a horizontal bar chart "Completion by behaviour segment" (Forgot, Cost, Feels-better, Logistics, etc.), showing which segments respond and which need human navigators.
4. THE TRUST PANEL (make this prominent and distinctive — it's the differentiator):
   - "Recommendation integrity" card.
   - "100% of nudges trace to a clinician-authored care plan" with a shield icon.
   - "3,104 low-value nudges suppressed" (we deliberately did NOT contact patients facing cost/anxiety barriers — routed to human care instead).
   - "Member opt-out rate: 1.2%".
   Frame this as: "We earn trust by not spamming your people."
5. A small footer note: figures are illustrative prototype data.

Feel: executive, credible, board-ready. The trust panel should feel like a deliberate, proud statement.
```

---

## Prompt 7 — Clinician: Care-Plan Authoring (web)

```
Design a DESKTOP web screen (1440px) for the Continuum Clinician view, using the Continuum design system.

SCREEN: Care-Plan Builder — where a doctor turns a finished consult into a structured, trackable care plan.
USER & JOB: After a consult, the clinician specifies the exact next steps (this structured object is what the whole system tracks).

LAYOUT:
- Left: a compact consult summary (patient, chief complaint, brief notes).
- Centre: "Next steps" builder. A list where the clinician adds care-plan actions. Each action row has:
  - Action type selector (Lab test / Follow-up consult / Medication / Vaccination / Lifestyle / Imaging)
  - Title + plain-language "why" field
  - Clinical priority selector: Mandatory / Recommended / Optional (colour-coded)
  - Due-by date
- Show a "Suggested by Continuum" section: 2 system-suggested actions shown with a distinct dashed/ghost style and a clear label, each with "Confirm" and "Dismiss" buttons — the clinician must CONFIRM before they become part of the plan. (This visualises the provenance guardrail: system can suggest, only a clinician can authorise.)
- Right: a live preview of how the plan will appear to the patient (mirrors the patient Home card).
- Primary button: "Publish care plan".

Feel: fast, structured, clinical-grade but clean. Make the suggested-vs-authored distinction visually obvious.
```

---

## Prompt 8 — Demo Control Panel (web, optional but recommended)

```
Design a small DESKTOP web panel for the Continuum prototype, using the Continuum design system.

SCREEN: Demo Control ("Simulation") panel — used live in the demo to make the closed loop visible in seconds.
LAYOUT:
- A compact card titled "Demo Simulation".
- "Current day: 14 Jun" with a large primary button "Advance 1 day ▶" and "Advance 7 days ⏭".
- A live activity feed that updates as days advance: "Nudge sent to 18 members", "3 lab tests completed → actions auto-closed", "1 member declined → routed to navigator", "Risk recomputed: 2 members → High".
- A "Reset demo" ghost button.
- A role switcher: Patient / Navigator / Clinician / Employer (to jump between views during the demo).

Feel: a clean control surface, clearly a demo tool, satisfying to click.
```
