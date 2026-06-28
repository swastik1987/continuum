/**
 * M9 Demo Dataset Seed — TypeScript convenience script
 * Mirrors supabase/migrations/003_m9_seed.sql via the Supabase JS admin client.
 *
 * Run: bun run seed
 *
 * Required env vars (in .env or exported):
 *   VITE_SUPABASE_URL        — your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — from Supabase dashboard → Settings → API
 *
 * NOTE: If you have already run 003_m9_seed.sql in the Lovable SQL Editor,
 * this script will detect that and exit cleanly (idempotent).
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('\n[seed-demo] Missing env vars:')
  if (!SUPABASE_URL) console.error('  VITE_SUPABASE_URL (or SUPABASE_URL)')
  if (!SERVICE_KEY)  console.error('  SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nAdd these to your .env file and re-run.\n')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Hero member UUIDs (explicit for idempotency) ────────────────────────────
const ROHAN_ID = '22222222-1111-0000-0000-000000000001'
const ARJUN_ID = '22222222-1111-0000-0000-000000000002'

// ── Group A: 17 "all complete" background members ──────────────────────────
const GROUP_A = [
  { name: 'Priyanka Desai',      gender: 'F', dob: '1986-04-12', seg: 'forgot',       risk: 'medium', score: 42, wallet: 2500, chronic: false, prov: 0, con: '2026-04-03', due: '2026-05-10', t1: 'lab_test',          ti1: 'HbA1c blood test',          p1: 'mandatory',    t2: 'medication',        ti2: 'Start Atorvastatin 10mg' },
  { name: 'Sanjay Kumar',        gender: 'M', dob: '1975-09-23', seg: 'logistics',    risk: 'low',    score: 18, wallet: 1800, chronic: false, prov: 1, con: '2026-04-07', due: '2026-05-12', t1: 'follow_up_consult', ti1: 'GP follow-up consult',      p1: 'mandatory',    t2: 'medication',        ti2: 'Continue Amlodipine 5mg' },
  { name: 'Nandita Rao',         gender: 'F', dob: '1988-11-07', seg: 'feels_better', risk: 'low',    score: 22, wallet: 3200, chronic: false, prov: 2, con: '2026-04-11', due: '2026-05-14', t1: 'lab_test',          ti1: 'Lipid panel',               p1: 'mandatory',    t2: 'follow_up_consult', ti2: 'GP follow-up consult' },
  { name: 'Vikram Pillai',       gender: 'M', dob: '1978-02-19', seg: 'none',         risk: 'medium', score: 45, wallet: 2000, chronic: true,  prov: 0, con: '2026-04-15', due: '2026-05-16', t1: 'imaging',           ti1: 'Chest X-ray',               p1: 'recommended',  t2: 'medication',        ti2: 'Start Atorvastatin 10mg' },
  { name: 'Asha Mehta',          gender: 'F', dob: '1970-06-30', seg: 'lost_thread',  risk: 'medium', score: 38, wallet: 1500, chronic: false, prov: 1, con: '2026-04-19', due: '2026-05-18', t1: 'follow_up_consult', ti1: 'Cardiologist review',        p1: 'mandatory',    t2: 'medication',        ti2: 'Start Aspirin 75mg' },
  { name: 'Rohit Sharma',        gender: 'M', dob: '1995-01-14', seg: 'forgot',       risk: 'medium', score: 44, wallet: 2800, chronic: false, prov: 2, con: '2026-04-23', due: '2026-05-20', t1: 'lab_test',          ti1: 'Fasting blood glucose',     p1: 'mandatory',    t2: 'medication',        ti2: 'Continue Metformin 500mg' },
  { name: 'Sunita Patel',        gender: 'F', dob: '1980-08-05', seg: 'logistics',    risk: 'low',    score: 20, wallet: 3000, chronic: false, prov: 0, con: '2026-04-27', due: '2026-05-22', t1: 'lab_test',          ti1: 'Kidney function test',      p1: 'mandatory',    t2: 'follow_up_consult', ti2: 'Cardiologist follow-up' },
  { name: 'Aditya Singh',        gender: 'M', dob: '1990-03-27', seg: 'none',         risk: 'medium', score: 41, wallet: 2200, chronic: false, prov: 1, con: '2026-05-01', due: '2026-05-24', t1: 'vaccination',       ti1: 'Hepatitis B vaccination',   p1: 'recommended',  t2: 'medication',        ti2: 'Continue Aspirin 75mg' },
  { name: 'Kavya Nair',          gender: 'F', dob: '1994-12-03', seg: 'feels_better', risk: 'low',    score: 19, wallet: 3500, chronic: false, prov: 2, con: '2026-05-05', due: '2026-05-26', t1: 'lab_test',          ti1: 'Thyroid function test',     p1: 'mandatory',    t2: 'follow_up_consult', ti2: 'GP follow-up consult' },
  { name: 'Ramesh Iyer',         gender: 'M', dob: '1956-07-11', seg: 'forgot',       risk: 'high',   score: 71, wallet: 1000, chronic: true,  prov: 0, con: '2026-05-09', due: '2026-05-28', t1: 'lab_test',          ti1: 'HbA1c blood test',          p1: 'mandatory',    t2: 'medication',        ti2: 'Start Metformin 500mg' },
  { name: 'Geeta Verma',         gender: 'F', dob: '1968-05-22', seg: 'none',         risk: 'medium', score: 43, wallet: 2100, chronic: true,  prov: 1, con: '2026-05-12', due: '2026-05-30', t1: 'follow_up_consult', ti1: 'Diabetologist follow-up',   p1: 'mandatory',    t2: 'medication',        ti2: 'Start Atorvastatin 10mg' },
  { name: 'Suresh Joshi',        gender: 'M', dob: '1976-10-16', seg: 'logistics',    risk: 'medium', score: 47, wallet: 2700, chronic: false, prov: 2, con: '2026-05-15', due: '2026-06-01', t1: 'imaging',           ti1: 'Echocardiogram',            p1: 'recommended',  t2: 'follow_up_consult', ti2: 'GP follow-up consult' },
  { name: 'Lakshmi Krishnan',    gender: 'F', dob: '1985-04-08', seg: 'feels_better', risk: 'low',    score: 21, wallet: 3100, chronic: false, prov: 0, con: '2026-05-18', due: '2026-06-03', t1: 'lab_test',          ti1: 'Lipid panel',               p1: 'mandatory',    t2: 'follow_up_consult', ti2: 'Endocrinology review' },
  { name: 'Rajan Thakur',        gender: 'M', dob: '1979-01-25', seg: 'lost_thread',  risk: 'medium', score: 40, wallet: 1900, chronic: false, prov: 1, con: '2026-05-21', due: '2026-06-05', t1: 'medication',        ti1: 'Start Metformin 500mg',     p1: 'mandatory',    t2: 'lab_test',          ti2: 'Fasting blood glucose' },
  { name: 'Anita Bose',          gender: 'F', dob: '1960-09-14', seg: 'forgot',       risk: 'high',   score: 68, wallet:  800, chronic: true,  prov: 2, con: '2026-05-24', due: '2026-06-07', t1: 'lab_test',          ti1: 'HbA1c blood test',          p1: 'mandatory',    t2: 'medication',        ti2: 'Continue Amlodipine 5mg' },
  { name: 'Manoj Chopra',        gender: 'M', dob: '1992-03-31', seg: 'none',         risk: 'low',    score: 15, wallet: 3800, chronic: false, prov: 0, con: '2026-05-27', due: '2026-06-09', t1: 'follow_up_consult', ti1: 'Endocrinology review',      p1: 'recommended',  t2: 'lab_test',          ti2: 'Lipid panel' },
  { name: 'Sushma Reddy',        gender: 'F', dob: '1973-07-09', seg: 'logistics',    risk: 'medium', score: 46, wallet: 2400, chronic: true,  prov: 1, con: '2026-05-30', due: '2026-06-10', t1: 'lab_test',          ti1: 'CBC with differential',     p1: 'mandatory',    t2: 'medication',        ti2: 'Start Atorvastatin 10mg' },
] as const

// ── Group B: 5 "pending completable" background members ─────────────────────
const GROUP_B = [
  { name: 'Deepika Malhotra',  gender: 'F', dob: '1980-08-19', seg: 'forgot',      risk: 'medium', score: 44, wallet: 2200, chronic: false, prov: 0, con: '2026-05-28', t1: 'lab_test',          ti1: 'HbA1c blood test',        t2: 'follow_up_consult', ti2: 'GP follow-up consult' },
  { name: 'Arun Goswami',      gender: 'M', dob: '1984-03-12', seg: 'none',        risk: 'medium', score: 39, wallet: 1800, chronic: true,  prov: 1, con: '2026-05-29', t1: 'lab_test',          ti1: 'Fasting blood glucose',   t2: 'medication',        ti2: 'Start Metformin 500mg' },
  { name: 'Sonali Patil',      gender: 'F', dob: '1988-06-25', seg: 'lost_thread', risk: 'low',    score: 25, wallet: 3000, chronic: false, prov: 2, con: '2026-05-30', t1: 'lab_test',          ti1: 'Lipid panel',             t2: 'follow_up_consult', ti2: 'Cardiologist review' },
  { name: 'Harish Nambiar',    gender: 'M', dob: '1966-11-04', seg: 'forgot',      risk: 'medium', score: 51, wallet: 1600, chronic: true,  prov: 0, con: '2026-05-31', t1: 'imaging',           ti1: 'Chest X-ray',             t2: 'lab_test',          ti2: 'Kidney function test' },
  { name: 'Rekha Choudhary',   gender: 'F', dob: '1979-02-28', seg: 'none',        risk: 'low',    score: 22, wallet: 2800, chronic: false, prov: 1, con: '2026-06-01', t1: 'follow_up_consult', ti1: 'Diabetologist follow-up', t2: 'lab_test',          ti2: 'HbA1c blood test' },
] as const

// ── Group C: 8 "structural barrier" background members ──────────────────────
const GROUP_C = [
  { name: 'Rajesh Bansal',          gender: 'M', dob: '1958-03-07', seg: 'cost',      risk: 'high',   score: 74, wallet:    0, chronic: true,  prov: 0, con: '2026-05-10', due: '2026-06-01', t1: 'lab_test',          ti1: 'HbA1c blood test',         t2: 'follow_up_consult', ti2: 'Diabetologist follow-up' },
  { name: 'Meenakshi Subramaniam',  gender: 'F', dob: '1960-09-22', seg: 'trust',     risk: 'high',   score: 70, wallet:  500, chronic: true,  prov: 2, con: '2026-05-12', due: '2026-06-02', t1: 'lab_test',          ti1: 'Thyroid function test',    t2: 'medication',        ti2: 'Start Metformin 500mg' },
  { name: 'Anil Kulkarni',          gender: 'M', dob: '1972-05-13', seg: 'cost',      risk: 'medium', score: 52, wallet: 1200, chronic: false, prov: 1, con: '2026-05-15', due: '2026-06-03', t1: 'imaging',           ti1: 'Abdominal ultrasound',     t2: 'lab_test',          ti2: 'Fasting blood glucose' },
  { name: 'Parveen Akhtar',         gender: 'M', dob: '1978-01-30', seg: 'avoidance', risk: 'medium', score: 48, wallet: 1800, chronic: false, prov: 0, con: '2026-05-18', due: '2026-06-04', t1: 'follow_up_consult', ti1: 'Cardiologist follow-up',   t2: 'medication',        ti2: 'Continue Amlodipine 5mg' },
  { name: 'Devyani Chawla',         gender: 'F', dob: '1955-11-18', seg: 'trust',     risk: 'high',   score: 81, wallet:    0, chronic: true,  prov: 2, con: '2026-05-20', due: '2026-06-05', t1: 'lab_test',          ti1: 'HbA1c blood test',         t2: 'follow_up_consult', ti2: 'Endocrinology review' },
  { name: 'Manohar Singh',          gender: 'M', dob: '1974-07-04', seg: 'cost',      risk: 'medium', score: 50, wallet: 2000, chronic: true,  prov: 1, con: '2026-05-23', due: '2026-06-06', t1: 'lab_test',          ti1: 'Lipid panel',              t2: 'medication',        ti2: 'Start Atorvastatin 10mg' },
  { name: 'Fatima Sheikh',          gender: 'F', dob: '1982-04-16', seg: 'avoidance', risk: 'medium', score: 43, wallet: 2500, chronic: false, prov: 0, con: '2026-05-26', due: '2026-06-07', t1: 'follow_up_consult', ti1: 'Diabetologist follow-up',  t2: 'lab_test',          ti2: 'HbA1c blood test' },
  { name: 'Sudhir Pandey',          gender: 'M', dob: '1968-02-09', seg: 'trust',     risk: 'medium', score: 57, wallet: 1500, chronic: true,  prov: 2, con: '2026-05-29', due: '2026-06-08', t1: 'imaging',           ti1: 'Chest X-ray',              t2: 'medication',        ti2: 'Start Atorvastatin 10mg' },
] as const

function uuid(): string {
  return crypto.randomUUID()
}

async function must<T>(
  label: string,
  result: { data: T | null; error: { message: string } | null },
): Promise<T> {
  if (result.error || result.data === null) {
    throw new Error(`[seed-demo] ${label}: ${result.error?.message ?? 'null data'}`)
  }
  return result.data
}

async function main() {
  console.log('\n[seed-demo] Starting M9 demo dataset seed…\n')

  // ── Guard: idempotency check ───────────────────────────────────────────────
  const { data: existing } = await db.from('members').select('id').eq('id', ROHAN_ID).maybeSingle()
  if (existing) {
    console.log('  ✓ M9 seed already applied — nothing to do.')
    console.log('    (Detected Rohan Mehta in members table.)\n')
    return
  }

  // ── Resolve org ────────────────────────────────────────────────────────────
  const org = await must('org lookup', await db.from('organizations').select('id').eq('name', 'Acme Corp').single())
  const orgId = org.id
  console.log(`  ✓ Acme Corp org: ${orgId}`)

  await db.from('organizations').update({ contract_lives: 12480 }).eq('id', orgId)
  console.log('  ✓ contract_lives = 12,480')

  // ── Resolve navigator ──────────────────────────────────────────────────────
  const { data: navUser } = await db.auth.admin.listUsers()
  const navId = navUser?.users.find(u => u.email === 'navigator@demo.continuum.health')?.id ?? null

  // ── Providers ──────────────────────────────────────────────────────────────
  const { data: existingMehra } = await db.from('providers').select('id').eq('full_name', 'Dr. Anil Mehra').maybeSingle()
  let mehraId: string
  if (existingMehra) {
    mehraId = existingMehra.id
  } else {
    const p = await must('create Mehra', await db.from('providers').insert({ full_name: 'Dr. Anil Mehra', specialty: 'General Practice' }).select('id').single())
    mehraId = p.id
  }

  const raoRow = await must('create Rao', await db.from('providers').insert({ full_name: 'Dr. Vikram Rao', specialty: 'Internal Medicine' }).select('id').single())
  const raoId = raoRow.id

  const bansalRow = await must('create Bansal', await db.from('providers').insert({ full_name: 'Dr. Sunita Bansal', specialty: 'Cardiology' }).select('id').single())
  const bansalId = bansalRow.id

  const provIds = [mehraId, raoId, bansalId]
  console.log('  ✓ Providers created: Dr. Anil Mehra, Dr. Vikram Rao, Dr. Sunita Bansal')

  // ── Hero 1: Rohan Mehta ────────────────────────────────────────────────────
  const rCid   = uuid()
  const rPlan  = uuid()
  const rAct   = uuid()

  await must('Rohan member', await db.from('members').insert({
    id: ROHAN_ID, org_id: orgId, full_name: 'Rohan Mehta',
    phone: '+91-98100-20001', dob: '1975-08-14', gender: 'M',
    preferred_language: 'Hindi', risk_tier: 'high', risk_score: 72,
    risk_drivers: ['Type 2 Diabetes (HbA1c 8.1%)', 'Mandatory retest pending — reports feeling better'],
    drop_segment: 'feels_better', wallet_balance: 500, is_chronic: true,
  }).select('id').single())

  await db.from('consultations').insert({
    id: rCid, member_id: ROHAN_ID, provider_id: mehraId,
    consulted_at: '2026-05-20T10:00:00Z', mode: 'tele',
    chief_complaint: 'T2DM review — improved symptoms, HbA1c retest due',
    summary: 'Patient reports improved energy. Last HbA1c 8.1% (3 months prior). Skeptical about retest — believes he is in remission. Mandatory HbA1c retest required before medication review.',
  })
  await db.from('care_plans').insert({ id: rPlan, consultation_id: rCid, member_id: ROHAN_ID, status: 'active', created_by: mehraId, created_at: '2026-05-20T10:00:00Z' })
  await db.from('care_plan_actions').insert({
    id: rAct, care_plan_id: rPlan, member_id: ROHAN_ID,
    action_type: 'lab_test', title: 'HbA1c retest (mandatory)',
    why_plain: 'Your last reading was 8.1% — above the 7% target for T2DM. A retest confirms whether lifestyle changes are working or medication needs adjustment.',
    clinical_priority: 'mandatory', provenance: 'clinician_authored',
    due_date: '2026-06-10', status: 'pending', created_at: '2026-05-20T10:00:00Z',
  })
  console.log('  ✓ Hero: Rohan Mehta (feels_better, HIGH, 1 pending mandatory)')

  // ── Hero 2: Arjun Kapoor ──────────────────────────────────────────────────
  const aCid   = uuid()
  const aPlan  = uuid()
  const aAct   = uuid()
  const aEr    = uuid()
  const aTask  = uuid()

  await must('Arjun member', await db.from('members').insert({
    id: ARJUN_ID, org_id: orgId, full_name: 'Arjun Kapoor',
    phone: '+91-98100-20002', dob: '1970-03-05', gender: 'M',
    preferred_language: 'Hindi', risk_tier: 'medium', risk_score: 58,
    risk_drivers: ['ER visit 2026-06-12 (chest pain, ACS ruled out)', 'Discharge medication reconciliation pending', 'Logistics barrier — no private transport'],
    drop_segment: 'logistics', wallet_balance: 1200, is_chronic: false,
  }).select('id').single())

  await db.from('consultations').insert({
    id: aCid, member_id: ARJUN_ID, provider_id: bansalId,
    consulted_at: '2026-06-12T09:00:00Z', mode: 'in_person',
    chief_complaint: 'ER discharge — chest pain, ACS ruled out',
    summary: 'Presented with acute chest pain. ECG and serial troponins normal — ACS excluded. Discharged with medication reconciliation instructions. Mandatory: discharge med reconciliation within 72h. Logistics barrier — arrange tele-consult.',
  })
  await db.from('care_plans').insert({ id: aPlan, consultation_id: aCid, member_id: ARJUN_ID, status: 'active', created_by: bansalId, created_at: '2026-06-12T09:00:00Z' })
  await db.from('care_plan_actions').insert({
    id: aAct, care_plan_id: aPlan, member_id: ARJUN_ID,
    action_type: 'medication', title: 'Discharge medication reconciliation',
    why_plain: 'Ensure all medications prescribed at discharge are understood and being taken. Critical within 72h of ER discharge to prevent readmission.',
    clinical_priority: 'mandatory', provenance: 'clinician_authored',
    due_date: '2026-06-12', status: 'pending', created_at: '2026-06-12T09:00:00Z',
  })
  // Pre-seed ER event (June 12, before any demo sessionStartedAt → survives reset)
  await db.from('clinical_events').insert({
    id: aEr, member_id: ARJUN_ID, event_type: 'er_visit', source: 'ambulance',
    occurred_at: '2026-06-12T10:00:00Z',
    payload: { hospital: 'Apollo Hospital, New Delhi', presenting_complaint: 'Acute chest pain', ruling_out: 'ACS excluded', discharged_at: '2026-06-12T18:00:00Z' },
  })
  // Pre-seed P1 navigator task
  await db.from('navigator_tasks').insert({
    id: aTask, member_id: ARJUN_ID, navigator_id: navId,
    trigger_reason: 'post_er_72h', priority: 'p1', status: 'open',
    notes: 'Arjun Kapoor discharged Apollo Hospital 12 Jun (chest pain, ACS ruled out). Discharge med reconciliation pending. Logistics barrier — arrange tele-consult within 72h.',
    created_at: '2026-06-12T12:00:00Z',
  })
  console.log('  ✓ Hero: Arjun Kapoor (logistics, MEDIUM, 1 pending mandatory + P1 ER task)')

  // ── Group A: 17 completed background members ──────────────────────────────
  console.log('\n  Seeding Group A (17 completed members)…')
  for (let i = 0; i < GROUP_A.length; i++) {
    const m = GROUP_A[i]
    const mid  = uuid(); const cid = uuid(); const pid = uuid()
    const a1   = uuid(); const a2  = uuid()
    const prov = provIds[m.prov]
    const ts   = `${m.con}T10:00:00Z`

    await db.from('members').insert({
      id: mid, org_id: orgId, full_name: m.name,
      phone: `+91-98100-${String(30001 + i).padStart(5, '0')}`,
      dob: m.dob, gender: m.gender, drop_segment: m.seg,
      risk_tier: m.risk, risk_score: m.score,
      risk_drivers: ['Care plan completed per schedule'],
      wallet_balance: m.wallet, is_chronic: m.chronic,
    })
    await db.from('consultations').insert({ id: cid, member_id: mid, provider_id: prov, consulted_at: ts, mode: 'tele', chief_complaint: 'Routine care review', summary: 'Annual follow-up. Care plan issued and all actions completed per clinical recommendations.' })
    await db.from('care_plans').insert({ id: pid, consultation_id: cid, member_id: mid, status: 'active', created_by: prov, created_at: ts })
    await db.from('care_plan_actions').insert([
      { id: a1, care_plan_id: pid, member_id: mid, action_type: m.t1, title: m.ti1, why_plain: 'Clinically indicated follow-up as part of annual care review.', clinical_priority: m.p1,   provenance: 'clinician_authored', due_date: m.due, status: 'completed', created_at: ts },
      { id: a2, care_plan_id: pid, member_id: mid, action_type: m.t2, title: m.ti2, why_plain: 'Recommended follow-up action per care plan — completed on schedule.', clinical_priority: 'recommended', provenance: 'clinician_authored', due_date: m.due, status: 'completed', created_at: ts },
    ])
    process.stdout.write('.')
  }
  console.log(` done (${GROUP_A.length} members, ${GROUP_A.length * 2} completed actions)`)

  // ── Group B: 5 pending completable members ────────────────────────────────
  console.log('\n  Seeding Group B (5 pending-completable members)…')
  for (let i = 0; i < GROUP_B.length; i++) {
    const m = GROUP_B[i]
    const mid  = uuid(); const cid = uuid(); const pid = uuid()
    const a1   = uuid(); const a2  = uuid()
    const prov = provIds[m.prov]
    const ts   = `${m.con}T10:00:00Z`
    const due  = '2026-06-10'

    await db.from('members').insert({
      id: mid, org_id: orgId, full_name: m.name,
      phone: `+91-98100-${String(40001 + i).padStart(5, '0')}`,
      dob: m.dob, gender: m.gender, drop_segment: m.seg,
      risk_tier: m.risk, risk_score: m.score,
      risk_drivers: ['Pending care plan actions — overdue'],
      wallet_balance: m.wallet, is_chronic: m.chronic,
    })
    await db.from('consultations').insert({ id: cid, member_id: mid, provider_id: prov, consulted_at: ts, mode: 'tele', chief_complaint: 'Routine care review', summary: 'Care plan issued. Member has not yet completed recommended actions. Follow-up nudge appropriate.' })
    await db.from('care_plans').insert({ id: pid, consultation_id: cid, member_id: mid, status: 'active', created_by: prov, created_at: ts })
    await db.from('care_plan_actions').insert([
      { id: a1, care_plan_id: pid, member_id: mid, action_type: m.t1, title: m.ti1, why_plain: 'Clinically indicated — overdue follow-up requiring completion.', clinical_priority: 'mandatory', provenance: 'clinician_authored', due_date: due, status: 'pending', created_at: ts },
      { id: a2, care_plan_id: pid, member_id: mid, action_type: m.t2, title: m.ti2, why_plain: 'Recommended follow-up action — overdue.', clinical_priority: 'mandatory', provenance: 'clinician_authored', due_date: due, status: 'pending', created_at: ts },
    ])
    process.stdout.write('.')
  }
  console.log(` done (${GROUP_B.length} members, ${GROUP_B.length * 2} pending actions)`)

  // ── Group C: 8 structural barrier members ────────────────────────────────
  console.log('\n  Seeding Group C (8 structural-barrier members)…')
  const segDrivers: Record<string, string[]> = {
    cost:      ['Structural cost barrier — wallet empty or insufficient', 'Mandatory care plan action pending'],
    avoidance: ['Side-effect anxiety — avoidance pattern', 'Mandatory care plan action pending'],
    trust:     ['Low trust in digital health systems', 'Mandatory care plan action pending'],
  }
  const segSummary: Record<string, string> = {
    cost:      'Care plan issued. Member flagged cost barrier. Automated nudge suppressed; navigator engagement required to explore employer subsidy options.',
    avoidance: 'Care plan issued. Member expressed significant anxiety about side effects. Automated nudge suppressed; navigator support required.',
    trust:     'Care plan issued. Member expressed concerns about digital data privacy. Automated nudge suppressed; human navigator follow-up required.',
  }

  for (let i = 0; i < GROUP_C.length; i++) {
    const m = GROUP_C[i]
    const mid  = uuid(); const cid = uuid(); const pid = uuid()
    const a1   = uuid(); const a2  = uuid()
    const prov = provIds[m.prov]
    const ts   = `${m.con}T10:00:00Z`

    await db.from('members').insert({
      id: mid, org_id: orgId, full_name: m.name,
      phone: `+91-98100-${String(50001 + i).padStart(5, '0')}`,
      dob: m.dob, gender: m.gender, drop_segment: m.seg,
      risk_tier: m.risk, risk_score: m.score,
      risk_drivers: segDrivers[m.seg] ?? [],
      wallet_balance: m.wallet, is_chronic: m.chronic,
    })
    await db.from('consultations').insert({ id: cid, member_id: mid, provider_id: prov, consulted_at: ts, mode: 'tele', chief_complaint: 'Routine care review', summary: segSummary[m.seg] ?? '' })
    await db.from('care_plans').insert({ id: pid, consultation_id: cid, member_id: mid, status: 'active', created_by: prov, created_at: ts })
    await db.from('care_plan_actions').insert([
      { id: a1, care_plan_id: pid, member_id: mid, action_type: m.t1, title: m.ti1, why_plain: 'Mandatory clinical follow-up — requires navigator support to address structural barrier.', clinical_priority: 'mandatory', provenance: 'clinician_authored', due_date: m.due, status: 'pending', created_at: ts },
      { id: a2, care_plan_id: pid, member_id: mid, action_type: m.t2, title: m.ti2, why_plain: 'Recommended follow-up — pending navigator engagement to resolve barrier.', clinical_priority: 'mandatory', provenance: 'clinician_authored', due_date: m.due, status: 'pending', created_at: ts },
    ])
    process.stdout.write('.')
  }
  console.log(` done (${GROUP_C.length} members, ${GROUP_C.length * 2} pending actions)`)

  console.log('\n' + '─'.repeat(60))
  console.log('  M9 seed complete.')
  console.log('  Members added    : 32 (2 heroes + 17 completed + 5 completable + 8 structural)')
  console.log('  Actions added    : 62')
  console.log('  Pre-sim target   : ~54% completion (36/67 total active)')
  console.log('  Post-7-day-sim   : ~71% completion (+10–12 completions from sim)')
  console.log('  Navigator tasks  : 4 open now → ~14 after 7-day sim run')
  console.log('─'.repeat(60) + '\n')
}

main().catch(e => { console.error('\n[seed-demo] Fatal error:', e); process.exit(1) })
