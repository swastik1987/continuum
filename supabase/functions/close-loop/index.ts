// close-loop — matches clinical_events to open care_plan_actions and auto-completes them.
// Two strategies:
//   1. Direct: event.linked_action_id is set → close that action.
//   2. Fallback: match by member_id + event_type↔action_type mapping within a 72h window.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Maps clinical_event_type → care_plan_actions.action_type that it closes
const EVENT_TO_ACTION: Record<string, string[]> = {
  diagnostic_completed: ['lab_test', 'imaging'],
  appointment_attended: ['follow_up_consult'],
  pharmacy_fulfilled: ['medication'],
  home_collection_scheduled: [], // marks scheduled, not completed — handled separately
  appointment_booked: [], // marks scheduled, not completed
  er_visit: [], // triggers navigator task; does not close an action
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
    let closed = 0

    // ── Strategy 1: direct link ────────────────────────────────────────────
    const { data: linkedEvents } = await supabase
      .from('clinical_events')
      .select('id, linked_action_id, occurred_at')
      .not('linked_action_id', 'is', null)

    for (const event of linkedEvents ?? []) {
      if (!event.linked_action_id) continue

      const { data: action } = await supabase
        .from('care_plan_actions')
        .select('id, status')
        .eq('id', event.linked_action_id)
        .single()

      if (!action || action.status === 'completed') continue

      await supabase
        .from('care_plan_actions')
        .update({
          status: 'completed',
          completed_via_event_id: event.id,
        })
        .eq('id', action.id)

      closed++
    }

    // ── Strategy 2: fallback match (member + type + 72h window) ───────────
    // Find events NOT already used as a direct link
    const { data: allEvents } = await supabase
      .from('clinical_events')
      .select('id, member_id, event_type, occurred_at')
      .is('linked_action_id', null)
      .in('event_type', ['diagnostic_completed', 'appointment_attended', 'pharmacy_fulfilled'])

    for (const event of allEvents ?? []) {
      const actionTypes = EVENT_TO_ACTION[event.event_type] ?? []
      if (actionTypes.length === 0) continue
      if (!event.member_id || !event.occurred_at) continue

      const windowStart = new Date(event.occurred_at)
      windowStart.setHours(windowStart.getHours() - 72)

      const { data: matchingActions } = await supabase
        .from('care_plan_actions')
        .select('id, status, completed_via_event_id')
        .eq('member_id', event.member_id)
        .in('action_type', actionTypes)
        .in('status', ['pending', 'scheduled', 'overdue'])
        .gte('due_date', windowStart.toISOString().slice(0, 10))
        .is('completed_via_event_id', null)
        .limit(1)

      const action = matchingActions?.[0]
      if (!action) continue

      await supabase
        .from('care_plan_actions')
        .update({
          status: 'completed',
          completed_via_event_id: event.id,
        })
        .eq('id', action.id)

      // Update the event to link back
      await supabase
        .from('clinical_events')
        .update({ linked_action_id: action.id })
        .eq('id', event.id)

      closed++
    }

    // ── Schedule-type events: mark actions as 'scheduled' ─────────────────
    const { data: bookingEvents } = await supabase
      .from('clinical_events')
      .select('id, member_id, event_type, linked_action_id, occurred_at')
      .in('event_type', ['appointment_booked', 'home_collection_scheduled'])

    for (const event of bookingEvents ?? []) {
      if (event.linked_action_id) {
        const { data: action } = await supabase
          .from('care_plan_actions')
          .select('id, status')
          .eq('id', event.linked_action_id)
          .single()

        if (action && action.status === 'pending') {
          await supabase
            .from('care_plan_actions')
            .update({ status: 'scheduled' })
            .eq('id', action.id)
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, closed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('close-loop error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
