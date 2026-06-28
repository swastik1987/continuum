// advance-simulation — demo heartbeat.
// All logic inlined (no sub-function HTTP calls). Batch inserts/updates only.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// ── Tunable constants ─────────────────────────────────────────────────────────
const BASE_DATE      = '2026-06-14'
const ER_PROBABILITY = 0.03
const MAX_DAYS       = 30

const COMPLETION_PROB: Record<string, number> = {
  forgot:       0.60,
  logistics:    0.40,
  lost_thread:  0.45,
  none:         0.50,
  feels_better: 0.15,
}

const DECLINE_PROB: Record<string, number> = {
  feels_better: 0.40,
}

const COMPLETE_EVENT: Record<string, { eventType: string; source: string }> = {
  lab_test:          { eventType: 'diagnostic_completed', source: 'diagnostics' },
  imaging:           { eventType: 'diagnostic_completed', source: 'diagnostics' },
  medication:        { eventType: 'pharmacy_fulfilled',   source: 'pharmacy'    },
  follow_up_consult: { eventType: 'appointment_attended', source: 'clinic'      },
  vaccination:       { eventType: 'appointment_attended', source: 'clinic'      },
}

const STRUCTURAL_SEGS = new Set(['cost', 'avoidance', 'trust'])

// ── Helpers ───────────────────────────────────────────────────────────────────
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

function makeRng(seed?: number): () => number {
  if (!seed) return () => Math.random()
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5
    return (s >>> 0) / 0x100000000
  }
}

// ── CORS / response ───────────────────────────────────────────────────────────
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
type Member = { id: string; full_name: string; drop_segment: string; risk_tier: string }
type Action = { id: string; member_id: string; action_type: string; clinical_priority: string; status: string }
type EventInsert = { member_id: string; event_type: string; source: string; occurred_at: string; payload: object; linked_action_id?: string }
type TaskInsert  = { member_id: string; trigger_reason: string; priority: string; status: string; notes: string }
type DayActivity = { date: string; dateLabel: string; nudged: number; suppressed: number; closed: number; routed: number; er: number; newHighRisk: number }

