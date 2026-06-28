// reseed-demo — full wipe + reseed of all demo data.
// Preserves auth.users and profiles; everything else is rebuilt from scratch.
// Equivalent to running 002_demo_seed.sql + 003_m9_seed.sql on a clean DB.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const jsonRes = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

// ── Date helpers ──────────────────────────────────────────────────────────────
// All dates anchored to the sim BASE_DATE so the demo is always in a
// consistent state regardless of when the reseed runs.
const BASE = '2026-06-14'

function d(offset: number): string {
  const dt = new Date(BASE + 'T00:00:00Z')
  dt.setUTCDate(dt.getUTCDate() + offset)
  return dt.toISOString().slice(0, 10)
}

function ts(dayOffset: number, hour = 10): string {
  return `${d(dayOffset)}T${String(hour).padStart(2, '0')}:00:00Z`
}

function fmtDayMon(dateStr: string): string {
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const dt = new Date(dateStr + 'T00:00:00Z')
  return `${String(dt.getUTCDate()).padStart(2, '0')} ${M[dt.getUTCMonth()]}`
}

// ── Fixed UUIDs (M1) ──────────────────────────────────────────────────────────
// Keeping these stable ensures profiles.member_id re-links correctly after wipe.
const U = {
  // Members
  ANANYA: '11111111-0000-0000-0000-000000000001',
  RAHUL:  '11111111-0000-0000-0000-000000000002',
  KAVITA: '11111111-0000-0000-0000-000000000003',
  DEEPAK: '11111111-0000-0000-0000-000000000004',
  MEERA:  '11111111-0000-0000-0000-000000000005',
  // Consultations
  CON_ANANYA: '22222222-0000-0000-0000-000000000001',
  CON_MEERA:  '22222222-0000-0000-0000-000000000002',
  CON_RAHUL:  '22222222-0000-0000-0000-000000000003',
  // Care plans
  PLAN_ANANYA: '33333333-0000-0000-0000-000000000001',
  PLAN_MEERA:  '33333333-0000-0000-0000-000000000002',
  PLAN_RAHUL:  '33333333-0000-0000-0000-000000000003',
  // Care plan actions
  A_ANANYA_HBA1C:   '44444444-0000-0000-0000-000000000001',
  A_ANANYA_FBG:     '44444444-0000-0000-0000-000000000002',
  A_ANANYA_CONSULT: '44444444-0000-0000-0000-000000000003',
  A_ANANYA_MED:     '44444444-0000-0000-0000-000000000004',
  A_MEERA_HBA1C:    '44444444-0000-0000-0000-000000000005',
  A_RAHUL_CONSULT:  '44444444-0000-0000-0000-000000000006',
  // Clinical events
  EV_FBG_DONE:  '55555555-0000-0000-0000-000000000001',
  EV_HOME_COLL: '55555555-0000-0000-0000-000000000002',
  EV_DEEPAK_ER: '55555555-0000-0000-0000-000000000003',
  // Nudges
  NUD_ANANYA_SENT: '66666666-0000-0000-0000-000000000001',
  NUD_RAHUL_SUPP:  '66666666-0000-0000-0000-000000000002',
  NUD_MEERA_SUPP:  '66666666-0000-0000-0000-000000000003',
  NUD_ANANYA_RESP: '66666666-0000-0000-0000-000000000004',
  // Messages
  MSG_FBG:     '77777777-0000-0000-0000-000000000009',
  MSG_NUDGE:   '77777777-0000-0000-0000-000000000001',
  MSG_MQ1:     '77777777-0000-0000-0000-000000000002',
  MSG_SR1:     '77777777-0000-0000-0000-000000000003',
  MSG_MQ2:     '77777777-0000-0000-0000-000000000004',
  MSG_COST:    '77777777-0000-0000-0000-000000000005',
  MSG_MQ3:     '77777777-0000-0000-0000-000000000006',
  MSG_HANDOFF: '77777777-0000-0000-0000-000000000007',
  MSG_NAV:     '77777777-0000-0000-0000-000000000008',
  // Navigator tasks
  TASK_MEERA:  '88888888-0000-0000-0000-000000000001',
  TASK_RAHUL:  '88888888-0000-0000-0000-000000000002',
  TASK_DEEPAK: '88888888-0000-0000-0000-000000000003',
  // M9 heroes (fixed for idempotency)
  ROHAN: '22222222-1111-0000-0000-000000000001',
  ARJUN: '22222222-1111-0000-0000-000000000002',
}

// ── M9 static data arrays (ported from 003_m9_seed.sql) ──────────────────────

