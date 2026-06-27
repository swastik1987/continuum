# CLAUDE.md — Continuum

## What this is
**Continuum** is a prototype of Connect & Heal's (CNH) **closed-loop care-continuity engine**. It exists to demonstrate to CNH's founders and CTO that follow-up drop-off can be reduced by (a) productizing the care plan into a structured, trackable object, (b) removing friction so the next step is the default, (c) putting human navigators only on the risk-stratified tail, and (d) proving to employers we improve engagement and avoid future claims cost **without spamming patients to bill tests**.

This is a **demo prototype for evaluation**, not production. Optimize for a crisp, believable end-to-end walkthrough over completeness. When in doubt, build the thing that makes the *closed loop* and the *trust story* legible.

## Product thesis (use this to make trade-offs)
- The drop-off population is **not monolithic** — it splits into behaviour segments (`forgot`, `cost`, `feels_better`, `logistics`, `lost_thread`, `trust`, `avoidance`). Different segments get different treatment.
- **Friction-removal beats nudging.** Reminders only fix "forgot." Pre-booking, home collection, and wallet pre-payment fix the structural segments. Build friction-removal as first-class, not an afterthought.
- **Reminders are cheap top-of-funnel, not the centerpiece.** Automated nudges target only the `forgot` segment.
- **Navigators (humans) ride the tail** — only the high-risk / declined-mandatory / post-ER / repeat-dropper cases.
- **The structured care-plan action object is the moat.** Every recommendation is a typed `care_plan_actions` row with priority, due date, status, and provenance — never free text.
- **Closed loop:** a `clinical_events` row (diagnostic completed, pharmacy fulfilled, etc.) auto-completes the matching action. Show this happening — it's the signature moment.
- **Outcome we sell:** patient engagement + employer claims-cost avoidance. NOT diagnostics revenue.

## Non-negotiable invariants (guardrails)
1. **Provenance is always set.** No nudge may fire for an action whose `provenance = system_suggested`. System may *suggest* actions; only a clinician converts them to `clinician_confirmed`. Mandatory-priority nudges require `clinician_authored` or `clinician_confirmed`.
2. **No spamming structural-barrier segments.** The nudge engine must **suppress** automated nudges for members in `cost`, `avoidance`, and `trust` segments and instead create a `navigator_tasks` row. Record the suppression as a `nudges` row with `status = 'suppressed'` and a `suppression_reason` (this powers the employer Trust Panel).
3. **Decline is respected.** A patient declining an action is a first-class, non-coercive path. Declining a `mandatory` action routes to a navigator; it never triggers repeat automated nudging.
4. **Demo data only.** No real PHI. All members are clearly fictional. No real WhatsApp/Meta API, no real payment rails — both are simulated in-app.

## Tech stack
- **Frontend:** React + Vite + TypeScript + Tailwind + shadcn/ui, React Router, TanStack Query, Supabase JS client. Recharts for dashboard charts.
- **Backend:** Supabase — Postgres + RLS + Edge Functions (Deno) + Realtime.
- **LLM (optional):** Anthropic API via Edge Function, key in Supabase secrets. **Must degrade gracefully** to scripted behaviour if no key — the demo must never break on a missing key.
- **Source of truth for schema:** the migration already applied via Lovable (see `02-lovable-setup-prompt.md`). Evolve it with new migration files under `supabase/migrations/`.

## Architecture
- **Role-based app shell.** One app, four experiences keyed off `profiles.role`:
  - `patient` → mobile-first layout (Home, Chat, Records, Profile).
  - `navigator` → web console (Worklist, Member Detail, Tasks).
  - `clinician` → web Care-Plan Builder.
  - `employer_admin` → web Employer Dashboard.
  - `admin` → Demo Control panel + role switcher (god mode for the demo).
