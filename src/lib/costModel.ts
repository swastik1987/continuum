import type { Enums } from '@/lib/database.types'

type ActionType = Enums<'action_type'>
type ClinicalPriority = Enums<'clinical_priority'>
type RiskTier = Enums<'risk_tier'>

export interface CompletedAction {
  action_type: ActionType
  clinical_priority: ClinicalPriority
  member_risk_tier: RiskTier
}

export interface CostModelResult {
  estimatedClaimsAvoided: number
  avoidedByAction: number[]
  assumptions: typeof ASSUMPTIONS
}

// ── Named tunable constants ──────────────────────────────────────────────────
// Avg. cost (INR) of a claimable event that might have been avoided by
// completing the recommended action. Based on indicative Indian OPD/IP tariffs.
const EVENT_COST_INR: Record<ActionType, number> = {
  lab_test: 3_000,
  follow_up_consult: 2_500,
  medication: 1_500,
  vaccination: 2_000,
  lifestyle: 0,      // lifestyle actions affect risk but not a direct claim cost
  imaging: 8_000,
}

// Probability that missing an action of this care type leads to a claimable
// downstream event, by risk tier.
const BASELINE_EVENT_RATE: Record<RiskTier, number> = {
  high: 0.35,
  medium: 0.18,
  low: 0.05,
}

// Fraction of risk reduction attributable to completing the action.
const RISK_REDUCTION = 0.45

// Attribution: fraction of the avoided cost reasonably credited to the platform
// (vs. what the member would have done independently).
const ATTRIBUTION = 0.60

// Optional actions are excluded; mandatory/recommended are weighted.
const PRIORITY_WEIGHT: Record<ClinicalPriority, number> = {
  mandatory: 1.0,
  recommended: 0.6,
  optional: 0.0,
}

export const ASSUMPTIONS = {
  EVENT_COST_INR,
  BASELINE_EVENT_RATE,
  RISK_REDUCTION,
  ATTRIBUTION,
  PRIORITY_WEIGHT,
  disclaimer:
    'Illustrative model — not actuarial. Based on population-level assumptions and indicative Indian tariffs. Individual results will vary. Not for regulatory or underwriting use.',
}
// ────────────────────────────────────────────────────────────────────────────

/**
 * Estimates INR claims cost avoided across a set of completed care plan actions.
 *
 * Formula per action:
 *   avoided = eventCost × baselineEventRate[riskTier] × riskReduction × attribution × priorityWeight
 *
 * Optional actions (priorityWeight = 0) contribute ₹0.
 */
export function estimateClaimsAvoided(completedActions: CompletedAction[]): CostModelResult {
  let total = 0
  const avoidedByAction: number[] = []

  for (const action of completedActions) {
    const weight = PRIORITY_WEIGHT[action.clinical_priority]
    if (weight === 0) {
      avoidedByAction.push(0)
      continue
    }
    const avoided =
      EVENT_COST_INR[action.action_type] *
      BASELINE_EVENT_RATE[action.member_risk_tier] *
      RISK_REDUCTION *
      ATTRIBUTION *
      weight
    avoidedByAction.push(Math.round(avoided))
    total += avoided
  }

  return {
    estimatedClaimsAvoided: Math.round(total),
    avoidedByAction,
    assumptions: ASSUMPTIONS,
  }
}
