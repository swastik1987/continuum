// advance-simulation — demo heartbeat.
// Orchestrates run-nudge-engine → close-loop → compute-risk per simulated day.
// Also handles full reset: deletes simulation-created rows and restores seed state.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// ── Tunable simulation constants ─────────────────────────────────────────────
const BASE_DATE = '2026-06-14'          // seed's sim start date
const ER_PROBABILITY = 0.03             // per member per sim day
const MAX_DAYS = 30                     // safety cap on days input

// Probability of completing an action when nudged, by segment
const COMPLETION_PROB: Record<string, number> = {
  forgot:       0.60,
  logistics:    0.40,
  lost_thread:  0.45,
  none:         0.50,
  feels_better: 0.15,
  // cost / avoidance / trust: not simulated — already suppressed by nudge engine
}

// Additional probability of declining (applied after non-completion roll)
const DECLINE_PROB: Record<string, number> = {
  feels_better: 0.40,
}

// Maps care_plan_actions.action_type → clinical_events row values on completion
const COMPLETE_EVENT: Record<string, { eventType: string; source: string }> = {
  lab_test:          { eventType: 'diagnostic_completed', source: 'diagnostics' },
  imaging:           { eventType: 'diagnostic_completed', source: 'diagnostics' },
  medication:        { eventType: 'pharmacy_fulfilled',   source: 'pharmacy'    },
  follow_up_consult: { eventType: 'appointment_attended', source: 'clinic'      },
  vaccination:       { eventType: 'appointment_attended', source: 'clinic'      },
  // lifestyle → no completion event
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function addDays(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function fmtDate(date: string): string {
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const d = new Date(date + 'T00:00:00Z')
  return `${d.getUTCDate()} ${M[d.getUTCMonth()]}`
}

// xorshift32 PRNG for seeded runs (repeatable demo rehearsal)
function makeRng(seed?: number): () => number {
  if (!seed) return () => Math.random()
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 0x100000000
  }
}

// Call a Supabase Edge Function with a 15-second graceful timeout
async function callFn(name: string, body: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/${name}`
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  try {
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), 15_000)
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    clearTimeout(tid)
    return res.ok ? (await res.json() as Record<string, unknown>) : {}
  } catch (e) {
    console.warn(`${name} sub-call failed:`, e)
    return {}
  }
}

// ── CORS ─────────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// ── Types ─────────────────────────────────────────────────────────────────────
type DayActivity = {
  date: string
  dateLabel: string
  nudged: number
  suppressed: number
  closed: number
  routed: number
  er: number
  newHighRisk: number
}

// ── Main ─────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const body = await req.json().catch(() => ({})) as {
      days?: number
      reset?: boolean
      sessionStartedAt?: string
      seed?: number
    }
    const { days = 1, reset = false, sessionStartedAt, seed } = body

    // ══════════════════════════════════════════════════════════════════════════
    // RESET — undo rows created since this session started
    // ══════════════════════════════════════════════════════════════════════════
    if (reset) {
      const since = sessionStartedAt ?? new Date(0).toISOString()

      // Collect IDs of clinical events about to be deleted so we can unlink actions
      const { data: eventsToDelete } = await supabase
        .from('clinical_events')
        .select('id')
        .gte('occurred_at', since)
      const deletedEventIds = (eventsToDelete ?? []).map((e: { id: string }) => e.id)

      // Delete simulation-created rows (nudges use sent_at; events/tasks use occurred_at/created_at)
      await supabase.from('clinical_events').delete().gte('occurred_at', since)
      await supabase.from('nudges').delete().gte('sent_at', since)
      await supabase.from('navigator_tasks').delete().gte('created_at', since)
      await supabase.from('messages').delete().gte('created_at', since)

      // Reset actions completed via deleted events
      if (deletedEventIds.length > 0) {
        await supabase
          .from('care_plan_actions')
          .update({ status: 'pending', completed_via_event_id: null })
          .in('completed_via_event_id', deletedEventIds)
      }

      // Reset actions that became overdue only because the sim advanced
      // Seed-overdue actions have due_date < BASE_DATE, so this filter is safe
      await supabase
        .from('care_plan_actions')
        .update({ status: 'pending' })
        .eq('status', 'overdue')
        .gte('due_date', BASE_DATE)

      // Reset all member risk scores (recomputed fresh on next advance)
      await supabase
        .from('members')
        .update({ risk_score: 0, risk_tier: 'low', risk_drivers: [] })

      // Reset sim date
      await supabase
        .from('sim_state')
        .update({ current_day: BASE_DATE, updated_at: new Date().toISOString() })
        .eq('id', 1)

      return jsonRes({ ok: true, reset: true })
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ADVANCE — loop numDays times through the 9-step sequence
    // ══════════════════════════════════════════════════════════════════════════
    const rng = makeRng(seed)
    const numDays = Math.min(Math.max(1, Number(days) || 1), MAX_DAYS)
    const counts = { nudged: 0, suppressed: 0, closed: 0, routed: 0, tasks: 0 }
    const daysActivity: DayActivity[] = []

    for (let d = 0; d < numDays; d++) {
      // ── 1. Bump current_day ────────────────────────────────────────────────
      const { data: simRow } = await supabase
        .from('sim_state').select('current_day').eq('id', 1).single()
      const today = addDays((simRow as { current_day: string } | null)?.current_day ?? BASE_DATE, 1)
      const todayTs = today + 'T12:00:00.000Z' // noon timestamp for sim events

      await supabase
        .from('sim_state')
        .update({ current_day: today, updated_at: new Date().toISOString() })
        .eq('id', 1)

      // ── 2. Mark overdue ────────────────────────────────────────────────────
      await supabase
        .from('care_plan_actions')
        .update({ status: 'overdue' })
        .in('status', ['pending', 'scheduled'])
        .lt('due_date', today)

      // ── 3. Run nudge engine ────────────────────────────────────────────────
      const nudgeRes = await callFn('run-nudge-engine', {}) as { nudgesFired?: number; suppressed?: number }
      const dayNudged     = nudgeRes.nudgesFired ?? 0
      const daySuppressed = nudgeRes.suppressed  ?? 0

      // ── 4. Simulate patient responses ──────────────────────────────────────
      // Select same pool as nudge engine: pending/overdue, clinician-authored/confirmed
      const { data: eligible } = await supabase
        .from('care_plan_actions')
        .select('id, member_id, action_type, clinical_priority, member:members(id, drop_segment, full_name)')
        .in('status', ['pending', 'overdue'])
        .in('provenance', ['clinician_authored', 'clinician_confirmed'])

      let dayCompleted = 0
      let dayDeclined  = 0

      for (const action of eligible ?? []) {
        const member = (action as { member: { id: string; drop_segment: string; full_name: string } | null }).member
        if (!member) continue

        const seg = member.drop_segment ?? 'none'
        const cp  = COMPLETION_PROB[seg]
        if (cp === undefined) continue // structural barrier — skip

        const roll = rng()

        if (roll < cp) {
          const evtMap = COMPLETE_EVENT[(action as { action_type: string }).action_type]
          if (!evtMap) continue // lifestyle etc — no event type

          await supabase.from('clinical_events').insert({
            member_id:        (action as { member_id: string }).member_id,
            event_type:       evtMap.eventType,
            source:           evtMap.source,
            linked_action_id: (action as { id: string }).id,
            occurred_at:      todayTs,
            payload:          { simulated: true },
          })
          dayCompleted++
        } else if (roll < cp + (DECLINE_PROB[seg] ?? 0)) {
          await supabase
            .from('care_plan_actions')
            .update({ status: 'declined', decline_reason: 'Feeling better' })
            .eq('id', (action as { id: string }).id)

          if ((action as { clinical_priority: string }).clinical_priority === 'mandatory') {
            const { data: existTask } = await supabase
              .from('navigator_tasks').select('id')
              .eq('member_id', (action as { member_id: string }).member_id)
              .eq('trigger_reason', 'declined_mandatory')
              .eq('status', 'open')
              .maybeSingle()

            if (!existTask) {
              await supabase.from('navigator_tasks').insert({
                member_id:      (action as { member_id: string }).member_id,
                trigger_reason: 'declined_mandatory',
                priority:       'p1',
                status:         'open',
                notes:          `${member.full_name} declined mandatory action (feels better) on ${today}.`,
              })
              counts.routed++
              dayDeclined++
            }
          }
        }
      }

      // ── 5. Occasional ER event ─────────────────────────────────────────────
      const { data: allMembers } = await supabase.from('members').select('id, full_name')
      let dayER = 0

      for (const m of allMembers ?? []) {
        if (rng() >= ER_PROBABILITY) continue

        await supabase.from('clinical_events').insert({
          member_id:  (m as { id: string }).id,
          event_type: 'er_visit',
          source:     'ambulance',
          occurred_at: todayTs,
          payload:    { simulated: true },
        })

        const { data: existErTask } = await supabase
          .from('navigator_tasks').select('id')
          .eq('member_id', (m as { id: string }).id)
          .eq('trigger_reason', 'post_er_72h')
          .eq('status', 'open')
          .maybeSingle()

        if (!existErTask) {
          await supabase.from('navigator_tasks').insert({
            member_id:      (m as { id: string }).id,
            trigger_reason: 'post_er_72h',
            priority:       'p1',
            status:         'open',
            notes:          `Emergency visit on ${today}. Follow-up within 72h required.`,
          })
          counts.tasks++
          dayER++
        }
      }

      // ── 6. Close loop ──────────────────────────────────────────────────────
      const closeRes = await callFn('close-loop', {}) as { closed?: number }
      const dayClosed = Math.max(closeRes.closed ?? 0, dayCompleted)

      // ── 7. Recompute risk — capture delta ──────────────────────────────────
      const { count: highBefore } = await supabase
        .from('members').select('id', { count: 'exact', head: true }).eq('risk_tier', 'high')
      await callFn('compute-risk', {})
      const { count: highAfter } = await supabase
        .from('members').select('id', { count: 'exact', head: true }).eq('risk_tier', 'high')
      const newHighRisk = Math.max(0, (highAfter ?? 0) - (highBefore ?? 0))

      // ── 8. Escalate high-risk overdue (dedupe) ─────────────────────────────
      const { data: highMembers } = await supabase
        .from('members').select('id').eq('risk_tier', 'high')

      for (const m of highMembers ?? []) {
        const { data: overdueOnes } = await supabase
          .from('care_plan_actions').select('id')
          .eq('member_id', (m as { id: string }).id)
          .eq('status', 'overdue')
          .eq('clinical_priority', 'mandatory')
          .limit(1)
        if (!overdueOnes?.length) continue

        const { data: existTask } = await supabase
          .from('navigator_tasks').select('id')
          .eq('member_id', (m as { id: string }).id)
          .eq('trigger_reason', 'high_risk_overdue')
          .eq('status', 'open')
          .maybeSingle()
        if (existTask) continue

        await supabase.from('navigator_tasks').insert({
          member_id:      (m as { id: string }).id,
          trigger_reason: 'high_risk_overdue',
          priority:       'p1',
          status:         'open',
          notes:          `High-risk member with overdue mandatory action as of ${today}.`,
        })
        counts.tasks++
      }

      // ── 9. Accumulate activity ─────────────────────────────────────────────
      counts.nudged     += dayNudged
      counts.suppressed += daySuppressed
      counts.closed     += dayClosed

      daysActivity.push({
        date:        today,
        dateLabel:   fmtDate(today),
        nudged:      dayNudged,
        suppressed:  daySuppressed,
        closed:      dayClosed,
        routed:      dayDeclined,
        er:          dayER,
        newHighRisk,
      })
    }

    const { data: finalSim } = await supabase
      .from('sim_state').select('current_day').eq('id', 1).single()

    return jsonRes({
      ok:          true,
      current_day: (finalSim as { current_day: string } | null)?.current_day ?? BASE_DATE,
      counts,
      days:        daysActivity,
    })
  } catch (err) {
    console.error('advance-simulation error:', err)
    return jsonRes({ ok: false, error: String(err) }, 500)
  }
})
