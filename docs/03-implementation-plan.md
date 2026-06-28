# Continuum — Implementation Plan (for Claude Code)

Build the prototype in the milestone order below. Read `CLAUDE.md` first — its invariants are binding. Each milestone has a goal, the key work, and an **acceptance check** you must satisfy before moving on. The simulation (M8) and the closed-loop auto-completion (M5) are the centerpiece; do not under-build them to polish screens.

**Stack reminder:** React+Vite+TS+Tailwind+shadcn, TanStack Query, Supabase (Postgres/RLS/Edge Functions/Realtime), Recharts, optional Anthropic API with scripted fallback. Schema is applied via the SQL editor (`schema-migration.sql`).

**Edge functions:** every Supabase Edge Function referenced below is fully specified in **`04-edge-function-prompts.md`**. When a milestone says "build `<name>` (spec §N)", implement it to that spec's Acceptance check. Build order: `suggest-actions` (M2) → `conversational-reply` (M4) → `run-nudge-engine` / `close-loop` / `compute-risk` (M5) → `advance-simulation` (M8, which orchestrates the M5 trio).

**Delivery model (no direct deploy / no direct DB access):** author code + edge functions and push to GitHub — **Lovable syncs and deploys** them. Write every schema change as a numbered SQL file in `supabase/migrations/` and tell the user to run it in the **Lovable SQL Editor** (you do not apply SQL yourself). Generate `database.types.ts` by hand from your own migration SQL (no `supabase gen types`). See `CLAUDE.md` → "Deployment & database ownership".

---

## M0 — Foundation & auth
**Goal:** app shell that routes by role.
- Wire Supabase client; author `src/lib/database.types.ts` by hand from the schema (no `supabase gen types` — see Delivery model). Confirm the base schema (`supabase/migrations/001_init.sql`, i.e. the original `schema-migration.sql`) has been run in the Lovable SQL Editor before relying on tables.
- Supabase Auth with email/password. Create 5 demo users (one per role) via a setup script; link each to a `profiles` row with the right `role` and scope (`member_id`/`org_id`/`provider_id`).
- App shell with role-based routing: patient (mobile layout) vs navigator/clinician/employer (web layouts) vs admin (demo panel).
- Centralized `statusConfig` map (status → colour/label) per design semantics.
- Build a dev **role switcher** (admin-only) so the demo can jump between views without re-login.

**Acceptance:** logging in as each demo role lands on the correct shell; role switcher flips views instantly.

## M1 — Data layer & types
**Goal:** clean typed access; no raw queries in components.
- Keep `src/lib/database.types.ts` in sync with the schema **by hand** whenever you add a migration; flag any new `supabase/migrations/00X_*.sql` for the user to run in the Lovable SQL Editor.
- `src/lib/api/` modules: members, careplans, actions, nudges, messages, events, tasks, org, sim.
- TanStack Query hooks per entity with sensible cache keys.
- A `useSimDay()` hook reading `sim_state.current_day`; all date logic uses this, never `Date.now()`.

**Acceptance:** a smoke page can fetch and render members + their actions through the data layer.

## M2 — Clinician Care-Plan Builder (the moat)
**Goal:** produce the structured `care_plan_actions` object.
- Care-Plan Builder screen (ref Design Prompt 7): add actions with type, plain-language why, `clinical_priority`, `due_date`. Publishing sets `provenance='clinician_authored'`, `care_plans.status='active'`.
- **System-suggested actions:** build the **`suggest-actions`** edge function (spec §6) and render its output as `system_suggested` with Confirm/Dismiss. Confirm flips to `clinician_confirmed`; only confirmed/authored actions are nudge-eligible. The function must work with no Anthropic key (rules fallback).
- Live patient-preview pane mirroring the patient Home card.

**Acceptance:** a clinician can turn a consult into a published plan; a `system_suggested` action cannot be nudged until confirmed (enforced in M5).

## M3 — Patient app: Home, Action Detail, friction-removal
**Goal:** the patient can complete a step with one tap.
- Home (Design Prompt 1): progress ring, next-step cards with status badges, provenance badge, plain-language why, due date, primary action.
- Action Detail (Design Prompt 2): home-collection toggle (default ON), slot picker, **wallet-covered cost line (₹0 to pay)**, Confirm → creates a `clinical_events` (`appointment_booked`/`home_collection_scheduled`) and sets action `scheduled`.
- **Decline flow:** single-reason capture → sets `status='declined'`, stores `decline_reason`, maps reason → `drop_segment`; if action is `mandatory`, create a `navigator_tasks` (`declined_mandatory`). Non-coercive copy.
- Records tab: past consults + completed actions.

**Acceptance:** confirming a step schedules it and shows wallet-covered ₹0; declining a mandatory step creates a navigator task and never re-nudges.

## M4 — Patient chat (simulated WhatsApp)
**Goal:** conversational, human-feeling engagement channel.
- WhatsApp-style thread (Design Prompt 3) over the `messages` table; "simulated WhatsApp" banner.
- Render nudges as incoming messages with quick-reply chips (Book now / I have a question).
- Two-way: member replies persist; build the **`conversational-reply`** edge function (spec §5) to respond (scripted fallback when no key). A "talk to a human" path creates a `navigator_tasks`.

**Acceptance:** a nudge appears in chat; replying gets a non-pushy response; "talk to a human" creates a navigator task.

