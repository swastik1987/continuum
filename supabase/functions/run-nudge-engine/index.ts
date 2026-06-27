// run-nudge-engine — evaluates due/overdue care plan actions for the current sim day,
// fires nudges per segment rules, and suppresses + creates navigator tasks where required.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Segments that must NOT receive automated nudges — route to navigator instead.
const SUPPRESS_SEGMENTS = new Set(['cost', 'avoidance', 'trust'])

// Segment → preferred nudge channel
const SEGMENT_CHANNEL: Record<string, string> = {
  forgot: 'whatsapp',
  feels_better: 'app',
  logistics: 'whatsapp',
  lost_thread: 'app',
}

// action_type → human template key
function templateKey(actionType: string, segment: string): string {
  return `${segment}_${actionType}_reminder`
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
    // 1. Get current sim day
    const { data: sim } = await supabase
      .from('sim_state')
      .select('current_day')
      .eq('id', 1)
      .single()

    const today = sim?.current_day ?? new Date().toISOString().slice(0, 10)

    // 2. Find due/overdue actions that are nudge-eligible
    const { data: actions } = await supabase
      .from('care_plan_actions')
      .select('*, member:members(id, drop_segment, risk_tier)')
      .in('status', ['pending', 'overdue'])
      .in('provenance', ['clinician_authored', 'clinician_confirmed'])
      .lte('due_date', today)
      .neq('status', 'declined')

    if (!actions || actions.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, nudgesFired: 0, suppressed: 0, message: 'No eligible actions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 3. Mark pending → overdue where past due date
    const pendingOverdue = actions.filter((a) => a.status === 'pending' && a.due_date < today)
    if (pendingOverdue.length > 0) {
      await supabase
        .from('care_plan_actions')
        .update({ status: 'overdue' })
        .in('id', pendingOverdue.map((a) => a.id))
    }

    // 4. Check which actions already have a recent nudge (avoid double-firing)
    const actionIds = actions.map((a) => a.id)
    const { data: existingNudges } = await supabase
      .from('nudges')
      .select('action_id')
      .in('action_id', actionIds)
      .gte('sent_at', new Date(Date.now() - 86400000 * 3).toISOString()) // within 3 days

    const recentlyNudged = new Set((existingNudges ?? []).map((n) => n.action_id))

    let nudgesFired = 0
    let suppressedCount = 0

    for (const action of actions) {
      if (recentlyNudged.has(action.id)) continue

      // member is a joined object from Supabase
      const member = action.member as { id: string; drop_segment: string; risk_tier: string } | null
      if (!member) continue

      const segment = member.drop_segment ?? 'forgot'

      if (SUPPRESS_SEGMENTS.has(segment)) {
        // Suppress — insert suppressed nudge + ensure navigator task exists
        await supabase.from('nudges').insert({
          action_id: action.id,
          member_id: action.member_id,
          channel: 'whatsapp',
          template_key: templateKey(action.action_type, segment),
          status: 'suppressed',
          suppression_reason: `segment:${segment}`,
          sent_at: new Date().toISOString(),
        })

        // Create navigator task if none open for this reason
        const triggerReason =
          segment === 'cost' ? 'structural_barrier'
          : segment === 'avoidance' ? 'declined_mandatory'
          : 'high_risk_overdue' // trust

        const { data: existingTask } = await supabase
          .from('navigator_tasks')
          .select('id')
          .eq('member_id', action.member_id)
          .eq('trigger_reason', triggerReason)
          .eq('status', 'open')
          .maybeSingle()

        if (!existingTask) {
          const priority = member.risk_tier === 'high' ? 'p1' : 'p2'
          await supabase.from('navigator_tasks').insert({
            member_id: action.member_id,
            trigger_reason: triggerReason,
            priority,
            status: 'open',
            notes: `Auto-created: ${segment} segment — action "${action.title}" suppressed from nudge engine.`,
          })
        }

        suppressedCount++
        continue
      }

      // Fire nudge
      const channel = SEGMENT_CHANNEL[segment] ?? 'app'
      const body = buildNudgeBody(action.title, segment)

      await supabase.from('nudges').insert({
        action_id: action.id,
        member_id: action.member_id,
        channel,
        template_key: templateKey(action.action_type, segment),
        status: 'sent',
        sent_at: new Date().toISOString(),
      })

      // Patient-facing message
      await supabase.from('messages').insert({
        member_id: action.member_id,
        sender: 'system',
        channel: channel === 'whatsapp' ? 'whatsapp' : 'app',
        body,
      })

      nudgesFired++
    }

    return new Response(
      JSON.stringify({ ok: true, nudgesFired, suppressed: suppressedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('run-nudge-engine error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

function buildNudgeBody(actionTitle: string, segment: string): string {
  const messages: Record<string, string> = {
    forgot: `Hi! A gentle reminder: your "${actionTitle}" is due. Would you like help booking it?`,
    feels_better: `We noticed you haven't booked your "${actionTitle}" yet. Even when you're feeling well, this check-up helps catch any early changes.`,
    logistics: `We know getting to your "${actionTitle}" can be tricky. Would home collection help? Let us know.`,
    lost_thread: `Hi — we'd love to support you with your "${actionTitle}". Tap to see your care plan and next step.`,
  }
  return messages[segment] ?? `Reminder: your "${actionTitle}" is due. Please book at your earliest convenience.`
}