// Group A: 17 background members — all actions COMPLETED
const GA = {
  names:   ['Priyanka Desai','Sanjay Kumar','Nandita Rao','Vikram Pillai','Asha Mehta','Rohit Sharma','Sunita Patel','Aditya Singh','Kavya Nair','Ramesh Iyer','Geeta Verma','Suresh Joshi','Lakshmi Krishnan','Rajan Thakur','Anita Bose','Manoj Chopra','Sushma Reddy'],
  genders: ['F','M','F','M','F','M','F','M','F','M','F','M','F','M','F','M','F'],
  dobs:    ['1986-04-12','1975-09-23','1988-11-07','1978-02-19','1970-06-30','1995-01-14','1980-08-05','1990-03-27','1994-12-03','1956-07-11','1968-05-22','1976-10-16','1985-04-08','1979-01-25','1960-09-14','1992-03-31','1973-07-09'],
  segs:    ['forgot','logistics','feels_better','none','lost_thread','forgot','logistics','none','feels_better','forgot','none','logistics','feels_better','lost_thread','forgot','none','logistics'],
  risk:    ['medium','low','low','medium','medium','medium','low','medium','low','high','medium','medium','low','medium','high','low','medium'],
  scores:  [42,18,22,45,38,44,20,41,19,71,43,47,21,40,68,15,46],
  wallets: [2500,1800,3200,2000,1500,2800,3000,2200,3500,1000,2100,2700,3100,1900,800,3800,2400],
  chronic: [false,false,false,true,false,false,false,false,false,true,true,false,false,false,true,false,true],
  type1:   ['lab_test','follow_up_consult','lab_test','imaging','follow_up_consult','lab_test','lab_test','vaccination','lab_test','lab_test','follow_up_consult','imaging','lab_test','medication','lab_test','follow_up_consult','lab_test'],
  title1:  ['HbA1c blood test','GP follow-up consult','Lipid panel','Chest X-ray','Cardiologist review','Fasting blood glucose','Kidney function test','Hepatitis B vaccination','Thyroid function test','HbA1c blood test','Diabetologist follow-up','Echocardiogram','Lipid panel','Start Metformin 500mg','HbA1c blood test','Endocrinology review','CBC with differential'],
  pri1:    ['mandatory','mandatory','mandatory','recommended','mandatory','mandatory','mandatory','recommended','mandatory','mandatory','mandatory','recommended','mandatory','mandatory','mandatory','recommended','mandatory'],
  type2:   ['medication','medication','follow_up_consult','medication','medication','medication','follow_up_consult','medication','follow_up_consult','medication','medication','follow_up_consult','follow_up_consult','lab_test','medication','lab_test','medication'],
  title2:  ['Start Atorvastatin 10mg','Continue Amlodipine 5mg','GP follow-up consult','Start Atorvastatin 10mg','Start Aspirin 75mg','Continue Metformin 500mg','Cardiologist follow-up','Continue Aspirin 75mg','GP follow-up consult','Start Metformin 500mg','Start Atorvastatin 10mg','GP follow-up consult','Endocrinology review','Fasting blood glucose','Continue Amlodipine 5mg','Lipid panel','Start Atorvastatin 10mg'],
  provIdx: [1,2,3,1,2,3,1,2,3,1,2,3,1,2,3,1,2],
  conDay:  ['2026-04-03','2026-04-07','2026-04-11','2026-04-15','2026-04-19','2026-04-23','2026-04-27','2026-05-01','2026-05-05','2026-05-09','2026-05-12','2026-05-15','2026-05-18','2026-05-21','2026-05-24','2026-05-27','2026-05-30'],
  due:     ['2026-05-10','2026-05-12','2026-05-14','2026-05-16','2026-05-18','2026-05-20','2026-05-22','2026-05-24','2026-05-26','2026-05-28','2026-05-30','2026-06-01','2026-06-03','2026-06-05','2026-06-07','2026-06-09','2026-06-10'],
}

// Group B: 5 background members — pending COMPLETABLE (forgot/none/lost_thread)
const GB = {
  names:   ['Deepika Malhotra','Arun Goswami','Sonali Patil','Harish Nambiar','Rekha Choudhary'],
  genders: ['F','M','F','M','F'],
  dobs:    ['1980-08-19','1984-03-12','1988-06-25','1966-11-04','1979-02-28'],
  segs:    ['forgot','none','lost_thread','forgot','none'],
  risk:    ['medium','medium','low','medium','low'],
  scores:  [44,39,25,51,22],
  wallets: [2200,1800,3000,1600,2800],
  chronic: [false,true,false,true,false],
  type1:   ['lab_test','lab_test','lab_test','imaging','follow_up_consult'],
  title1:  ['HbA1c blood test','Fasting blood glucose','Lipid panel','Chest X-ray','Diabetologist follow-up'],
  type2:   ['follow_up_consult','medication','follow_up_consult','lab_test','lab_test'],
  title2:  ['GP follow-up consult','Start Metformin 500mg','Cardiologist review','Kidney function test','HbA1c blood test'],
  provIdx: [1,2,3,1,2],
  conDay:  ['2026-05-28','2026-05-29','2026-05-30','2026-05-31','2026-06-01'],
}