- **Data access** via a thin typed data layer (`src/lib/api/*`) using generated Supabase types (`supabase gen types typescript`). No raw queries in components.
- **Realtime:** the Employer Dashboard and Navigator Worklist subscribe to relevant tables so they visibly update when the simulation advances.
- **Edge Functions** (`supabase/functions/`):
  - `advance-simulation` — the demo heartbeat. Advances `sim_state.current_day`, marks overdue actions, runs the nudge engine, simulates segment-dependent completions (creating `clinical_events`), recomputes risk, generates navigator tasks. Returns an activity summary for the demo feed.
  - `run-nudge-engine` — for the current day, evaluate due/overdue actions; pick channel + template per segment; **enforce suppression rules**; insert `nudges` + patient-facing `messages`.
  - `compute-risk` — rules-based risk scoring → `members.risk_tier/risk_score/risk_drivers`.
  - `close-loop` — match `clinical_events` to open `care_plan_actions` (by member + action_type + recency) and mark `completed`, setting `completed_via_event_id`. (May also be a DB trigger; pick one and document it.)
  - `conversational-reply` *(optional, Claude)* — respond to a member chat message; scripted fallback.
  - `suggest-actions` *(optional, Claude)* — from a consult summary, propose candidate actions as `system_suggested`; rules-based fallback.

## Conventions
- TypeScript strict. Functional components + hooks. Co-locate by feature: `src/features/{patient,navigator,clinician,employer,demo}/`.
- Shared UI in `src/components/ui` (shadcn). Status semantics centralized in one `statusConfig` map (colours/labels) — never hardcode status colours in components.
- All money shown as INR. All dates relative to `sim_state.current_day`, **not** wall-clock — the demo runs on simulated time.
- Secrets only in Supabase Edge Function env, never in client bundle.
- Keep components presentational; business logic in edge functions or `src/lib`.

## Deployment & database ownership (read this — it governs how you ship)
You (Claude Code) **author** everything but **do not deploy or touch the database directly**. There is no Supabase CLI on this machine. The pipeline is:
- **App code & edge functions:** you write them and push to GitHub. **Lovable syncs and deploys** both the app and the Supabase edge functions. Do not run `supabase functions deploy`.
- **SQL / schema:** you write every schema change as a numbered SQL migration file under `supabase/migrations/` (e.g. `001_init.sql` = the existing `schema-migration.sql`, `002_...sql`, etc.). **The user runs these by hand in the Lovable SQL Editor.** Never assume you can apply SQL yourself. When a milestone needs a migration, say clearly: *"Run `supabase/migrations/00X_name.sql` in the Lovable SQL Editor now, before continuing."*
- **Types:** generate `src/lib/database.types.ts` **by hand from the schema you authored** (it's deterministic from your migration SQL). Do not rely on `supabase gen types`.
- **Edge function env:** Supabase **auto-injects** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into deployed functions — use `Deno.env.get(...)`, no manual setup. The only manually-set secret is `ANTHROPIC_API_KEY` (user sets it in the Supabase dashboard → Edge Functions → Secrets); functions must run without it via scripted fallback.

## Commands
- `npm run dev` — local dev
- `npm run build` — production build
- `npm run seed` — run the demo seed script (Claude Code creates this; see plan M9)
- (No `supabase functions deploy` / no `supabase gen types` — see "Deployment & database ownership" above.)

## Design reference
UI was designed in Claude Design (see `01-claude-design-prompts.md`). Match its layout, colour semantics, and the Continuum design system. Mirror the four status semantics: done=green, pending=slate, overdue=amber, declined/urgent=red.

## Deferred for prototype (state these openly if asked; do not silently skip)
- **Production RLS scoping** — prototype uses permissive authenticated policies. Intended production policy: patients see only their own rows; navigators see their assigned members; employer_admins see only their org (aggregate only, no individual PHI); clinicians see their consults. Leave a `-- TODO(prod-rls)` comment where this matters.
- Real WhatsApp Business API (Meta) — simulated via in-app chat.
- Real payments / wallet ledger — simulated balance only.
- DPDP-compliant consent capture, audit logging, data residency — note as required for production.

## The cost-avoidance model (keep it transparent — the CTO will probe it)
Full spec in `05-cost-avoidance-model.md`. Do NOT hardcode a magic number. Implement `estimateClaimsAvoided()` as a transparent, tunable pure function in `src/lib/costModel.ts`:
`avoided = Σ over completed mandatory/recommended actions of (eventCost × baselineEventRate[tier] × riskReduction × attribution × priorityWeight)`
with named, editable constants, optional actions excluded, and a clear "illustrative — not actuarial" label plus an assumptions tooltip surfaced in the UI.