## M5 — Engine: nudges, suppression, close-loop, risk
**Goal:** the automated brain, with guardrails. Build all three edge functions to their specs in `04-edge-function-prompts.md`.
- **`run-nudge-engine`** (spec §3): for due/overdue, nudge-eligible actions, pick channel+template by segment. **Enforce suppression:** members in `cost`/`avoidance`/`trust` → insert `nudges` with `status='suppressed'`+`suppression_reason`, create a navigator task, send NO message. `forgot` → WhatsApp reminder. Never nudge `system_suggested` actions. Respect per-day and lifetime caps.
- **`close-loop`** (spec §2): match new `clinical_events` to open actions (member + compatible action_type) → `status='completed'`, set `completed_via_event_id`. Document whether this is the edge fn or a DB trigger; **if you choose a DB trigger, deliver it as a `supabase/migrations/00X_close_loop_trigger.sql` for the user to run in the Lovable SQL Editor** (you can't apply it yourself).
- **`compute-risk`** (spec §1): rules → tier (overdue mandatory, repeat declines, recent ER, chronic flag). Write `risk_tier/score/drivers`.

**Acceptance:** running the engine sends reminders only to `forgot`, suppresses + routes the structural segments, and a diagnostics event auto-completes its action.

## M6 — Navigator Console
**Goal:** humans act on the tail.
- Worklist (Design Prompt 4): prioritized `navigator_tasks` with priority pill, risk tier, segment chip, trigger reason, at-risk action, quick actions; filters by priority/tier/segment/reason.
- Member Detail (Design Prompt 5): risk drivers, care-plan timeline with provenance and **the auto-completed-from-event highlight**, engagement log, add-note, actions (call/WhatsApp/reschedule/resolve).
- Resolving a task sets `status='resolved'`, `resolved_at`.

**Acceptance:** a navigator opens a P1 task, sees why the member is flagged, acts, and resolves it; the auto-completed action is visibly labelled.

## M7 — Employer Dashboard + Trust Panel
**Goal:** the renewable-contract artifact.
- Dashboard (Design Prompt 6): KPI tiles (completion rate vs baseline, care gaps closed, est. claims cost avoided, active engagement); completion-over-time chart; completion-by-segment bar chart (Recharts).
- **Trust Panel:** % nudges clinician-authored (target 100%), count of suppressed low-value nudges, opt-out rate. Frame: "we don't spam your people."
- Cost figure via transparent `estimateClaimsAvoided()` (`src/lib/costModel.ts`) — build to **`05-cost-avoidance-model.md`**. Tile renders the function's output over seed data (do not hardcode a total); tooltip surfaces the formula, constants, the conservative attribution haircut, and "optional follow-ups excluded".
- Subscribe to Realtime so figures move when the sim advances.

**Acceptance:** advancing the sim visibly moves dashboard numbers; the Trust Panel shows suppressed-nudge counts and 100% clinician-authored.

## M8 — Demo Control / Simulation (the heartbeat)
**Goal:** make the closed loop visible in seconds.
- Build the **`advance-simulation`** edge function (spec §4): bump `sim_state.current_day`; mark overdue; run nudge engine; **simulate segment-dependent outcomes** (e.g., `forgot` members who got a reminder complete with some probability → create `diagnostic_completed`/`pharmacy_fulfilled` events → close-loop; `cost`/`avoidance` stay open until navigator resolves); recompute risk; create tasks. Return an **activity summary**. It orchestrates the M5 trio in the exact order given in the spec.
- Demo Control panel (Design Prompt 8): Advance 1 day / 7 days, live activity feed from the summary, Reset demo, role switcher.

**Acceptance:** clicking "Advance 1 day" produces a believable activity feed and visibly changes patient, navigator, and employer views.

## M9 — Demo dataset & narrative
**Goal:** a coherent story across all screens.
- `npm run seed`: ~30–40 fictional members across all risk tiers and segments under Acme Corp; providers; consults; published care plans with mixed action states; some prior clinical events; a few seeded navigator tasks; baseline metrics so the dashboard shows improvement from ~54% → ~71%.
- Hand-craft **4 hero members** that carry the narrative below.

**Demo narrative (script for the walkthrough):**
1. **Clinician** finishes Ananya's consult → builds a plan: 1 mandatory lab + 1 recommended follow-up; dismisses a system-suggested optional test (shows the provenance guardrail).
2. **Patient (Ananya)** gets a WhatsApp reminder → books **home collection**, **₹0 via wallet**. Advance a day → diagnostics event lands → **action auto-completes** (the signature moment).
3. **Patient (Rohan, `feels_better`/declines mandatory)** → "I feel fine." System does **not** spam → routes to navigator.
4. **Navigator** opens Rohan's P1 task, sees borderline risk drivers, calls, reschedules, resolves.
5. **Post-ER member** triggers a 72h navigator task automatically.
6. **Advance 7 days** → completion climbs, two members rise to High risk, dashboard updates live.
7. **Employer Dashboard** → completion 54%→71%, est. claims avoided, and the **Trust Panel**: 100% clinician-authored, N low-value nudges suppressed.

**Acceptance:** the 7-step script runs end-to-end without dead ends or empty states.

## M10 — Polish & deploy
- Empty/loading/error states; responsive checks (patient truly mobile, consoles desktop).
- Remove console noise; basic error boundaries.
- Confirm graceful LLM fallback with no API key.
- Build + deploy; verify the demo path on the deployed URL.

**Acceptance:** a cold run of the full narrative on the deployed build is smooth.

---

### Build order priority if time-boxed
Moat + loop + trust first: **M0 → M1 → M2 → M3 → M5 → M8 → M9 → M7**, then M4, M6, M10. Reason: the demo evaluation hinges on (a) structured care plan, (b) auto-closing loop, (c) suppression/trust story, (d) a live simulation that proves it — not on chat polish or navigator depth.
