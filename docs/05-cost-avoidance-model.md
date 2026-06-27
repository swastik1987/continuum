# Continuum — Claims Cost-Avoidance Model Spec (for Claude Code)

**File to build:** `src/lib/costModel.ts` — a pure, unit-testable function `estimateClaimsAvoided()`. Used by the Employer Dashboard (M7) "Est. claims cost avoided" tile and the by-segment breakdown.

**Why this spec is strict:** this is the single most-scrutinised number in the demo. A black-box figure invites disbelief; a transparent, conservative, tunable formula invites trust. The goal is **defensible, not impressive**. Constants are illustrative and must be editable in one place, and the UI must expose them.

---

## The model (expected-value, not actuarial)

The claim is simple and honest: completing a **clinically-indicated** follow-up lowers the chance that a member suffers a costly downstream event (an avoidable hospitalisation or ER episode) within a time horizon. The avoided cost is the *expected value* of that reduction, with a conservative haircut so we never overclaim.

Per qualifying completed action *i*:

```
avoided_i = eventCost
          × baselineEventRate[tier_i]
          × riskReduction
          × attribution
          × priorityWeight[priority_i]
```

Total = Σ avoided_i over all qualifying completed actions in the selected period.

**What qualifies (this is also the anti-induced-demand guardrail):**
- `status = 'completed'` AND `clinical_priority IN ('mandatory','recommended')`.
- **`optional` actions are excluded entirely** — we do not bank savings on low-value care. This is deliberate: the economics must reward necessary care only, or the model becomes an upsell justification.

---

## The constants (illustrative defaults — centralise at top of file)

```ts
export const COST_MODEL = {
  // Avg cost of one avoidable acute episode (hospitalisation/ER) in a private
  // corporate-health setting, INR. Tune to the employer's actual claims data.
  eventCostINR: 50000,

  // Probability a member in each risk tier suffers such an event within the
  // ~12-month horizon IF the indicated follow-up is NOT completed.
  baselineEventRate: { high: 0.18, medium: 0.07, low: 0.02 },

  // Relative reduction in that probability from completing the indicated
  // follow-up (early detection / adherence effect). Deliberately conservative.
  riskReduction: 0.30,

  // Fraction of the modelled reduction we credibly attribute to Continuum
  // (vs. would-have-happened-anyway). A conservative haircut, by design.
  attribution: 0.50,

  // Weight by clinical priority. Recommended actions count at half.
  priorityWeight: { mandatory: 1.0, recommended: 0.5, optional: 0.0 },
} as const;
```

**Per-action values these produce** (eventCost × rate × 0.30 × 0.50 × priorityWeight):
- High-tier, mandatory: 50000 × 0.18 × 0.30 × 0.50 × 1.0 = **₹1,350**
- Medium-tier, mandatory: 50000 × 0.07 × 0.30 × 0.50 × 1.0 = **₹525**
- Low-tier, mandatory: 50000 × 0.02 × 0.30 × 0.50 × 1.0 = **₹150**
- Recommended actions: half the above.

Summed across the seed dataset's completed qualifying actions, this yields the dashboard figure. **Do not hardcode a total** (e.g. the "₹1.4 Cr" in the design mock is a placeholder) — the tile renders the function's output over real seed data.

---

## Function contract

```ts
type Avoided = {
  totalINR: number;
  byTier: Record<'high'|'medium'|'low', number>;
  bySegment: Record<string, number>;     // drop_segment -> INR, for the breakdown
  qualifyingActions: number;             // count included
  excludedOptional: number;              // count excluded (transparency)
  assumptions: typeof COST_MODEL;        // echo constants back for the UI tooltip
};

export function estimateClaimsAvoided(
  actions: CompletedActionRow[],         // joined: action + member tier + segment + priority
  model = COST_MODEL,
): Avoided
```

- Pure function, no DB calls — caller passes the rows. Easy to unit-test.
- Sum per-action contributions; bucket by tier and by `drop_segment`; count qualifying vs excluded-optional.
- Return the `assumptions` so the dashboard tooltip can render them live.

---

## UI requirements (M7)
- The tile shows `totalINR`, formatted in INR (Cr/L), with a small **"illustrative model"** tag.
- A tooltip / "How is this calculated?" popover surfaces, in plain words: the formula, the four constants and their values, the conservative attribution haircut, and the line **"Optional follow-ups are excluded — we only count clinically-required care."**
- A short footnote: figures are an expected-value estimate, not actuarial; calibrate against the employer's real claims history in production.

---

## Honest caveats (state these if asked; bake the first into the tooltip)
- This is an **expected-value estimate**, not an actuarial reserve. It needs the employer's real claims data to calibrate `eventCostINR` and `baselineEventRate`.
- `riskReduction` and `attribution` are conservative placeholders; the literature on early-detection/adherence efficacy varies by condition, so production should segment them by condition rather than use one blended value.
- The model is intentionally biased **low** (50% attribution haircut, optional care excluded) so the number underclaims rather than overclaims — easier to defend, and it protects the trust story.

---

## Wire-in
- Referenced by Employer Dashboard (M7). Add `-- TODO(prod): calibrate constants from employer claims feed` near the constants.
- Add a one-line pointer in `CLAUDE.md` (cost model section) and plan M7 to this file.
