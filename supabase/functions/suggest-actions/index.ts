// suggest-actions — generates system_suggested care plan actions from a consultation
// Uses Gemini 2.0 Flash when GEMINI_API_KEY is set; falls back to keyword rules.
// Invoked by the Clinician Care-Plan Builder on load.

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
        generationConfig: {
          maxOutputTokens: 600,
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null
  } catch {
    return null
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

type RawSuggestion = {
  action_type: string
  title: string
  why_plain: string
  suggested_priority: string
  due_offset_days: number
}

const VALID_ACTION_TYPES = ['lab_test', 'follow_up_consult', 'medication', 'vaccination', 'lifestyle', 'imaging']
const VALID_PRIORITIES = ['mandatory', 'recommended', 'optional']

// ── Keyword fallback rules ─────────────────────────────────────────────────

function keywordFallback(chief: string, summary: string): RawSuggestion[] {
  const text = (chief + ' ' + summary).toLowerCase()

  if (/diabetes|blood sugar|glucose|hba1c|glycaemic|hyperglycaem/.test(text)) {
    return [
      {
        action_type: 'lab_test',
        title: 'HbA1c (3-month blood sugar average)',
        why_plain: 'Confirms the diagnosis and gives a baseline to track long-term glucose control against.',
        suggested_priority: 'recommended',
        due_offset_days: 10,
      },
      {
        action_type: 'follow_up_consult',
        title: 'Endocrinology follow-up',
        why_plain: 'To review your results, adjust treatment if needed, and set a monitoring plan.',
        suggested_priority: 'recommended',
        due_offset_days: 21,
      },
    ]
  }
  if (/hypertension|blood pressure|\bbp\b|cardiac|heart failure/.test(text)) {
    return [
      {
        action_type: 'lab_test',
        title: 'Lipid panel (cholesterol)',
        why_plain: 'High blood pressure and elevated cholesterol often co-occur and raise cardiovascular risk together.',
        suggested_priority: 'recommended',
        due_offset_days: 7,
      },
      {
        action_type: 'lifestyle',
        title: 'Low-sodium dietary counselling',
        why_plain: 'Reducing salt intake can lower blood pressure meaningfully alongside medication.',
        suggested_priority: 'optional',
        due_offset_days: 14,
      },
    ]
  }
  if (/fever|infection|viral|bacterial|antibiotic|sepsis/.test(text)) {
    return [
      {
        action_type: 'lab_test',
        title: 'Complete blood count (CBC)',
        why_plain: 'To check whether the infection has cleared and your immune system has returned to normal.',
        suggested_priority: 'recommended',
        due_offset_days: 7,
      },
    ]
  }
  if (/thyroid|hypothyroid|hyperthyroid|tsh/.test(text)) {
    return [
      {
        action_type: 'lab_test',
        title: 'TSH (thyroid function test)',
        why_plain: 'To check whether thyroid hormone levels are in the target range and treatment is working.',
        suggested_priority: 'mandatory',
        due_offset_days: 14,
      },
    ]
  }
  if (/anaemia|anemia|haemoglobin|iron deficiency/.test(text)) {
    return [
      {
        action_type: 'lab_test',
        title: 'Iron studies + haemoglobin',
        why_plain: 'To assess severity and guide whether iron supplementation or further investigation is needed.',
        suggested_priority: 'recommended',
        due_offset_days: 7,
      },
    ]
  }
  // Generic catch-all
  return [
    {
      action_type: 'follow_up_consult',
      title: 'Follow-up consultation',
      why_plain: 'To review how you are responding to treatment and adjust the plan if needed.',
      suggested_priority: 'recommended',
      due_offset_days: 14,
    },
  ]
}

// ── Validation ─────────────────────────────────────────────────────────────

function validateSuggestions(raw: unknown[]): RawSuggestion[] {
  return raw
    .filter(
      (s): s is RawSuggestion =>
        typeof s === 'object' &&
        s !== null &&
        VALID_ACTION_TYPES.includes((s as RawSuggestion).action_type) &&
        VALID_PRIORITIES.includes((s as RawSuggestion).suggested_priority) &&
        typeof (s as RawSuggestion).title === 'string' &&
        (s as RawSuggestion).title.length > 0,
    )
    .slice(0, 3)
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

    const { consultation_id } = await req.json()
    if (!consultation_id) {
      return Response.json({ ok: false, error: 'consultation_id required' }, { headers: corsHeaders })
    }

    // Load consultation
    const { data: consult } = await supabase
      .from('consultations')
      .select('*')
      .eq('id', consultation_id)
      .single()

    if (!consult) {
      return Response.json({ ok: false, error: 'Consultation not found' }, { headers: corsHeaders })
    }

    // Read sim_state current_day for due date calculation
    const { data: simState } = await supabase
      .from('sim_state')
      .select('current_day')
      .eq('id', 1)
      .single()
    const currentDay = simState?.current_day ?? new Date().toISOString().slice(0, 10)

    // Find care plan: prefer one linked to this consultation, else active plan for member
    let { data: plan } = await supabase
      .from('care_plans')
      .select('*')
      .eq('consultation_id', consultation_id)
      .maybeSingle()

    if (!plan && consult.member_id) {
      const { data: memberPlan } = await supabase
        .from('care_plans')
        .select('*')
        .eq('member_id', consult.member_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      plan = memberPlan
    }

    if (!plan && consult.member_id) {
      const { data: newPlan } = await supabase
        .from('care_plans')
        .insert({ consultation_id, member_id: consult.member_id, status: 'active' })
        .select()
        .single()
      plan = newPlan
    }

    if (!plan) {
      return Response.json({ ok: false, error: 'Could not find or create care plan' }, { headers: corsHeaders })
    }

    // Idempotency: if system_suggested rows already exist, return them
    const { data: existing } = await supabase
      .from('care_plan_actions')
      .select('*')
      .eq('care_plan_id', plan.id)
      .eq('provenance', 'system_suggested')

    if (existing && existing.length > 0) {
      return Response.json({ ok: true, suggestions: existing, source: 'cached' }, { headers: corsHeaders })
    }

    // Load member demographics for richer clinical context
    const { data: memberData } = consult.member_id
      ? await supabase
          .from('members')
          .select('full_name, dob, gender')
          .eq('id', consult.member_id)
          .single()
      : { data: null }

    const age = memberData?.dob
      ? Math.floor(
          (new Date(currentDay).getTime() - new Date(memberData.dob).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000),
        )
      : null
    const genderLabel = memberData?.gender ?? null

    // Generate suggestions via Gemini or keyword fallback
    const chief = consult.chief_complaint ?? ''
    const summary = consult.summary ?? ''
    let rawSuggestions: RawSuggestion[] = []

    const patientContext = [
      age !== null ? `Age: ${age} years` : null,
      genderLabel ? `Sex: ${genderLabel}` : null,
    ]
      .filter(Boolean)
      .join(' | ')

    const geminiResult = await callGemini(
      `Act as a senior internal medicine physician and clinical decision support specialist with expertise in preventive care and chronic disease management. A treating clinician has just completed a patient consultation and needs 1–3 evidence-based follow-up actions to add to the patient's care plan. Your suggestions will be reviewed and authorised by the clinician before reaching the patient — you are NOT making final clinical decisions.

Patient profile:
${patientContext || '(demographics not available)'}

Consultation:
- Chief complaint: ${chief}
- Clinical notes / findings: ${summary}

When reviewing the above, consider the PQRST dimensions of the presentation:
- P (Provokes/Palliates): what triggers or worsens the condition?
- Q (Quality): character of symptoms described?
- R (Radiates): any systemic or referred involvement?
- S (Severity): functional impact or lab values indicating severity?
- T (Timing): acute onset vs chronic vs episodic pattern?

Your task (safe-action framing — educate and prepare, never diagnose):
- Suggest evidence-based follow-up tests, consults, lifestyle steps, or medications clinically indicated for this presentation
- Write each "why_plain" as a mechanism-explainer for a non-medical patient (1–2 sentences, plain English, no clinical jargon — explain the biological or practical reason this step matters)
- Prioritise actions where earlier intervention prevents worse downstream outcomes
- Do NOT include the diagnosis itself as an action — only follow-up actions

Return ONLY a JSON array (no markdown, no explanation outside the array). Each item:
{
  "action_type": one of exactly ["lab_test","follow_up_consult","medication","vaccination","lifestyle","imaging"],
  "title": "concise action title (max 8 words)",
  "why_plain": "plain-language mechanism-explainer the patient will read (1-2 sentences, no jargon)",
  "suggested_priority": one of exactly ["mandatory","recommended","optional"],
  "due_offset_days": integer between 3 and 30
}

Max 3 items. Be practical, evidence-based, and conservative.`,
    )

    if (geminiResult) {
      try {
        const stripped = geminiResult.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        const parsed = JSON.parse(stripped)
        rawSuggestions = validateSuggestions(Array.isArray(parsed) ? parsed : [parsed])
      } catch {
        rawSuggestions = []
      }
    }

    if (rawSuggestions.length === 0) {
      rawSuggestions = keywordFallback(chief, summary)
    }

    // Compute due dates from current_day + offset
    const baseDate = new Date(currentDay)
    const rows = rawSuggestions.map((s) => {
      const due = new Date(baseDate)
      due.setDate(due.getDate() + (Number(s.due_offset_days) || 14))
      return {
        care_plan_id: plan!.id,
        member_id: consult.member_id,
        action_type: s.action_type,
        title: s.title,
        why_plain: s.why_plain,
        clinical_priority: s.suggested_priority,
        provenance: 'system_suggested',
        status: 'pending',
        due_date: due.toISOString().slice(0, 10),
      }
    })

    const { data: inserted } = await supabase.from('care_plan_actions').insert(rows).select()

    return Response.json(
      {
        ok: true,
        suggestions: inserted ?? [],
        source: geminiResult ? 'ai' : 'fallback',
      },
      { headers: corsHeaders },
    )
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { headers: corsHeaders, status: 500 })
  }
})
