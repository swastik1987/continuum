# Continuum — by Connect & Heal (CNH)

**Continuum** is a demo prototype of a closed-loop care-continuity engine. It shows how patient follow-up drop-off can be reduced by turning every doctor's visit into a structured, trackable care plan — and automatically closing the loop when the patient completes a step.

> This is a demo prototype for evaluation. It is not a production system.

---

## The Problem It Solves

After a doctor's visit, most patients don't complete their follow-up care — labs, medication, referrals. The reasons vary:
- Some simply forgot
- Some face cost or logistics barriers
- Some feel better and don't see the point
- Some don't trust the system

Continuum addresses each reason differently, instead of sending the same reminder to everyone.

---

## How It Works

1. **Clinician** finishes a consultation and builds a structured care plan — each step has a type, priority, due date, and a plain-language reason the patient will read.
2. **Patient** receives a WhatsApp-style notification, books the step (e.g. home collection, ₹0 via wallet), and the system auto-completes the action when the diagnostic result arrives.
3. **If a patient declines or ignores**, the system decides what to do based on their behaviour segment — send a reminder, suppress silently, or route to a human navigator.
4. **Navigator** (care coordinator) sees a prioritised worklist of high-risk cases that need a human touch.
5. **Employer** sees live engagement metrics, care gap closures, and an estimated claims cost avoided — with full transparency into the model.

---

## Four Roles, Four Experiences

| Role | What they see |
|---|---|
| **Patient** | Mobile app — care plan, action cards, wallet, chat |
| **Clinician** | Care-Plan Builder — turn a consult into a trackable plan |
| **Navigator** | Worklist — prioritised cases that need human follow-up |
| **Employer** | Dashboard — completion rates, trust panel, claims cost model |

---

## Key Features

- **Structured care plan** — every recommendation is a typed action with priority, due date, and provenance (clinician-authored vs AI-suggested)
- **AI suggestions** — the system proposes follow-up actions from consult notes; the clinician reviews and confirms before anything reaches the patient
- **Closed loop** — when a diagnostic result or pharmacy event arrives, the matching action auto-completes
- **Behaviour segmentation** — patients are segmented (`forgot`, `cost`, `feels_better`, `logistics`, `trust`, `avoidance`); treatment varies by segment
- **Suppression guardrail** — cost/trust/avoidance segments never get automated nudges; they go straight to a navigator
- **WhatsApp-style chat** — simulated in-app; AI replies with a scripted fallback if no API key is set
- **Live simulation** — an admin panel lets you advance the demo by 1 or 7 days and watch all views update in real time
- **Transparent cost model** — claims-avoided estimate uses a documented formula with tunable constants; optional care is explicitly excluded

---

## Tech Stack

- **Frontend:** React + Vite + TypeScript + Tailwind + shadcn/ui
- **Data fetching:** TanStack Query
- **Backend:** Supabase (Postgres, Row-Level Security, Edge Functions, Realtime)
- **Charts:** Recharts
- **AI (optional):** Gemini 2.0 Flash via Google API — degrades gracefully to keyword rules if no key is set
- **Deployment:** GitHub → Lovable (auto-syncs and deploys)

---

## Demo Credentials

All accounts use the password: **`Continuum2024!`**

| Role | Email |
|---|---|
| Patient | `patient@demo.continuum.health` |
| Clinician | `clinician@demo.continuum.health` |
| Navigator | `navigator@demo.continuum.health` |
| Employer | `employer@demo.continuum.health` |
| Admin (god mode) | `admin@demo.continuum.health` |

The admin account includes a role switcher to jump between all views without re-logging in, and a simulation control panel to advance demo time.

---

## Project Structure

```
src/
  features/
    patient/       # Mobile care plan, action cards, chat
    clinician/     # Care-Plan Builder
    navigator/     # Worklist, member detail
    employer/      # Dashboard, trust panel, cost model
    admin/         # Demo simulation control
  lib/
    api/           # Typed data layer (no raw queries in components)
    auth/          # Auth context, role-based routing
    costModel.ts   # Transparent claims-avoided calculation
    statusConfig.ts # Centralised status → colour/label map

supabase/
  functions/       # Edge Functions (nudge engine, close-loop, simulation, etc.)
  migrations/      # SQL migration files

docs/              # Design prompts, implementation plan, edge function specs
```

---

## Edge Functions

| Function | What it does |
|---|---|
| `suggest-actions` | Proposes follow-up actions from consult notes (Gemini or keyword rules) |
| `run-nudge-engine` | Sends reminders to `forgot` segment; suppresses for structural segments |
| `close-loop` | Matches incoming clinical events to open actions and auto-completes them |
| `compute-risk` | Scores member risk tier based on overdue actions, ER visits, declines |
| `advance-simulation` | Advances demo time, triggers all of the above, returns an activity feed |
| `conversational-reply` | Responds to patient chat messages (Gemini or scripted fallback) |

---

## Important Design Decisions

- **No spamming structural segments.** Members who have cost, trust, or avoidance barriers are never auto-nudged — a suppressed nudge is recorded and a navigator task is created instead. This powers the employer Trust Panel.
- **Provenance is always set.** AI-suggested actions cannot reach the patient until a clinician explicitly confirms them.
- **Decline is respected.** Declining an action is a non-coercive, first-class path. Declining a mandatory action routes to a navigator — never triggers repeat nudging.
- **All money is INR.** All dates run on simulated time (`sim_state.current_day`), not wall-clock time.
- **Cost model is intentionally conservative.** Optional care is excluded, attribution is haircut to 50%, so the number underclaims rather than overclaims.

---

## Running Locally

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Seed demo data (requires Supabase credentials)
bun run seed
```

SQL migrations in `supabase/migrations/` must be run manually in the Supabase SQL Editor.
