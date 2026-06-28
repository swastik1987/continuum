// conversational-reply — responds to patient chat messages with member context
// Uses Gemini 2.0 Flash when GEMINI_API_KEY is set; falls back to keyword rules.
// Detects human-handoff intent and creates navigator_tasks when triggered.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Gemini ─────────────────────────────────────────────────────────────────

const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

async function callGemini(prompt: string): Promise<string | null> {
  if (!GEMINI_KEY) return null
  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.6 },
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null
  } catch {
    return null
  }
}

// ── Scripted fallback (runs when no API key or Gemini fails) ───────────────

function scriptedReply(body: string): { reply: string; handoff: boolean } {
  const s = body.toLowerCase()

  if (/feel fine|feeling fine|feel better|feeling better|don.t need|not sure i need/i.test(s)) {
    return {
      reply: "That's good to hear! 😊 Your doctor flagged this check because an early reading can catch things even when you feel well. Want me to connect you to a care navigator to talk it through — no pressure at all.",
      handoff: false,
    }
  }
  if (/cost|expensive|afford|money|can.t pay|price|charge/i.test(s)) {
    return {
      reply: 'No cost worry here — this is fully covered by your Acme health wallet, ₹0 out of pocket. Want me to book it for you, or connect you to a care navigator to help?',
      handoff: false,
    }
  }
  if (/afraid|scared|anxious|worried|nervous|fear|anxiety/i.test(s)) {
    return {
      reply: 'Completely understandable. Your care team is here to support you, not pressure you. Would it help to speak with a care navigator first?',
      handoff: true,
    }
  }
  if (/reschedule|later|busy|not now|another time|postpone|too busy/i.test(s)) {
    return {
      reply: 'Of course — when works better for you? I can find a slot that fits around your schedule. 📅',
      handoff: false,
    }
  }
  if (/talk to someone|speak to someone|human|navigator|person|call me|contact me/i.test(s)) {
    return {
      reply: '— Connecting you to Priya, your Care Navigator. She will follow up with you shortly. 🙏',
      handoff: true,
    }
  }
  if (/book|schedule|yes|sure|okay|ok|go ahead|confirm/i.test(s)) {
    return {
      reply: 'Great! I can arrange home collection at a time that suits you. Would morning (7–9am) or afternoon (2–4pm) work better? 🏠',
      handoff: false,
    }
  }
  if (/\?|question|how|what|when|why|where/i.test(s)) {
    return {
      reply: 'Happy to help — ask away! 🙏 Or if you would prefer to talk to your care navigator directly, just say so.',
      handoff: false,
    }
  }
  return {
    reply: 'Got it. Priya from your care team will follow up with you shortly. 🙏',
    handoff: false,
  }
}

// Detect handoff intent from a Gemini reply
function detectHandoff(text: string): boolean {
  return (
    text.startsWith('—') ||
    /connecting you to|care navigator|Priya|talk to someone|speak to someone/i.test(text)
  )
}

// ── Handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { member_id, message } = await req.json()
    if (!member_id || !message) {
      return Response.json({ ok: false, error: 'member_id and message required' }, { headers: corsHeaders })
    }

    // Load member context
    const { data: member } = await supabase
      .from('members')
      .select('full_name, drop_segment, risk_tier')
      .eq('id', member_id)
      .single()

    // Load up to 3 open care plan actions for context
    const { data: actions } = await supabase
      .from('care_plan_actions')
      .select('title, why_plain, clinical_priority, due_date, status')
      .eq('member_id', member_id)
      .in('status', ['pending', 'scheduled', 'overdue'])
      .order('clinical_priority', { ascending: true })
      .limit(3)

    // Last 6 messages for conversation context
    const { data: history } = await supabase
      .from('messages')
      .select('sender, body')
      .eq('member_id', member_id)
      .order('created_at', { ascending: false })
      .limit(7)

    const priorMessages = (history ?? []).reverse().slice(0, 6)
    const firstName = member?.full_name?.split(' ')[0] ?? 'there'
    const segment = member?.drop_segment ?? 'none'

    const actionSummary = (actions ?? [])
      .map((a) => `• ${a.title} (${a.clinical_priority}, ${a.status}, due ${a.due_date ?? 'TBD'}): "${a.why_plain ?? ''}"`)
      .join('\n')

    const conversationCtx = priorMessages
      .map((m) => `${m.sender === 'member' ? firstName : 'Care Team'}: ${m.body}`)
      .join('\n')

    let reply: string
    let handoff: boolean

    const geminiReply = await callGemini(
      `You are a warm, concise care assistant for Connect & Heal's Continuum platform.

RULES (strictly follow):
- Warm and human, 2-3 sentences max
- Never coercive, never guilt-trip; acknowledge feelings first
- If member signals cost worry, avoidance, fear, or wants to talk to a human → offer to connect to a care navigator
- Mention the plain-language "why" only if directly relevant
- Never give clinical advice beyond the care plan
- If connecting to a human navigator, start your reply with "— Connecting you to Priya"

Member: ${firstName} | Behaviour segment: ${segment}

Open care plan actions:
${actionSummary || '(none currently open)'}

Recent conversation:
${conversationCtx || '(first message)'}

Member said: "${message}"

Reply (2-3 sentences, warm and human):`,
    )

    if (geminiReply && geminiReply.length > 0) {
      reply = geminiReply
      handoff = detectHandoff(reply)
    } else {
      const scripted = scriptedReply(message)
      reply = scripted.reply
      handoff = scripted.handoff
    }

    // Write the reply to messages table
    await supabase.from('messages').insert({
      member_id,
      sender: 'system',
      channel: 'app',
      body: reply,
    })

    // Create navigator task on handoff (deduplicated)
    if (handoff) {
      const { data: existing } = await supabase
        .from('navigator_tasks')
        .select('id')
        .eq('member_id', member_id)
        .eq('trigger_reason', 'structural_barrier')
        .in('status', ['open', 'in_progress'])
        .maybeSingle()

      if (!existing) {
        await supabase.from('navigator_tasks').insert({
          member_id,
          trigger_reason: 'structural_barrier',
          priority: 'p2',
          status: 'open',
          notes: `Member requested human support via chat: "${message.slice(0, 200)}"`,
        })
      }
    }

    return Response.json({ ok: true, reply, handoff }, { headers: corsHeaders })
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { headers: corsHeaders, status: 500 })
  }
})