// Group C: 8 background members — pending STRUCTURAL (cost/avoidance/trust)
const GC = {
  names:   ['Rajesh Bansal','Meenakshi Subramaniam','Anil Kulkarni','Parveen Akhtar','Devyani Chawla','Manohar Singh','Fatima Sheikh','Sudhir Pandey'],
  genders: ['M','F','M','M','F','M','F','M'],
  dobs:    ['1958-03-07','1960-09-22','1972-05-13','1978-01-30','1955-11-18','1974-07-04','1982-04-16','1968-02-09'],
  segs:    ['cost','trust','cost','avoidance','trust','cost','avoidance','trust'],
  risk:    ['high','high','medium','medium','high','medium','medium','medium'],
  scores:  [74,70,52,48,81,50,43,57],
  wallets: [0,500,1200,1800,0,2000,2500,1500],
  chronic: [true,true,false,false,true,true,false,true],
  type1:   ['lab_test','lab_test','imaging','follow_up_consult','lab_test','lab_test','follow_up_consult','imaging'],
  title1:  ['HbA1c blood test','Thyroid function test','Abdominal ultrasound','Cardiologist follow-up','HbA1c blood test','Lipid panel','Diabetologist follow-up','Chest X-ray'],
  type2:   ['follow_up_consult','medication','lab_test','medication','follow_up_consult','medication','lab_test','medication'],
  title2:  ['Diabetologist follow-up','Start Metformin 500mg','Fasting blood glucose','Continue Amlodipine 5mg','Endocrinology review','Start Atorvastatin 10mg','HbA1c blood test','Start Atorvastatin 10mg'],
  provIdx: [1,3,2,1,3,2,1,3],
  conDay:  ['2026-05-10','2026-05-12','2026-05-15','2026-05-18','2026-05-20','2026-05-23','2026-05-26','2026-05-29'],
  due:     ['2026-06-01','2026-06-02','2026-06-03','2026-06-04','2026-06-05','2026-06-06','2026-06-07','2026-06-08'],
}

function riskDriversForSeg(seg: string): string[] {
  if (seg === 'cost')      return ['Structural cost barrier — wallet empty or insufficient', 'Mandatory care plan action pending']
  if (seg === 'avoidance') return ['Side-effect anxiety — avoidance pattern', 'Mandatory care plan action pending']
  return ['Low trust in digital health systems', 'Mandatory care plan action pending']
}

function summaryForSeg(seg: string): string {
  if (seg === 'cost')      return 'Care plan issued. Member flagged cost as primary barrier — wallet balance insufficient. Automated nudge suppressed; navigator engagement required to explore employer subsidy options.'
  if (seg === 'avoidance') return 'Care plan issued. Member expressed significant anxiety about side effects. Automated nudge suppressed; navigator support required for trust-building and barrier resolution.'
  return 'Care plan issued. Member expressed concerns about digital data privacy. Automated nudge suppressed; human navigator follow-up required in preferred communication channel.'
}

