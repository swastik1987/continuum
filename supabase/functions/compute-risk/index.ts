// compute-risk — rules-based risk scoring for all members.
// Updates members.risk_score, risk_tier, and risk_drivers (structured JSON).
// Safe to call repeatedly; idempotent per run.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

type RiskDriver = {
  icon: string
  label: string
  detail: string
  color: 'red' | 'amber' | 'slate'
}

// Segment multipliers — structural barriers amplify risk
const SEGMENT_MULTIPLIER: Record<string, number> = {
  avoidance: 1.25,
  trust: 1.15,
  cost: 1.10,
  feels_better: 0.90,
  forgot: 1.0,
  logistics: 1.05,
  lost_thread: 1.05,
  none: 1.0,
}

function tierFromScore(score: number): 'low' | 'medium' | 'high' {
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get sim day
    const { data: sim } = await supabase
      .from('sim_state')
      .select('current_day')
      .eq('id', 1)
      .single()
    const today = sim?.current_day ?? new Date().toISOString().slice(0, 10)

    // Load all members
    const { data: members } = await supabase.from('members').select('*')
    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ ok: true, updated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let updated = 0

    for (const member of members) {
      // Load care plan actions for this member
      const { data: actions } = await supabase
        .from('care_plan_actions')
        .select('*')
        .eq('member_id', member.id)
        .in('status', ['overdue', 'declined', 'pending'])

      // Load last nudge engagement within 14 days
      const cutoff = new Date(today)
      cutoff.setDate(cutoff.getDate() - 14)
      const { data: recentNudges } = await supabase
        .from('nudges')
        .select('status, sent_at')
        .eq('member_id', member.id)
        .gte('sent_at', cutoff.toISOString())
        .in('status', ['read', 'responded', 'delivered'])

      // Load ER visits within 30 days
      const erCutoff = new Date(today)
      erCutoff.setDate(erCutoff.getDate() - 30)
      const { data: erEvents } = await supabase
        .from('clinical_events')
        .select('id')
        .eq('member_id', member.id)
        .eq('event_type', 'er_visit')
        .gte('occurred_at', erCutoff.toISOString())

      // ── Scoring ──────────────────────────────────────────────────────────
      let score = 0
      const drivers: RiskDriver[] = []

      const overdueActions = (actions ?? []).filter((a) => a.status === 'overdue')
      const declinedActions = (actions ?? []).filter((a) => a.status === 'declined')

      // Overdue mandatory actions: +25 each
      const overdueMandatory = overdueActions.filter((a) => a.clinical_priority === 'mandatory')
      if (overdueMandatory.length > 0) {
        score += 25 * overdueMandatory.length
        drivers.push({
          icon: 'clock',
          label: `${overdueMandatory.length} overdue mandatory action${overdueMandatory.length > 1 ? 's' : ''}`,
          detail: overdueMandatory.map((a) => a.title).join(', '),
          color: 'red',
        })
      }

      // Overdue recommended actions: +12 each
      const overdueRecommended = overdueActions.filter((a) => a.clinical_priority !== 'mandatory')
      if (overdueRecommended.length > 0) {
        score += 12 * overdueRecommended.length
        drivers.push({
          icon: 'clock',
          label: `${overdueRecommended.length} overdue action${overdueRecommended.length > 1 ? 's' : ''}`,
          detail: overdueRecommended.map((a) => a.title).join(', '),
          color: 'amber',
        })
      }

      // Declined mandatory: +18 each
      const declinedMandatory = declinedActions.filter((a) => a.clinical_priority === 'mandatory')
      if (declinedMandatory.length > 0) {
        score += 18 * declinedMandatory.length
        drivers.push({
          icon: 'circle-slash',
          label: `Declined mandatory test`,
          detail: declinedMandatory.map((a) => `${a.title}${a.decline_reason ? ` — "${a.decline_reason}"` : ''}`).join('; '),
          color: 'red',
        })
      }

      // No engagement in 14 days: +10
      const hasRecentEngagement = (recentNudges ?? []).length > 0
      if (!hasRecentEngagement && (actions ?? []).length > 0) {
        score += 10
        drivers.push({
          icon: 'activity',
          label: 'No engagement in 14 days',
          detail: 'No read/responded nudges recorded recently',
          color: 'amber',
        })
      }

      // ER visit within 30 days: +30
      if ((erEvents ?? []).length > 0) {
        score += 30
        drivers.push({
          icon: 'activity',
          label: 'Recent ER visit',
          detail: 'Emergency admission within 30 days',
          color: 'red',
        })
      }

      // Segment multiplier
      const multiplier = SEGMENT_MULTIPLIER[member.drop_segment ?? 'none'] ?? 1.0
      score = Math.round(Math.min(100, score * multiplier))

      const tier = tierFromScore(score)

      // Update member
      await supabase
        .from('members')
        .update({
          risk_score: score,
          risk_tier: tier,
          risk_drivers: drivers,
        })
        .eq('id', member.id)

      updated++
    }

    return new Response(JSON.stringify({ ok: true, updated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('compute-risk error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