// ── Main ──────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const body = await req.json().catch(() => ({})) as {
      days?: number; reset?: boolean; sessionStartedAt?: string; seed?: number
    }
    const { days = 1, reset = false, sessionStartedAt, seed } = body

    // ══════════════════════════════════════════════════════════════════════════
    // RESET
    // ══════════════════════════════════════════════════════════════════════════
    if (reset) {
      const since = sessionStartedAt ?? new Date(0).toISOString()

      const { data: eventsToDelete } = await supabase
        .from('clinical_events').select('id').gte('occurred_at', since)
      const deletedEventIds = (eventsToDelete ?? []).map((e: { id: string }) => e.id)

      await Promise.all([
        supabase.from('clinical_events').delete().gte('occurred_at', since),
        supabase.from('nudges').delete().gte('sent_at', since),
        supabase.from('navigator_tasks').delete().gte('created_at', since),
        supabase.from('messages').delete().gte('created_at', since),
      ])

      if (deletedEventIds.length > 0) {
        await supabase
          .from('care_plan_actions')
          .update({ status: 'pending', completed_via_event_id: null })
          .in('completed_via_event_id', deletedEventIds)
      }

      await supabase
        .from('care_plan_actions').update({ status: 'pending' })
        .eq('status', 'overdue').gte('due_date', BASE_DATE)

      await supabase.from('members')
        .update({ risk_score: 0, risk_tier: 'low', risk_drivers: [] })

      await supabase.from('sim_state')
        .update({ current_day: BASE_DATE, updated_at: new Date().toISOString() })
        .eq('id', 1)

      return jsonRes({ ok: true, reset: true })
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ADVANCE — fetch shared data once, then loop per day
    // ══════════════════════════════════════════════════════════════════════════
    const rng      = makeRng(seed)
    const numDays  = Math.min(Math.max(1, Number(days) || 1), MAX_DAYS)
    const counts   = { nudged: 0, suppressed: 0, closed: 0, routed: 0, tasks: 0 }
    const daysActivity: DayActivity[] = []

    // Load members once — reused every day (O(members) not O(days × members))
    const { data: membersData } = await supabase
      .from('members').select('id, full_name, drop_segment, risk_tier')
    const memberMap = new Map<string, Member>()
    for (const m of membersData ?? []) memberMap.set((m as Member).id, m as Member)

    // Track open tasks client-side to avoid per-iteration dedup queries
    const { data: existingTasks } = await supabase
      .from('navigator_tasks').select('member_id, trigger_reason').eq('status', 'open')
    const openTaskKeys = new Set<string>(
      (existingTasks ?? []).map((t: { member_id: string; trigger_reason: string }) =>
        `${t.member_id}:${t.trigger_reason}`)
    )

    for (let d = 0; d < numDays; d++) {
      // ── 1. Bump current_day ────────────────────────────────────────────────
      const { data: simRow } = await supabase
        .from('sim_state').select('current_day').eq('id', 1).single()
      const today   = addDays((simRow as { current_day: string } | null)?.current_day ?? BASE_DATE, 1)
      const todayTs = today + 'T12:00:00.000Z'

      await supabase.from('sim_state')
        .update({ current_day: today, updated_at: new Date().toISOString() }).eq('id', 1)

      // ── 2. Mark overdue (one batch update) ────────────────────────────────
      await supabase.from('care_plan_actions')
        .update({ status: 'overdue' })
        .in('status', ['pending', 'scheduled'])
        .lt('due_date', today)

      // ── 3. Fetch eligible actions (one query, no join — member data from map)
      const { data: eligible } = await supabase
        .from('care_plan_actions')
        .select('id, member_id, action_type, clinical_priority, status')
        .in('status', ['pending', 'overdue'])
        .in('provenance', ['clinician_authored', 'clinician_confirmed'])

      // ── 4. Roll responses — accumulate into batch arrays ──────────────────
      const eventsToInsert:   EventInsert[] = []
      const completedActionIds: string[]    = []
      const declinedActionIds:  string[]    = []
      const tasksToInsert:    TaskInsert[]  = []
      let dayNudged = 0, daySuppressed = 0, dayDeclined = 0

      for (const action of eligible ?? []) {
        const act    = action as Action
        const member = memberMap.get(act.member_id)
        if (!member) continue

        const seg = member.drop_segment ?? 'none'

        if (STRUCTURAL_SEGS.has(seg)) { daySuppressed++; continue }

        const cp = COMPLETION_PROB[seg]
        if (cp === undefined) continue

        dayNudged++
        const roll = rng()

        if (roll < cp) {
          const evtMap = COMPLETE_EVENT[act.action_type]
          if (!evtMap) continue
          eventsToInsert.push({
            member_id:        act.member_id,
            event_type:       evtMap.eventType,
            source:           evtMap.source,
            linked_action_id: act.id,
            occurred_at:      todayTs,
            payload:          { simulated: true },
          })
          completedActionIds.push(act.id)
        } else if (roll < cp + (DECLINE_PROB[seg] ?? 0)) {
          declinedActionIds.push(act.id)
          if (act.clinical_priority === 'mandatory') {
            const key = `${act.member_id}:declined_mandatory`
            if (!openTaskKeys.has(key)) {
              tasksToInsert.push({
                member_id:      act.member_id,
                trigger_reason: 'declined_mandatory',
                priority:       'p1',
                status:         'open',
                notes:          `${member.full_name} declined mandatory action (feels better) on ${today}.`,
              })
              openTaskKeys.add(key)
              dayDeclined++
            }
          }
        }
      }

      // ── 5. High-risk overdue escalation (inline, no extra DB queries) ──────
      // Use action list already loaded in step 3 to find overdue mandatory for high-risk members
      const overdueHighRiskMids = new Set<string>()
      for (const action of eligible ?? []) {
        const act = action as Action
        if (act.status !== 'overdue' || act.clinical_priority !== 'mandatory') continue
        const member = memberMap.get(act.member_id)
        if (member?.risk_tier === 'high') overdueHighRiskMids.add(act.member_id)
      }
      for (const mid of overdueHighRiskMids) {
        const key = `${mid}:high_risk_overdue`
        if (openTaskKeys.has(key)) continue
        const member = memberMap.get(mid)!
        tasksToInsert.push({
          member_id:      mid,
          trigger_reason: 'high_risk_overdue',
          priority:       'p1',
          status:         'open',
          notes:          `High-risk member with overdue mandatory action as of ${today}.`,
        })
        openTaskKeys.add(key)
        counts.tasks++
      }

      // ── 6. ER simulation — roll per member, batch ─────────────────────────
      let dayER = 0
      for (const [mid, member] of memberMap) {
        if (rng() >= ER_PROBABILITY) continue
        const key = `${mid}:post_er_72h`
        if (openTaskKeys.has(key)) continue
        eventsToInsert.push({
          member_id:  mid,
          event_type: 'er_visit',
          source:     'ambulance',
          occurred_at: todayTs,
          payload:    { simulated: true },
        })
        tasksToInsert.push({
          member_id:      mid,
          trigger_reason: 'post_er_72h',
          priority:       'p1',
          status:         'open',
          notes:          `Emergency visit on ${today}. Follow-up within 72h. Member: ${member.full_name}.`,
        })
        openTaskKeys.add(key)
        counts.tasks++
        dayER++
      }

      // ── 7. Batch DB writes (3 parallel where safe) ────────────────────────
      const writes: Promise<unknown>[] = []

      if (eventsToInsert.length > 0) {
        writes.push(supabase.from('clinical_events').insert(eventsToInsert))
      }
      if (declinedActionIds.length > 0) {
        writes.push(
          supabase.from('care_plan_actions')
            .update({ status: 'declined', decline_reason: 'Feeling better' })
            .in('id', declinedActionIds)
        )
      }
      if (tasksToInsert.length > 0) {
        writes.push(supabase.from('navigator_tasks').insert(tasksToInsert))
      }

      await Promise.all(writes)

      // ── 8. Close loop — one batch update for completed actions ─────────────
      // Note: completed_via_event_id is omitted for sim completions (no teal banner needed).
      // Pre-seeded events already have it set from the seed SQL.
      if (completedActionIds.length > 0) {
        await supabase.from('care_plan_actions')
          .update({ status: 'completed' })
          .in('id', completedActionIds)
          .in('status', ['pending', 'overdue', 'scheduled'])
      }
      const dayClosed = completedActionIds.length

      // ── 9. Accumulate ──────────────────────────────────────────────────────
      counts.nudged     += dayNudged
      counts.suppressed += daySuppressed
      counts.closed     += dayClosed
      counts.routed     += dayDeclined

      daysActivity.push({
        date:        today,
        dateLabel:   fmtDate(today),
        nudged:      dayNudged,
        suppressed:  daySuppressed,
        closed:      dayClosed,
        routed:      dayDeclined,
        er:          dayER,
        newHighRisk: 0, // compute-risk is deferred; no separate function call
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