// ── Main ──────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST')    return jsonRes({ ok: false, error: 'Method not allowed' }, 405)

  try {
    // ── 1. Resolve context ───────────────────────────────────────────────────
    const { data: orgs } = await supabase
      .from('organizations').select('id').eq('name', 'Acme Corp')
    const orgId: string | undefined = orgs?.[0]?.id
    if (!orgId) return jsonRes({ ok: false, error: 'Acme Corp org not found' }, 400)

    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 100 })
    const users = authData?.users ?? []
    const navId: string | null = users.find((u: { email?: string }) => u.email === 'navigator@demo.continuum.health')?.id ?? null
    const patId: string | null = users.find((u: { email?: string }) => u.email === 'patient@demo.continuum.health')?.id ?? null

    // ── 2. Get current Acme member IDs (needed to scope deletes) ────────────
    const { data: existing } = await supabase
      .from('members').select('id').eq('org_id', orgId)
    const memberIds: string[] = (existing ?? []).map((m: { id: string }) => m.id)

    // ── 3. WIPE ──────────────────────────────────────────────────────────────
    // Break the care_plan_actions ↔ clinical_events circular FK first
    if (memberIds.length > 0) {
      await supabase.from('care_plan_actions')
        .update({ completed_via_event_id: null })
        .in('member_id', memberIds)
    }

    // Null out profile member links so the members rows can be deleted
    await supabase.from('profiles')
      .update({ member_id: null })
      .not('member_id', 'is', null)

    // Delete leaf tables first, then parents (FK-safe order)
    if (memberIds.length > 0) {
      await supabase.from('nudges').delete().in('member_id', memberIds)
      await supabase.from('messages').delete().in('member_id', memberIds)
      await supabase.from('navigator_tasks').delete().in('member_id', memberIds)
      await supabase.from('clinical_events').delete().in('member_id', memberIds)
      await supabase.from('care_plan_actions').delete().in('member_id', memberIds)
      await supabase.from('care_plans').delete().in('member_id', memberIds)
      await supabase.from('consultations').delete().in('member_id', memberIds)
      await supabase.from('members').delete().eq('org_id', orgId)
    }

    // Delete all providers (demo-only; consultations already gone)
    await supabase.from('providers').delete().not('id', 'is', null)

    // Reset sim clock and contract lives
    await supabase.from('sim_state')
      .update({ current_day: BASE, updated_at: new Date().toISOString() }).eq('id', 1)
    await supabase.from('organizations')
      .update({ contract_lives: 12480 }).eq('id', orgId)

    // ── 4. SEED ──────────────────────────────────────────────────────────────

    // ── 4a. Providers ────────────────────────────────────────────────────────
    const { data: pRows } = await supabase.from('providers')
      .insert([
        { full_name: 'Dr. Anil Mehra',   specialty: 'General Practice'  },
        { full_name: 'Dr. Vikram Rao',   specialty: 'Internal Medicine' },
        { full_name: 'Dr. Sunita Bansal', specialty: 'Cardiology'       },
      ])
      .select('id, full_name')

    const provByName: Record<string, string> = {}
    for (const p of pRows ?? []) provByName[p.full_name] = p.id
    const pMehra  = provByName['Dr. Anil Mehra']
    const pRao    = provByName['Dr. Vikram Rao']
    const pBansal = provByName['Dr. Sunita Bansal']
    const P = [null, pMehra, pRao, pBansal] // 1-indexed to match SQL arrays

    // ── 4b. M1 Members ───────────────────────────────────────────────────────
    await supabase.from('members').insert([
      { id: U.ANANYA, org_id: orgId, full_name: 'Ananya Sharma', phone: '+91-98100-11001', dob: '1990-03-14', gender: 'F', preferred_language: 'English',   risk_tier: 'medium', risk_score: 42, risk_drivers: ['Borderline HbA1c 5.9%', 'Missed HbA1c retest'],                                                        drop_segment: 'forgot',       wallet_balance: 3500, is_chronic: false },
      { id: U.RAHUL,  org_id: orgId, full_name: 'Rahul Nair',    phone: '+91-98100-11002', dob: '1978-07-22', gender: 'M', preferred_language: 'English',   risk_tier: 'high',   risk_score: 78, risk_drivers: ['Type 2 Diabetes', 'Missed 3 consecutive follow-ups', 'Cost barrier identified'],                    drop_segment: 'cost',         wallet_balance: 0,    is_chronic: true  },
      { id: U.KAVITA, org_id: orgId, full_name: 'Kavita Singh',  phone: '+91-98100-11003', dob: '1985-11-05', gender: 'F', preferred_language: 'Hindi',     risk_tier: 'low',    risk_score: 18, risk_drivers: ['Occasional fatigue', 'Reported feeling better — drop-off risk'],                                    drop_segment: 'feels_better', wallet_balance: 2000, is_chronic: false },
      { id: U.DEEPAK, org_id: orgId, full_name: 'Deepak Verma',  phone: '+91-98100-11004', dob: '1965-01-30', gender: 'M', preferred_language: 'Hindi',     risk_tier: 'medium', risk_score: 55, risk_drivers: ['ER visit 72h ago (chest pain)', 'Logistics barrier — no transport'],                              drop_segment: 'logistics',    wallet_balance: 1500, is_chronic: true  },
      { id: U.MEERA,  org_id: orgId, full_name: 'Meera Pillai',  phone: '+91-98100-11005', dob: '1972-09-18', gender: 'F', preferred_language: 'Malayalam', risk_tier: 'high',   risk_score: 81, risk_drivers: ['Hypertension Stage 2', 'Declined mandatory HbA1c test', 'Expressed distrust of digital health'], drop_segment: 'trust',        wallet_balance: 4000, is_chronic: true  },
    ])

    // Re-link patient@demo profile → Ananya
    if (patId) {
      await supabase.from('profiles').update({ member_id: U.ANANYA }).eq('id', patId)
    }

    // ── 4c. M1 Consultations ─────────────────────────────────────────────────
    await supabase.from('consultations').insert([
      { id: U.CON_ANANYA, member_id: U.ANANYA, provider_id: pMehra, consulted_at: ts(-15), mode: 'tele',      chief_complaint: 'Fatigue and borderline HbA1c on routine check-up',  summary: 'Patient presents with fatigue over 4 weeks. Routine bloods show HbA1c 5.9% (borderline). FBS 108 mg/dL. BP normal. No medication currently. Plan: repeat HbA1c + fasting BG in 2 weeks; Endo referral if not improved; lifestyle counselling re diet + activity.' },
      { id: U.CON_MEERA,  member_id: U.MEERA,  provider_id: pMehra, consulted_at: ts(-20), mode: 'in_person', chief_complaint: 'Hypertension management review',                      summary: 'Stage 2 HTN. HbA1c recommended to screen for metabolic syndrome. Patient declined, citing privacy concerns about digital records. Mandatory: HbA1c. Recommended: 24h BP monitoring.' },
      { id: U.CON_RAHUL,  member_id: U.RAHUL,  provider_id: pMehra, consulted_at: ts(-30), mode: 'tele',      chief_complaint: 'T2DM routine review — HbA1c 8.4%',                  summary: 'Poorly controlled T2DM. HbA1c 8.4%. Has not attended follow-up despite 3 reminders. Expressed concern about out-of-pocket costs. Mandatory: repeat HbA1c, diabetologist referral.' },
    ])

    // ── 4d. M1 Care Plans ────────────────────────────────────────────────────
    await supabase.from('care_plans').insert([
      { id: U.PLAN_ANANYA, consultation_id: U.CON_ANANYA, member_id: U.ANANYA, status: 'active', created_by: pMehra, created_at: ts(-15) },
      { id: U.PLAN_MEERA,  consultation_id: U.CON_MEERA,  member_id: U.MEERA,  status: 'active', created_by: pMehra, created_at: ts(-20) },
      { id: U.PLAN_RAHUL,  consultation_id: U.CON_RAHUL,  member_id: U.RAHUL,  status: 'active', created_by: pMehra, created_at: ts(-30) },
    ])

    // ── 4e. M1 Care Plan Actions ─────────────────────────────────────────────
    await supabase.from('care_plan_actions').insert([
      { id: U.A_ANANYA_HBA1C,   care_plan_id: U.PLAN_ANANYA, member_id: U.ANANYA, action_type: 'lab_test',          title: 'Repeat HbA1c blood test',                    why_plain: 'Your last reading was borderline (5.9%). A repeat test checks whether your blood sugar has improved or needs attention.',                                                                    clinical_priority: 'mandatory',   provenance: 'clinician_authored', due_date: d(-7),  status: 'overdue',   created_at: ts(-15) },
      { id: U.A_ANANYA_FBG,     care_plan_id: U.PLAN_ANANYA, member_id: U.ANANYA, action_type: 'lab_test',          title: 'Fasting blood glucose test',                 why_plain: 'Checks your sugar levels after an overnight fast. Together with HbA1c, this gives Dr. Mehra a full picture of how your body handles sugar.',                                             clinical_priority: 'mandatory',   provenance: 'clinician_authored', due_date: d(-9),  status: 'completed', completed_via_event_id: U.EV_FBG_DONE, created_at: ts(-15) },
      { id: U.A_ANANYA_CONSULT, care_plan_id: U.PLAN_ANANYA, member_id: U.ANANYA, action_type: 'follow_up_consult', title: 'Consult with Dr. Sara Iyer (Endocrinology)', why_plain: 'If your HbA1c remains borderline, Dr. Mehra has referred you to a specialist to create a personalised plan before it progresses.',                                                         clinical_priority: 'recommended', provenance: 'clinician_authored', due_date: d(13),  status: 'pending',   created_at: ts(-15) },
      { id: U.A_ANANYA_MED,     care_plan_id: U.PLAN_ANANYA, member_id: U.ANANYA, action_type: 'medication',        title: 'Start Metformin 500mg daily',                why_plain: 'A low dose to support blood sugar control while we wait for your retest results. Take with food.',                                                                                            clinical_priority: 'recommended', provenance: 'clinician_authored', due_date: d(-12), status: 'completed', created_at: ts(-15) },
      { id: U.A_MEERA_HBA1C,   care_plan_id: U.PLAN_MEERA,  member_id: U.MEERA,  action_type: 'lab_test',          title: 'HbA1c blood test (metabolic screening)',     why_plain: 'To screen for diabetes alongside your blood pressure condition — both conditions often appear together.',                                                                                  clinical_priority: 'mandatory',   provenance: 'clinician_authored', due_date: d(-12), status: 'declined',  decline_reason: 'privacy_concern', created_at: ts(-20) },
      { id: U.A_RAHUL_CONSULT,  care_plan_id: U.PLAN_RAHUL,  member_id: U.RAHUL,  action_type: 'follow_up_consult', title: 'Diabetologist referral consult',             why_plain: 'Your HbA1c is 8.4% — higher than the 7% target. A specialist can adjust your medication and help bring it down.',                                                                       clinical_priority: 'mandatory',   provenance: 'clinician_authored', due_date: d(-20), status: 'pending',   created_at: ts(-30) },
    ])

    // ── 4f. M1 Clinical Events ───────────────────────────────────────────────
    await supabase.from('clinical_events').insert([
      { id: U.EV_FBG_DONE,  member_id: U.ANANYA, event_type: 'diagnostic_completed',     source: 'diagnostics', linked_action_id: U.A_ANANYA_FBG, occurred_at: ts(-9),  payload: { test: 'Fasting Blood Glucose', result: '95 mg/dL', normal_range: '70–99 mg/dL', status: 'normal', lab: 'SRL Diagnostics' } },
      { id: U.EV_HOME_COLL, member_id: U.ANANYA, event_type: 'home_collection_scheduled', source: 'app',         linked_action_id: U.A_ANANYA_FBG, occurred_at: ts(-10), payload: { slot: '07:30–08:00', collection_by: 'SRL Home Collection' } },
      { id: U.EV_DEEPAK_ER, member_id: U.DEEPAK, event_type: 'er_visit',                  source: 'ambulance',   linked_action_id: null,            occurred_at: ts(-2),  payload: { hospital: 'Max Hospital, Saket', presenting_complaint: 'Chest pain, ruled out ACS', discharged_at: d(-2) + 'T14:30:00Z' } },
    ])

    // ── 4g. M1 Nudges ────────────────────────────────────────────────────────
    await supabase.from('nudges').insert([
      { id: U.NUD_ANANYA_SENT, action_id: U.A_ANANYA_HBA1C,  member_id: U.ANANYA, channel: 'whatsapp', template_key: 'overdue_lab_reminder',        status: 'sent',      sent_at: ts(-6) },
      { id: U.NUD_ANANYA_RESP, action_id: U.A_ANANYA_HBA1C,  member_id: U.ANANYA, channel: 'whatsapp', template_key: 'overdue_lab_reminder',        status: 'responded', response_text: 'Is this really necessary? I feel fine now.', sent_at: ts(-6, 11) },
      { id: U.NUD_RAHUL_SUPP,  action_id: U.A_RAHUL_CONSULT, member_id: U.RAHUL,  channel: 'whatsapp', template_key: 'mandatory_followup_reminder', status: 'suppressed', suppression_reason: 'cost_barrier — member in cost drop segment; routing to navigator for financial barrier support', sent_at: ts(-15) },
      { id: U.NUD_MEERA_SUPP,  action_id: U.A_MEERA_HBA1C,  member_id: U.MEERA,  channel: 'whatsapp', template_key: 'mandatory_lab_reminder',      status: 'suppressed', suppression_reason: 'trust_barrier — member in trust drop segment; declined mandatory action; routing to human navigator', sent_at: ts(-11) },
    ])

    // ── 4h. M1 Messages (Ananya's WhatsApp thread) ──────────────────────────
    await supabase.from('messages').insert([
      { id: U.MSG_FBG,     member_id: U.ANANYA, sender: 'system',    channel: 'whatsapp', body: '✅ Your fasting blood glucose result has been received — 95 mg/dL (normal range). Dr. Mehra has been notified. Keep it up!',                                                                                                                                         created_at: ts(-9) },
      { id: U.MSG_NUDGE,   member_id: U.ANANYA, sender: 'system',    channel: 'whatsapp', body: `Hi Ananya 👋 Dr. Mehra recommended a repeat HbA1c test. It was due on ${fmtDayMon(d(-7))} and is now overdue. Book a home sample collection — it's covered by your Acme health wallet (₹0 to pay).`,                                                              created_at: ts(-6, 9) },
      { id: U.MSG_MQ1,     member_id: U.ANANYA, sender: 'member',    channel: 'whatsapp', body: 'Is this really necessary? I feel fine now.',                                                                                                                                                                                                                           created_at: ts(-6, 10) },
      { id: U.MSG_SR1,     member_id: U.ANANYA, sender: 'system',    channel: 'whatsapp', body: "That's a fair question! Dr. Mehra flagged this because your previous reading was borderline (5.9%). The test helps confirm whether your levels have improved — it takes only 10 minutes with a home collection. No pressure, but it's worth knowing.",               created_at: ts(-6, 11) },
      { id: U.MSG_MQ2,     member_id: U.ANANYA, sender: 'member',    channel: 'whatsapp', body: 'How much will it cost?',                                                                                                                                                                                                                                               created_at: ts(-6, 12) },
      { id: U.MSG_COST,    member_id: U.ANANYA, sender: 'system',    channel: 'whatsapp', body: "Great news — it's fully covered by your Acme health wallet. ₹0 out of pocket for home collection. Your wallet balance is ₹3,500.",                                                                                                                                   created_at: ts(-6, 13) },
      { id: U.MSG_MQ3,     member_id: U.ANANYA, sender: 'member',    channel: 'whatsapp', body: "Ok, I'll think about it.",                                                                                                                                                                                                                                             created_at: ts(-6, 14) },
      { id: U.MSG_HANDOFF, member_id: U.ANANYA, sender: 'system',    channel: 'whatsapp', body: '— Connecting you to Priya, your Care Navigator —',                                                                                                                                                                                                                   created_at: ts(-5, 9) },
      { id: U.MSG_NAV,     member_id: U.ANANYA, sender: 'navigator', channel: 'whatsapp', body: "Hi Ananya, this is Priya from the Continuum care team 👋 Totally understand the hesitation. I can schedule the home collection at a time that works for you — morning or afternoon? It'll be a quick visit.",                                                        created_at: ts(-5, 10) },
    ])

    // ── 4i. M1 Navigator Tasks ───────────────────────────────────────────────
    await supabase.from('navigator_tasks').insert([
      { id: U.TASK_MEERA,  member_id: U.MEERA,  navigator_id: navId, trigger_reason: 'declined_mandatory', priority: 'p1', status: 'open', notes: 'Member declined mandatory HbA1c citing privacy concerns. Automated nudge suppressed (trust segment). Needs personal outreach in preferred language (Malayalam).', created_at: ts(-11) },
      { id: U.TASK_RAHUL,  member_id: U.RAHUL,  navigator_id: navId, trigger_reason: 'structural_barrier', priority: 'p2', status: 'open', notes: 'Member missed diabetologist referral — cost segment. Wallet balance ₹0. Explore employer subsidy options. Automated nudge suppressed.',                          created_at: ts(-15) },
      { id: U.TASK_DEEPAK, member_id: U.DEEPAK, navigator_id: navId, trigger_reason: 'post_er_72h',        priority: 'p2', status: 'open', notes: 'Member discharged from Max Hospital (chest pain, ruled out ACS) 2 days ago. No follow-up booked. Logistics barrier — no transport. Help arrange tele-consult.',  created_at: ts(-2) },
    ])

    // ── 4j. M9 Hero 1: Rohan Mehta ──────────────────────────────────────────
    const rCon = crypto.randomUUID(), rPlan = crypto.randomUUID(), rAct = crypto.randomUUID()
    await supabase.from('members').insert({ id: U.ROHAN, org_id: orgId, full_name: 'Rohan Mehta', phone: '+91-98100-20001', dob: '1975-08-14', gender: 'M', preferred_language: 'Hindi', risk_tier: 'high', risk_score: 72, risk_drivers: ['Type 2 Diabetes (HbA1c 8.1%)', 'Mandatory retest pending — reports feeling better'], drop_segment: 'feels_better', wallet_balance: 500, is_chronic: true })
    await supabase.from('consultations').insert({ id: rCon,  member_id: U.ROHAN, provider_id: pMehra,  consulted_at: '2026-05-20T10:00:00Z', mode: 'tele',      chief_complaint: 'T2DM review — improved symptoms, HbA1c retest due', summary: 'Patient reports improved energy. Last HbA1c 8.1% (3 months prior). Skeptical about retest — believes he is in remission. Clinical note: subjective improvement does not confirm glycaemic control. Mandatory HbA1c retest required before medication review.' })
    await supabase.from('care_plans').insert({ id: rPlan, consultation_id: rCon,  member_id: U.ROHAN, status: 'active', created_by: pMehra,  created_at: '2026-05-20T10:00:00Z' })
    await supabase.from('care_plan_actions').insert({ id: rAct, care_plan_id: rPlan, member_id: U.ROHAN, action_type: 'lab_test', title: 'HbA1c retest (mandatory)', why_plain: 'Your last reading was 8.1% — above the 7% target for T2DM. A retest confirms whether lifestyle changes are working or medication needs adjustment. Feeling better is a positive sign, but blood sugar must be verified.', clinical_priority: 'mandatory', provenance: 'clinician_authored', due_date: '2026-06-10', status: 'pending', created_at: '2026-05-20T10:00:00Z' })

    // ── 4k. M9 Hero 2: Arjun Kapoor ─────────────────────────────────────────
    const aCon = crypto.randomUUID(), aPlan = crypto.randomUUID(), aAct = crypto.randomUUID()
    const aEr  = crypto.randomUUID(), aTask = crypto.randomUUID()
    await supabase.from('members').insert({ id: U.ARJUN, org_id: orgId, full_name: 'Arjun Kapoor', phone: '+91-98100-20002', dob: '1970-03-05', gender: 'M', preferred_language: 'Hindi', risk_tier: 'medium', risk_score: 58, risk_drivers: ['ER visit 2026-06-12 (chest pain, ruled out ACS)', 'Discharge medication reconciliation pending', 'Logistics barrier — no private transport'], drop_segment: 'logistics', wallet_balance: 1200, is_chronic: false })
    await supabase.from('consultations').insert({ id: aCon,  member_id: U.ARJUN, provider_id: pBansal, consulted_at: '2026-06-12T09:00:00Z', mode: 'in_person', chief_complaint: 'ER discharge — chest pain, ACS ruled out', summary: 'Patient presented to Apollo Hospital with acute chest pain. ECG and serial troponins normal. ACS excluded. Discharged with medication reconciliation and 72h follow-up instructions. Mandatory: discharge medication reconciliation within 72h. Patient has logistics barrier — no transport to clinic, recommend tele-consult.' })
    await supabase.from('care_plans').insert({ id: aPlan, consultation_id: aCon,  member_id: U.ARJUN, status: 'active', created_by: pBansal, created_at: '2026-06-12T09:00:00Z' })
    await supabase.from('care_plan_actions').insert({ id: aAct, care_plan_id: aPlan, member_id: U.ARJUN, action_type: 'medication', title: 'Discharge medication reconciliation', why_plain: 'Ensure all medications prescribed at discharge are understood and being taken. Critical within 72h of ER discharge to prevent readmission. Includes reviewing new prescriptions and checking interactions with existing medications.', clinical_priority: 'mandatory', provenance: 'clinician_authored', due_date: '2026-06-12', status: 'pending', created_at: '2026-06-12T09:00:00Z' })
    await supabase.from('clinical_events').insert({ id: aEr, member_id: U.ARJUN, event_type: 'er_visit', source: 'ambulance', linked_action_id: null, occurred_at: '2026-06-12T10:00:00Z', payload: { hospital: 'Apollo Hospital, New Delhi', presenting_complaint: 'Acute chest pain, palpitations', ruling_out: 'ACS excluded — ECG normal, troponins ×3 negative', discharged_at: '2026-06-12T18:00:00Z' } })
    await supabase.from('navigator_tasks').insert({ id: aTask, member_id: U.ARJUN, navigator_id: navId, trigger_reason: 'post_er_72h', priority: 'p1', status: 'open', notes: 'Arjun Kapoor discharged Apollo Hospital 12 Jun after chest pain (ACS ruled out). Discharge medication reconciliation pending. Logistics barrier — no personal transport. Arrange tele-consult or home visit within 72h window.', created_at: '2026-06-12T12:00:00Z' })

    // ── 4l–4n. M9 Background groups — batch inserts per table ───────────────
    // Collecting all rows first, then inserting per table in FK order.

    const bMembers: object[] = [], bConsults: object[] = [], bPlans: object[] = [], bActions: object[] = []

    // Group A: 17 completed
    for (let i = 0; i < 17; i++) {
      const mid = crypto.randomUUID(), cid = crypto.randomUUID()
      const pid = crypto.randomUUID(), a1 = crypto.randomUUID(), a2 = crypto.randomUUID()
      const prov = P[GA.provIdx[i]]!
      bMembers.push({ id: mid, org_id: orgId, full_name: GA.names[i], phone: `+91-98100-${30001 + i}`, dob: GA.dobs[i], gender: GA.genders[i], drop_segment: GA.segs[i], risk_tier: GA.risk[i], risk_score: GA.scores[i], risk_drivers: ['Care plan completed per schedule'], wallet_balance: GA.wallets[i], is_chronic: GA.chronic[i] })
      bConsults.push({ id: cid, member_id: mid, provider_id: prov, consulted_at: GA.conDay[i] + 'T10:00:00Z', mode: 'tele', chief_complaint: 'Routine care review', summary: 'Annual follow-up completed. Care plan issued and all actions completed per clinical recommendations.' })
      bPlans.push({ id: pid, consultation_id: cid, member_id: mid, status: 'active', created_by: prov, created_at: GA.conDay[i] + 'T10:00:00Z' })
      bActions.push(
        { id: a1, care_plan_id: pid, member_id: mid, action_type: GA.type1[i], title: GA.title1[i], why_plain: 'Clinically indicated follow-up as part of annual care review.',       clinical_priority: GA.pri1[i],  provenance: 'clinician_authored', due_date: GA.due[i], status: 'completed', created_at: GA.conDay[i] + 'T10:00:00Z' },
        { id: a2, care_plan_id: pid, member_id: mid, action_type: GA.type2[i], title: GA.title2[i], why_plain: 'Recommended follow-up action per care plan — completed on schedule.', clinical_priority: 'recommended', provenance: 'clinician_authored', due_date: GA.due[i], status: 'completed', created_at: GA.conDay[i] + 'T10:00:00Z' },
      )
    }

    // Group B: 5 completable pending
    for (let i = 0; i < 5; i++) {
      const mid = crypto.randomUUID(), cid = crypto.randomUUID()
      const pid = crypto.randomUUID(), a1 = crypto.randomUUID(), a2 = crypto.randomUUID()
      const prov = P[GB.provIdx[i]]!
      bMembers.push({ id: mid, org_id: orgId, full_name: GB.names[i], phone: `+91-98100-${40001 + i}`, dob: GB.dobs[i], gender: GB.genders[i], drop_segment: GB.segs[i], risk_tier: GB.risk[i], risk_score: GB.scores[i], risk_drivers: ['Pending care plan actions — overdue'], wallet_balance: GB.wallets[i], is_chronic: GB.chronic[i] })
      bConsults.push({ id: cid, member_id: mid, provider_id: prov, consulted_at: GB.conDay[i] + 'T10:00:00Z', mode: 'tele', chief_complaint: 'Routine care review', summary: 'Care plan issued. Member has not yet completed recommended actions. Follow-up nudge appropriate.' })
      bPlans.push({ id: pid, consultation_id: cid, member_id: mid, status: 'active', created_by: prov, created_at: GB.conDay[i] + 'T10:00:00Z' })
      bActions.push(
        { id: a1, care_plan_id: pid, member_id: mid, action_type: GB.type1[i], title: GB.title1[i], why_plain: 'Clinically indicated — overdue follow-up requiring completion.',  clinical_priority: 'mandatory', provenance: 'clinician_authored', due_date: '2026-06-10', status: 'pending', created_at: GB.conDay[i] + 'T10:00:00Z' },
        { id: a2, care_plan_id: pid, member_id: mid, action_type: GB.type2[i], title: GB.title2[i], why_plain: 'Recommended follow-up action — overdue.',                        clinical_priority: 'mandatory', provenance: 'clinician_authored', due_date: '2026-06-10', status: 'pending', created_at: GB.conDay[i] + 'T10:00:00Z' },
      )
    }

    // Group C: 8 structural pending
    for (let i = 0; i < 8; i++) {
      const mid = crypto.randomUUID(), cid = crypto.randomUUID()
      const pid = crypto.randomUUID(), a1 = crypto.randomUUID(), a2 = crypto.randomUUID()
      const prov = P[GC.provIdx[i]]!
      const seg  = GC.segs[i]
      bMembers.push({ id: mid, org_id: orgId, full_name: GC.names[i], phone: `+91-98100-${50001 + i}`, dob: GC.dobs[i], gender: GC.genders[i], drop_segment: seg, risk_tier: GC.risk[i], risk_score: GC.scores[i], risk_drivers: riskDriversForSeg(seg), wallet_balance: GC.wallets[i], is_chronic: GC.chronic[i] })
      bConsults.push({ id: cid, member_id: mid, provider_id: prov, consulted_at: GC.conDay[i] + 'T10:00:00Z', mode: 'tele', chief_complaint: 'Routine care review', summary: summaryForSeg(seg) })
      bPlans.push({ id: pid, consultation_id: cid, member_id: mid, status: 'active', created_by: prov, created_at: GC.conDay[i] + 'T10:00:00Z' })
      bActions.push(
        { id: a1, care_plan_id: pid, member_id: mid, action_type: GC.type1[i], title: GC.title1[i], why_plain: 'Mandatory clinical follow-up — requires navigator support to address structural barrier.', clinical_priority: 'mandatory', provenance: 'clinician_authored', due_date: GC.due[i], status: 'pending', created_at: GC.conDay[i] + 'T10:00:00Z' },
        { id: a2, care_plan_id: pid, member_id: mid, action_type: GC.type2[i], title: GC.title2[i], why_plain: 'Recommended follow-up — pending navigator engagement to resolve barrier.',               clinical_priority: 'mandatory', provenance: 'clinician_authored', due_date: GC.due[i], status: 'pending', created_at: GC.conDay[i] + 'T10:00:00Z' },
      )
    }

    // Batch insert background groups in FK order
    await supabase.from('members').insert(bMembers)
    await supabase.from('consultations').insert(bConsults)
    await supabase.from('care_plans').insert(bPlans)
    await supabase.from('care_plan_actions').insert(bActions)

    return jsonRes({
      ok: true,
      message: 'Demo data wiped and reseeded.',
      counts: { members: 5 + 2 + 30, actions: 6 + 2 + 60 },
    })

  } catch (e) {
    console.error('reseed-demo error:', e)
    return jsonRes({ ok: false, error: e instanceof Error ? e.message : 'Reseed failed' }, 500)
  }
})
