# Continuum — Edge Function Specs (for Claude Code)

These are buildable specs for every Supabase Edge Function in the prototype. The implementation plan (`03-implementation-plan.md`) tells you **when** to build each; this file tells you **what** each does. The product invariants in `CLAUDE.md` are binding — especially provenance and suppression. Build each function to its **Acceptance** check.

## Shared conventions (apply to all functions)
- Supabase Edge Function (Deno). One folder per function under `supabase/functions/<name>/index.ts`.
- Use the **service-role key** for DB writes (server-side only; never ship to client). Supabase **auto-injects** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into deployed functions — read them with `Deno.env.get(...)`; no manual secret setup. Standard CORS headers so the app can invoke via `supabase.functions.invoke`.
- **All date logic uses `sim_state.current_day`**, never `Date.now()`. Read it once at the top.
- Return JSON `{ ok: true, ... }` or `{ ok: false, error }`; never throw uncaught.
- Functions that call Anthropic read the key from a Supabase secret (e.g. `ANTHROPIC_API_KEY`) and **must degrade to a deterministic fallback when the key is absent** — the demo must never break on a missing key. Use a current Claude model string; keep `max_tokens` small.
- Idempotency where noted (don't create duplicate open tasks / duplicate same-day nudges).
- Suggested numeric constants are **illustrative defaults** — centralize them at the top of each file so they're easy to tune.

---

## 1. `compute-risk` — rules-based risk scoring
**Milestone:** M5. **Invoked by:** direct call and by `advance-simulation`.

**Input:** `{ member_id?: string }` — if omitted, recompute all members.

**Logic (deterministic):** for each target member, start `score = 0` and collect `drivers: string[]`:
- `+3` per **overdue mandatory** action → driver "N overdue mandatory step(s)".
- `+3` per **declined mandatory** action → driver "Declined a required step".
- `+2` if the member has **≥2 historical missed/declined/overdue** actions → driver "Repeat drop-off pattern".
- `+4` if an **`er_visit`** clinical_event occurred within 30 sim-days → driver "Recent emergency visit".
- `+2` if `is_chronic` → driver "Chronic condition".
- Tier: `score >= 6` → `high`; `score >= 3` → `medium`; else `low`.

Write `members.risk_score`, `risk_tier`, `risk_drivers` (jsonb array of the driver strings).

**Output:** `{ ok, updated: number }`.
**Acceptance:** a chronic member with one overdue mandatory action computes to `high` with readable drivers.

---

## 2. `close-loop` — auto-complete actions from clinical events
**Milestone:** M5. **Invoked by:** `advance-simulation`, and after a patient books/attends in the app.
> Implementation note: a Postgres trigger on `clinical_events` insert is the robust alternative. Pick ONE and document it in `CLAUDE.md`. Spec below assumes the edge function; trigger logic is identical.

**Input:** `{ event_id?: string }` — if given, match just that event; else scan all events with `linked_action_id IS NULL`.

**Logic:** for each target completion-type event (`diagnostic_completed`, `pharmacy_fulfilled`, `appointment_attended`):
- Map event → compatible action_type(s):
  - `diagnostic_completed` → `lab_test`, `imaging`
  - `pharmacy_fulfilled` → `medication`
  - `appointment_attended` → `follow_up_consult`
- Find the **oldest open** action (`status IN ('pending','scheduled','overdue')`) for that member with a compatible `action_type`.
- If found: set action `status='completed'`, `completed_via_event_id = event.id`; set `event.linked_action_id = action.id`.

**Guardrails:** only completes; never nudges; never touches `declined`/`completed` actions.
**Output:** `{ ok, matched: number }`.
**Acceptance:** inserting a `diagnostic_completed` event for a member with an open `lab_test` action completes that action and links both rows. **This is the product's signature moment — make sure it's reliable.**

---

## 3. `run-nudge-engine` — segment-aware nudging with suppression
**Milestone:** M5. **Invoked by:** `advance-simulation`, and callable directly. Uses `sim_state.current_day`.

**Input:** `{ }`.

**Select nudge-eligible actions:** `status IN ('pending','scheduled','overdue')` **AND** `provenance IN ('clinician_authored','clinician_confirmed')` **AND** (`due_date` between `current_day` and `current_day + 3` **OR** already overdue). Exclude `declined`, `completed`, `snoozed`, and anything `system_suggested`.

**For each eligible action**, branch on `members.drop_segment`:
- **`cost` | `avoidance` | `trust` → SUPPRESS.** Insert a `nudges` row with `status='suppressed'` and a `suppression_reason` (e.g. "Cost barrier — routed to human"). Create a `navigator_tasks` row (`trigger_reason='structural_barrier'`, `priority='p2'`) **if no open task already exists for that member+reason**. **Insert NO `messages` row.** (This powers the employer Trust Panel.)
- **`feels_better` → ONE educational nudge.** If this action has no prior `sent` nudge, send a gentle educational WhatsApp message (template explains the clinician's reasoning, non-coercive). If it already has a prior nudge and is still open, create a `navigator_tasks` (`repeat_dropper`, `p3`) instead of nudging again.
- **`forgot` | `logistics` | `lost_thread` | `none` → SEND.** Insert `nudges` row `status='sent'`, channel `whatsapp`, `template_key` chosen by segment+action_type. Insert a patient-facing `messages` row (`sender='system'`, `channel='whatsapp'`, rendered body).

**Caps / dedupe:** max 1 nudge per action per sim-day; max 3 lifetime `sent` nudges per action — on the 4th eligibility, create a `repeat_dropper` navigator task instead.

**Template map** (centralize; support `{name} {action} {why} {date}`). Examples:
- `forgot_lab_test`: "Hi {name}, a quick reminder from your care team: your {action} is due by {date}. {why} Tap *Book now* and we'll arrange home collection — no cost to you."
- `feels_better_edu`: "Hi {name}, glad you're feeling better. Dr. flagged your {action} because {why} — it's a quick check to be safe. Want to book it, or talk to someone about it?"
- `logistics_lab_test`: "Hi {name}, we can send a technician to your home for your {action} — pick a slot that suits you. Due by {date}."

**Guardrails:** never nudge `system_suggested`; never nudge `declined`/`completed`; always suppress the three structural segments; respect caps.
**Output:** `{ ok, sent, suppressed, tasks_created }`.
**Acceptance:** a `forgot` member gets a WhatsApp message; a `cost` member gets a **suppressed** nudge + navigator task and **no message**; a `system_suggested` action gets nothing.

---

## 4. `advance-simulation` — the demo heartbeat
**Milestone:** M8. **Invoked by:** the Demo Control panel.

**Input:** `{ days?: number }` (default 1). Loop the steps below `days` times.

**Per simulated day, in this exact order:**
1. `current_day += 1`; update `sim_state`.
2. **Mark overdue:** actions `status IN ('pending','scheduled')` with `due_date < current_day` → `status='overdue'`.
3. **Nudge:** call `run-nudge-engine`; capture its counts and the IDs of actions nudged this day.
4. **Simulate patient responses** to actions nudged *this day*, by segment (probabilities are illustrative defaults — centralize them):
   - `forgot` ~60% complete · `logistics` ~40% · `lost_thread` ~45% · `none` ~50%.
     On "complete": insert a `clinical_events` row of the matching type (`lab_test`→`diagnostic_completed` from `diagnostics`; `medication`→`pharmacy_fulfilled` from `pharmacy`; `follow_up_consult`→`appointment_attended` from `clinic`).
   - `feels_better` ~15% complete; otherwise ~40% **decline** → set action `declined`, `decline_reason='Feeling better'`; if mandatory, create `declined_mandatory` navigator task.
   - `cost` | `avoidance` | `trust`: no automated completion (they were suppressed) — left open for navigator resolution.
5. **Occasional ER:** with small probability, insert an `er_visit` clinical_event for a random member → create a `post_er_72h` navigator task.
6. **Close loop:** call `close-loop` to match the new events to open actions.
7. **Recompute risk:** call `compute-risk` for affected members.
8. **Escalate:** create `high_risk_overdue` tasks for `high`-tier members with an overdue mandatory action (dedupe against open tasks).
9. **Activity feed:** accumulate human-readable lines, e.g. "Day 15 · 18 reminders sent, 3 suppressed (structural) · 7 tests auto-completed · 2 members → High risk · 1 ER follow-up created".

**Output:** `{ ok, current_day, counts, activity: string[] }`.
**Determinism:** default to live randomness for a lively demo; expose a `seed?` input that, when set, makes the run repeatable (use a seeded PRNG) so you can rehearse the founder demo identically.
**Acceptance:** "Advance 1 day" returns a believable activity feed and visibly changes the patient, navigator, and employer views (Realtime-subscribed).

---

## 5. `conversational-reply` — patient chat (optional Claude, M4)
**Milestone:** M4. **Invoked by:** the patient chat when a member sends a message.

**Input:** `{ member_id, message }`.

**Logic:**
- Load context: member `full_name` + `drop_segment`, their open actions (title + `why_plain` + priority + due_date), and the last ~6 `messages`.
- **System prompt:** warm, concise CNH care assistant; **never coercive, never guilt**; if the member signals "I feel fine" / cost worry / fear → acknowledge and **offer to connect a human navigator**; surface the action's plain-language `why`; **never give clinical advice beyond the clinician's care plan**.
- Call Anthropic (key from secret). Insert the reply as a `messages` row (`sender='system'`).
- **Human-handoff detection** (model or rules): on intent like "talk to someone", strong reluctance, or distress → create a `navigator_tasks` row (map reason: cost→`structural_barrier`, fear→`structural_barrier`/`abnormal_result` as appropriate) and add a system chip message "Connecting you to a care navigator."

**Fallback (no key — must work):** keyword intent detection →
- "fine" / "don't need" / "feel better" → empathetic, non-pushy reply + offer human.
- "cost" / "expensive" / "afford" → reassure it's wallet-covered (₹0) + offer human.
- "reschedule" / "later" / "busy" → offer to pick a new slot.
- else → a helpful generic reply pointing to the next step.

**Guardrails:** no clinical advice beyond the care plan; never coercive; send only minimal context to the API.
**Output:** `{ ok, reply, handoff: boolean }`.
**Acceptance:** with **no** key set, "I feel fine" returns an empathetic, non-pushy reply and offers a human; with a key set, it reads conversationally.

---

## 6. `suggest-actions` — care-plan suggestions (optional Claude, M2)
**Milestone:** M2. **Invoked by:** the Clinician Care-Plan Builder.

**Input:** `{ consultation_id }` (load `chief_complaint` + `summary` + `member_id`).

**Logic:**
- **Prompt:** given the complaint/summary, propose **1–3** plausible follow-up actions. Return **JSON only**, each item: `{ action_type, title, why_plain, suggested_priority, due_offset_days }`.
- Call Anthropic; parse JSON (strip code fences; validate enums; clamp count to 3).
- **Persist** each as a `care_plan_actions` row with `provenance='system_suggested'`, `status='pending'`, `due_date = current_day + due_offset_days`, linked to the consult's care_plan (create a draft `care_plans` row if none exists). These rows are **real and queryable** — they demonstrate the guardrail (a `system_suggested` action is **not** nudge-eligible).
- The Builder UI then lets the clinician **Confirm** (→ update `provenance='clinician_confirmed'`) or **Dismiss** (→ delete the row, or set `status='declined'`).

**Fallback (no key — must work):** keyword→suggestion rules, e.g. "sugar/diabetes" → HbA1c `lab_test` (recommended) + Endocrinology `follow_up_consult`; "bp/hypertension" → lipid panel `lab_test` + BP-monitoring `lifestyle`; "fever" → CBC `lab_test`.

**Guardrails:** suggested actions are **always** `provenance='system_suggested'` and **never** nudge-eligible until a clinician confirms. `run-nudge-engine` must already exclude them.
**Output:** `{ ok, suggestions: CarePlanAction[] }`.
**Acceptance:** with **no** key, a diabetes consult yields sensible `system_suggested` actions that cannot be nudged until confirmed.

---

## Build & deploy order
Build in milestone order: **M2** `suggest-actions` → **M4** `conversational-reply` → **M5** `run-nudge-engine`, `close-loop`, `compute-risk` → **M8** `advance-simulation` (which orchestrates the M5 trio). Place each at `supabase/functions/<name>/index.ts` and **push to GitHub — do NOT run `supabase functions deploy`; Lovable syncs and deploys the functions.** If a function needs `verify_jwt` settings or appears in `supabase/config.toml`, include that config so Lovable deploys it correctly. Functions rely on the auto-injected `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`; the only manual secret is `ANTHROPIC_API_KEY` (user sets it in the Supabase dashboard), and every Claude path must still run without it via its scripted fallback.
