-- ============================================================================
-- Continuum — M9 Demo Dataset
-- Run in Lovable SQL Editor AFTER 002_demo_seed.sql.
-- Idempotent: guarded by Rohan Mehta's explicit member UUID.
--
-- Adds 32 members and 62 care plan actions under Acme Corp.
-- Data targets:
--   Pre-sim completion rate  ≈ 54%  (36 completed / 67 total active)
--   Post-7-day-sim rate      ≈ 71%  (+10–12 completions from pending)
--   Navigator tasks at seed  = 4 open (P1 Meera + P1 Arjun + P2 Rahul + P2 Deepak)
--   After 7-day sim          ≈ 14 open (structural members auto-generate tasks)
-- ============================================================================

DO $$
DECLARE
  _org_id   UUID;
  _nav_id   UUID;
  _p_mehra  UUID;
  _p_rao    UUID;
  _p_bansal UUID;

  -- Hero member explicit UUIDs (checked for idempotency)
  _rohan UUID := '22222222-1111-0000-0000-000000000001';
  _arjun UUID := '22222222-1111-0000-0000-000000000002';

  -- Hero working vars
  _rc UUID; _rplan UUID; _ra1 UUID;
  _ac UUID; _aplan UUID; _aa1 UUID;
  _aer UUID; _atask UUID;

  -- Loop temporaries
  _mid  UUID;
  _cid  UUID;
  _pid  UUID;
  _a1   UUID;
  _a2   UUID;
  _prov UUID;
  i     INT;

  -- ── Group A: 17 background members — all actions COMPLETED ────────────────
  -- Each gets 2 completed actions (mandatory + recommended).
  -- Mix of segments to show breadth; risk tiers reflect resolved cases.
  _a_names TEXT[] := ARRAY[
    'Priyanka Desai','Sanjay Kumar','Nandita Rao','Vikram Pillai','Asha Mehta',
    'Rohit Sharma','Sunita Patel','Aditya Singh','Kavya Nair','Ramesh Iyer',
    'Geeta Verma','Suresh Joshi','Lakshmi Krishnan','Rajan Thakur',
    'Anita Bose','Manoj Chopra','Sushma Reddy'
  ];
  _a_genders TEXT[] := ARRAY[
    'F','M','F','M','F','M','F','M','F','M','F','M','F','M','F','M','F'
  ];
  _a_dobs TEXT[] := ARRAY[
    '1986-04-12','1975-09-23','1988-11-07','1978-02-19','1970-06-30',
    '1995-01-14','1980-08-05','1990-03-27','1994-12-03','1956-07-11',
    '1968-05-22','1976-10-16','1985-04-08','1979-01-25',
    '1960-09-14','1992-03-31','1973-07-09'
  ];
  _a_segs TEXT[] := ARRAY[
    'forgot','logistics','feels_better','none','lost_thread',
    'forgot','logistics','none','feels_better','forgot',
    'none','logistics','feels_better','lost_thread',
    'forgot','none','logistics'
  ];
  _a_risk TEXT[] := ARRAY[
    'medium','low','low','medium','medium',
    'medium','low','medium','low','high',
    'medium','medium','low','medium',
    'high','low','medium'
  ];
  _a_scores INT[] := ARRAY[
    42,18,22,45,38,44,20,41,19,71,43,47,21,40,68,15,46
  ];
  _a_wallets INT[] := ARRAY[
    2500,1800,3200,2000,1500,2800,3000,2200,3500,1000,
    2100,2700,3100,1900,800,3800,2400
  ];
  _a_chronic BOOL[] := ARRAY[
    false,false,false,true,false,false,false,false,false,true,
    true,false,false,false,true,false,true
  ];
  _a_type1 TEXT[] := ARRAY[
    'lab_test','follow_up_consult','lab_test','imaging','follow_up_consult',
    'lab_test','lab_test','vaccination','lab_test','lab_test',
    'follow_up_consult','imaging','lab_test','medication',
    'lab_test','follow_up_consult','lab_test'
  ];
  _a_title1 TEXT[] := ARRAY[
    'HbA1c blood test','GP follow-up consult','Lipid panel',
    'Chest X-ray','Cardiologist review','Fasting blood glucose',
    'Kidney function test','Hepatitis B vaccination','Thyroid function test',
    'HbA1c blood test','Diabetologist follow-up','Echocardiogram',
    'Lipid panel','Start Metformin 500mg','HbA1c blood test',
    'Endocrinology review','CBC with differential'
  ];
  _a_pri1 TEXT[] := ARRAY[
    'mandatory','mandatory','mandatory','recommended','mandatory',
    'mandatory','mandatory','recommended','mandatory','mandatory',
    'mandatory','recommended','mandatory','mandatory',
    'mandatory','recommended','mandatory'
  ];
  _a_type2 TEXT[] := ARRAY[
    'medication','medication','follow_up_consult','medication','medication',
    'medication','follow_up_consult','medication','follow_up_consult','medication',
    'medication','follow_up_consult','follow_up_consult','lab_test',
    'medication','lab_test','medication'
  ];
  _a_title2 TEXT[] := ARRAY[
    'Start Atorvastatin 10mg','Continue Amlodipine 5mg','GP follow-up consult',
    'Start Atorvastatin 10mg','Start Aspirin 75mg','Continue Metformin 500mg',
    'Cardiologist follow-up','Continue Aspirin 75mg','GP follow-up consult',
    'Start Metformin 500mg','Start Atorvastatin 10mg','GP follow-up consult',
    'Endocrinology review','Fasting blood glucose','Continue Amlodipine 5mg',
    'Lipid panel','Start Atorvastatin 10mg'
  ];
  _a_prov_idx INT[] := ARRAY[
    1,2,3,1,2,3,1,2,3,1,2,3,1,2,3,1,2
  ];
  _a_con_day TEXT[] := ARRAY[
    '2026-04-03','2026-04-07','2026-04-11','2026-04-15','2026-04-19',
    '2026-04-23','2026-04-27','2026-05-01','2026-05-05','2026-05-09',
    '2026-05-12','2026-05-15','2026-05-18','2026-05-21',
    '2026-05-24','2026-05-27','2026-05-30'
  ];
  _a_due TEXT[] := ARRAY[
    '2026-05-10','2026-05-12','2026-05-14','2026-05-16','2026-05-18',
    '2026-05-20','2026-05-22','2026-05-24','2026-05-26','2026-05-28',
    '2026-05-30','2026-06-01','2026-06-03','2026-06-05',
    '2026-06-07','2026-06-09','2026-06-10'
  ];

  -- ── Group B: 5 background members — pending COMPLETABLE ───────────────────
  -- Segments: forgot / none / lost_thread → COMPLETION_PROB ≥ 0.45/day.
  -- Due 2026-06-10 (overdue when sim starts at 2026-06-14).
  -- Expected: ~10/10 actions complete in 7-day sim.
  _b_names TEXT[] := ARRAY[
    'Deepika Malhotra','Arun Goswami','Sonali Patil','Harish Nambiar','Rekha Choudhary'
  ];
  _b_genders TEXT[] := ARRAY['F','M','F','M','F'];
  _b_dobs TEXT[] := ARRAY[
    '1980-08-19','1984-03-12','1988-06-25','1966-11-04','1979-02-28'
  ];
  _b_segs TEXT[] := ARRAY['forgot','none','lost_thread','forgot','none'];
  _b_risk TEXT[] := ARRAY['medium','medium','low','medium','low'];
  _b_scores INT[] := ARRAY[44,39,25,51,22];
  _b_wallets INT[] := ARRAY[2200,1800,3000,1600,2800];
  _b_chronic BOOL[] := ARRAY[false,true,false,true,false];
  _b_type1 TEXT[] := ARRAY[
    'lab_test','lab_test','lab_test','imaging','follow_up_consult'
  ];
  _b_title1 TEXT[] := ARRAY[
    'HbA1c blood test','Fasting blood glucose','Lipid panel',
    'Chest X-ray','Diabetologist follow-up'
  ];
  _b_type2 TEXT[] := ARRAY[
    'follow_up_consult','medication','follow_up_consult','lab_test','lab_test'
  ];
  _b_title2 TEXT[] := ARRAY[
    'GP follow-up consult','Start Metformin 500mg','Cardiologist review',
    'Kidney function test','HbA1c blood test'
  ];
  _b_prov_idx INT[] := ARRAY[1,2,3,1,2];
  _b_con_day TEXT[] := ARRAY[
    '2026-05-28','2026-05-29','2026-05-30','2026-05-31','2026-06-01'
  ];

  -- ── Group C: 8 background members — pending STRUCTURAL ────────────────────
  -- Segments: cost / avoidance / trust → nudge engine suppresses.
  -- Actions are overdue at sim start; nudge engine creates navigator tasks.
  -- Expected: 0 completions (structural barriers).
  _c_names TEXT[] := ARRAY[
    'Rajesh Bansal','Meenakshi Subramaniam','Anil Kulkarni','Parveen Akhtar',
    'Devyani Chawla','Manohar Singh','Fatima Sheikh','Sudhir Pandey'
  ];
  _c_genders TEXT[] := ARRAY['M','F','M','M','F','M','F','M'];
  _c_dobs TEXT[] := ARRAY[
    '1958-03-07','1960-09-22','1972-05-13','1978-01-30',
    '1955-11-18','1974-07-04','1982-04-16','1968-02-09'
  ];
  _c_segs TEXT[] := ARRAY[
    'cost','trust','cost','avoidance','trust','cost','avoidance','trust'
  ];
  _c_risk TEXT[] := ARRAY[
    'high','high','medium','medium','high','medium','medium','medium'
  ];
  _c_scores INT[] := ARRAY[74,70,52,48,81,50,43,57];
  _c_wallets INT[] := ARRAY[0,500,1200,1800,0,2000,2500,1500];
  _c_chronic BOOL[] := ARRAY[true,true,false,false,true,true,false,true];
  _c_type1 TEXT[] := ARRAY[
    'lab_test','lab_test','imaging','follow_up_consult',
    'lab_test','lab_test','follow_up_consult','imaging'
  ];
  _c_title1 TEXT[] := ARRAY[
    'HbA1c blood test','Thyroid function test','Abdominal ultrasound',
    'Cardiologist follow-up','HbA1c blood test','Lipid panel',
    'Diabetologist follow-up','Chest X-ray'
  ];
  _c_type2 TEXT[] := ARRAY[
    'follow_up_consult','medication','lab_test','medication',
    'follow_up_consult','medication','lab_test','medication'
  ];
  _c_title2 TEXT[] := ARRAY[
    'Diabetologist follow-up','Start Metformin 500mg','Fasting blood glucose',
    'Continue Amlodipine 5mg','Endocrinology review','Start Atorvastatin 10mg',
    'HbA1c blood test','Start Atorvastatin 10mg'
  ];
  _c_prov_idx INT[] := ARRAY[1,3,2,1,3,2,1,3];
  _c_con_day TEXT[] := ARRAY[
    '2026-05-10','2026-05-12','2026-05-15','2026-05-18',
    '2026-05-20','2026-05-23','2026-05-26','2026-05-29'
  ];
  _c_due TEXT[] := ARRAY[
    '2026-06-01','2026-06-02','2026-06-03','2026-06-04',
    '2026-06-05','2026-06-06','2026-06-07','2026-06-08'
  ];

BEGIN
  -- ── Guard: skip if already seeded ─────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM members WHERE id = _rohan) THEN
    RAISE NOTICE 'M9 seed already applied — skipping.';
    RETURN;
  END IF;

  -- ── Resolve org ───────────────────────────────────────────────────────────
  SELECT id INTO _org_id FROM organizations WHERE name = 'Acme Corp';
  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'Acme Corp not found. Run scripts/setup-demo-users.ts first.';
  END IF;

  -- Update contract lives for the employer dashboard KPI
  UPDATE organizations SET contract_lives = 12480 WHERE id = _org_id;

  -- ── Resolve navigator auth user ────────────────────────────────────────────
  SELECT id INTO _nav_id FROM auth.users WHERE email = 'navigator@demo.continuum.health';

  -- ── Providers ─────────────────────────────────────────────────────────────
  SELECT id INTO _p_mehra FROM providers WHERE full_name = 'Dr. Anil Mehra';
  IF _p_mehra IS NULL THEN
    INSERT INTO providers (full_name, specialty)
    VALUES ('Dr. Anil Mehra', 'General Practice')
    RETURNING id INTO _p_mehra;
  END IF;

  INSERT INTO providers (full_name, specialty)
  VALUES ('Dr. Vikram Rao', 'Internal Medicine')
  RETURNING id INTO _p_rao;

  INSERT INTO providers (full_name, specialty)
  VALUES ('Dr. Sunita Bansal', 'Cardiology')
  RETURNING id INTO _p_bansal;

  -- ══════════════════════════════════════════════════════════════════════════
  -- HERO 1: Rohan Mehta — feels_better, HIGH, 1 mandatory pending
  -- Narrative: T2DM patient who feels better and resists retest.
  -- Sim: 15% completion/day × 7 days ≈ 67% chance of completing.
  --      If he declines → advance-simulation creates P1 declined_mandatory task.
  -- ══════════════════════════════════════════════════════════════════════════
  _rc    := gen_random_uuid();
  _rplan := gen_random_uuid();
  _ra1   := gen_random_uuid();

  INSERT INTO members (id, org_id, full_name, phone, dob, gender, preferred_language,
                       risk_tier, risk_score, risk_drivers, drop_segment, wallet_balance, is_chronic)
  VALUES (
    _rohan, _org_id, 'Rohan Mehta', '+91-98100-20001', '1975-08-14', 'M', 'Hindi',
    'high', 72,
    '["Type 2 Diabetes (HbA1c 8.1%)", "Mandatory retest pending — reports feeling better"]'::jsonb,
    'feels_better', 500, true
  );

  INSERT INTO consultations (id, member_id, provider_id, consulted_at, mode, chief_complaint, summary)
  VALUES (
    _rc, _rohan, _p_mehra, '2026-05-20T10:00:00Z', 'tele',
    'T2DM review — improved symptoms, HbA1c retest due',
    'Patient reports improved energy. Last HbA1c 8.1% (3 months prior). Skeptical about retest — believes he is in remission. Clinical note: subjective improvement does not confirm glycaemic control. Mandatory HbA1c retest required before medication review.'
  );

  INSERT INTO care_plans (id, consultation_id, member_id, status, created_by, created_at)
  VALUES (_rplan, _rc, _rohan, 'active', _p_mehra, '2026-05-20T10:00:00Z');

  INSERT INTO care_plan_actions (id, care_plan_id, member_id, action_type, title, why_plain,
                                  clinical_priority, provenance, due_date, status, created_at)
  VALUES (
    _ra1, _rplan, _rohan, 'lab_test',
    'HbA1c retest (mandatory)',
    'Your last reading was 8.1% — above the 7% target for T2DM. A retest confirms whether lifestyle changes are working or medication needs adjustment. Feeling better is a positive sign, but blood sugar must be verified.',
    'mandatory', 'clinician_authored', '2026-06-10', 'pending', '2026-05-20T10:00:00Z'
  );

  -- ══════════════════════════════════════════════════════════════════════════
  -- HERO 2: Arjun Kapoor — logistics, MEDIUM, 1 mandatory pending + pre-seeded ER
  -- Narrative: discharged after chest pain scare, logistics barrier.
  -- ER event seeded at 2026-06-12 (2 days before sim start) → P1 task at seed.
  -- ══════════════════════════════════════════════════════════════════════════
  _ac    := gen_random_uuid();
  _aplan := gen_random_uuid();
  _aa1   := gen_random_uuid();
  _aer   := gen_random_uuid();
  _atask := gen_random_uuid();

  INSERT INTO members (id, org_id, full_name, phone, dob, gender, preferred_language,
                       risk_tier, risk_score, risk_drivers, drop_segment, wallet_balance, is_chronic)
  VALUES (
    _arjun, _org_id, 'Arjun Kapoor', '+91-98100-20002', '1970-03-05', 'M', 'Hindi',
    'medium', 58,
    '["ER visit 2026-06-12 (chest pain, ruled out ACS)", "Discharge medication reconciliation pending", "Logistics barrier — no private transport"]'::jsonb,
    'logistics', 1200, false
  );

  INSERT INTO consultations (id, member_id, provider_id, consulted_at, mode, chief_complaint, summary)
  VALUES (
    _ac, _arjun, _p_bansal, '2026-06-12T09:00:00Z', 'in_person',
    'ER discharge — chest pain, ACS ruled out',
    'Patient presented to Apollo Hospital with acute chest pain. ECG and serial troponins normal. ACS excluded. Discharged with medication reconciliation and 72h follow-up instructions. Mandatory: discharge medication reconciliation within 72h. Patient has logistics barrier — no transport to clinic, recommend tele-consult.'
  );

  INSERT INTO care_plans (id, consultation_id, member_id, status, created_by, created_at)
  VALUES (_aplan, _ac, _arjun, 'active', _p_bansal, '2026-06-12T09:00:00Z');

  INSERT INTO care_plan_actions (id, care_plan_id, member_id, action_type, title, why_plain,
                                  clinical_priority, provenance, due_date, status, created_at)
  VALUES (
    _aa1, _aplan, _arjun, 'medication',
    'Discharge medication reconciliation',
    'Ensure all medications prescribed at discharge are understood and being taken. Critical within 72h of ER discharge to prevent readmission. Includes: reviewing new prescriptions, checking interactions with existing medications.',
    'mandatory', 'clinician_authored', '2026-06-12', 'pending', '2026-06-12T09:00:00Z'
  );

  -- Pre-seed ER clinical event (June 12 — 2 days before sim start)
  -- occurred_at < any demo sessionStartedAt → survives reset
  INSERT INTO clinical_events (id, member_id, event_type, source, linked_action_id, occurred_at, payload)
  VALUES (
    _aer, _arjun, 'er_visit', 'ambulance', NULL, '2026-06-12T10:00:00Z',
    '{"hospital": "Apollo Hospital, New Delhi", "presenting_complaint": "Acute chest pain, palpitations", "ruling_out": "ACS excluded — ECG normal, troponins ×3 negative", "discharged_at": "2026-06-12T18:00:00Z"}'::jsonb
  );

  -- Pre-seed P1 navigator task (created June 12 → survives reset)
  INSERT INTO navigator_tasks (id, member_id, navigator_id, trigger_reason, priority, status, notes, created_at)
  VALUES (
    _atask, _arjun, _nav_id, 'post_er_72h', 'p1', 'open',
    'Arjun Kapoor discharged Apollo Hospital 12 Jun after chest pain (ACS ruled out). Discharge medication reconciliation pending. Logistics barrier — no personal transport. Arrange tele-consult or home visit within 72h window.',
    '2026-06-12T12:00:00Z'
  );

  -- ══════════════════════════════════════════════════════════════════════════
  -- GROUP A: 17 background members — all actions COMPLETED
  -- These represent the Acme Corp members who completed care plans in Q1-Q2.
  -- Contributes 34 completed actions to the pre-sim numerator.
  -- ══════════════════════════════════════════════════════════════════════════
  FOR i IN 1..17 LOOP
    _mid := gen_random_uuid();
    _cid := gen_random_uuid();
    _pid := gen_random_uuid();
    _a1  := gen_random_uuid();
    _a2  := gen_random_uuid();

    _prov := CASE _a_prov_idx[i]
               WHEN 1 THEN _p_mehra
               WHEN 2 THEN _p_rao
               ELSE _p_bansal
             END;

    INSERT INTO members (id, org_id, full_name, phone, dob, gender,
                          drop_segment, risk_tier, risk_score, risk_drivers,
                          wallet_balance, is_chronic)
    VALUES (
      _mid, _org_id, _a_names[i],
      '+91-98100-' || LPAD((30000 + i)::text, 5, '0'),
      _a_dobs[i]::date, _a_genders[i],
      _a_segs[i]::drop_segment, _a_risk[i]::risk_tier, _a_scores[i],
      '["Care plan completed per schedule"]'::jsonb,
      _a_wallets[i], _a_chronic[i]
    );

    INSERT INTO consultations (id, member_id, provider_id, consulted_at, mode,
                                chief_complaint, summary)
    VALUES (
      _cid, _mid, _prov,
      (_a_con_day[i] || 'T10:00:00Z')::timestamptz,
      'tele', 'Routine care review',
      'Annual follow-up completed. Care plan issued and all actions completed per clinical recommendations.'
    );

    INSERT INTO care_plans (id, consultation_id, member_id, status, created_by, created_at)
    VALUES (
      _pid, _cid, _mid, 'active', _prov,
      (_a_con_day[i] || 'T10:00:00Z')::timestamptz
    );

    INSERT INTO care_plan_actions
      (id, care_plan_id, member_id, action_type, title, why_plain,
       clinical_priority, provenance, due_date, status, created_at)
    VALUES
      (_a1, _pid, _mid, _a_type1[i]::action_type, _a_title1[i],
       'Clinically indicated follow-up as part of annual care review.',
       _a_pri1[i]::clinical_priority, 'clinician_authored',
       _a_due[i]::date, 'completed',
       (_a_con_day[i] || 'T10:00:00Z')::timestamptz),
      (_a2, _pid, _mid, _a_type2[i]::action_type, _a_title2[i],
       'Recommended follow-up action per care plan — completed on schedule.',
       'recommended', 'clinician_authored',
       _a_due[i]::date, 'completed',
       (_a_con_day[i] || 'T10:00:00Z')::timestamptz);
  END LOOP;

  -- ══════════════════════════════════════════════════════════════════════════
  -- GROUP B: 5 background members — pending COMPLETABLE
  -- Segments: forgot / none / lost_thread → nudge engine fires.
  -- Due 2026-06-10 → overdue when sim starts at 2026-06-14.
  -- Completion probability ≥ 0.45/day → nearly all complete in 7-day run.
  -- ══════════════════════════════════════════════════════════════════════════
  FOR i IN 1..5 LOOP
    _mid := gen_random_uuid();
    _cid := gen_random_uuid();
    _pid := gen_random_uuid();
    _a1  := gen_random_uuid();
    _a2  := gen_random_uuid();

    _prov := CASE _b_prov_idx[i]
               WHEN 1 THEN _p_mehra
               WHEN 2 THEN _p_rao
               ELSE _p_bansal
             END;

    INSERT INTO members (id, org_id, full_name, phone, dob, gender,
                          drop_segment, risk_tier, risk_score, risk_drivers,
                          wallet_balance, is_chronic)
    VALUES (
      _mid, _org_id, _b_names[i],
      '+91-98100-' || LPAD((40000 + i)::text, 5, '0'),
      _b_dobs[i]::date, _b_genders[i],
      _b_segs[i]::drop_segment, _b_risk[i]::risk_tier, _b_scores[i],
      '["Pending care plan actions — overdue"]'::jsonb,
      _b_wallets[i], _b_chronic[i]
    );

    INSERT INTO consultations (id, member_id, provider_id, consulted_at, mode,
                                chief_complaint, summary)
    VALUES (
      _cid, _mid, _prov,
      (_b_con_day[i] || 'T10:00:00Z')::timestamptz,
      'tele', 'Routine care review',
      'Care plan issued. Member has not yet completed recommended actions. Follow-up nudge appropriate.'
    );

    INSERT INTO care_plans (id, consultation_id, member_id, status, created_by, created_at)
    VALUES (
      _pid, _cid, _mid, 'active', _prov,
      (_b_con_day[i] || 'T10:00:00Z')::timestamptz
    );

    -- Both actions pending, due before sim start → overdue from Day 1 of sim
    INSERT INTO care_plan_actions
      (id, care_plan_id, member_id, action_type, title, why_plain,
       clinical_priority, provenance, due_date, status, created_at)
    VALUES
      (_a1, _pid, _mid, _b_type1[i]::action_type, _b_title1[i],
       'Clinically indicated — overdue follow-up requiring completion.',
       'mandatory', 'clinician_authored',
       '2026-06-10', 'pending',
       (_b_con_day[i] || 'T10:00:00Z')::timestamptz),
      (_a2, _pid, _mid, _b_type2[i]::action_type, _b_title2[i],
       'Recommended follow-up action — overdue.',
       'mandatory', 'clinician_authored',
       '2026-06-10', 'pending',
       (_b_con_day[i] || 'T10:00:00Z')::timestamptz);
  END LOOP;

  -- ══════════════════════════════════════════════════════════════════════════
  -- GROUP C: 8 background members — pending STRUCTURAL (no completion expected)
  -- Segments: cost / avoidance / trust → nudge engine suppresses.
  -- Suppression creates navigator tasks during sim run → drives worklist to ~14.
  -- ══════════════════════════════════════════════════════════════════════════
  FOR i IN 1..8 LOOP
    _mid := gen_random_uuid();
    _cid := gen_random_uuid();
    _pid := gen_random_uuid();
    _a1  := gen_random_uuid();
    _a2  := gen_random_uuid();

    _prov := CASE _c_prov_idx[i]
               WHEN 1 THEN _p_mehra
               WHEN 2 THEN _p_rao
               ELSE _p_bansal
             END;

    INSERT INTO members (id, org_id, full_name, phone, dob, gender,
                          drop_segment, risk_tier, risk_score, risk_drivers,
                          wallet_balance, is_chronic)
    VALUES (
      _mid, _org_id, _c_names[i],
      '+91-98100-' || LPAD((50000 + i)::text, 5, '0'),
      _c_dobs[i]::date, _c_genders[i],
      _c_segs[i]::drop_segment, _c_risk[i]::risk_tier, _c_scores[i],
      CASE _c_segs[i]
        WHEN 'cost'      THEN '["Structural cost barrier — wallet empty or insufficient", "Mandatory care plan action pending"]'
        WHEN 'avoidance' THEN '["Side-effect anxiety — avoidance pattern", "Mandatory care plan action pending"]'
        ELSE                  '["Low trust in digital health systems", "Mandatory care plan action pending"]'
      END::jsonb,
      _c_wallets[i], _c_chronic[i]
    );

    INSERT INTO consultations (id, member_id, provider_id, consulted_at, mode,
                                chief_complaint, summary)
    VALUES (
      _cid, _mid, _prov,
      (_c_con_day[i] || 'T10:00:00Z')::timestamptz,
      'tele', 'Routine care review',
      CASE _c_segs[i]
        WHEN 'cost'      THEN 'Care plan issued. Member flagged cost as primary barrier — wallet balance insufficient. Automated nudge suppressed; navigator engagement required to explore employer subsidy options.'
        WHEN 'avoidance' THEN 'Care plan issued. Member expressed significant anxiety about side effects. Automated nudge suppressed; navigator support required for trust-building and barrier resolution.'
        ELSE                  'Care plan issued. Member expressed concerns about digital data privacy. Automated nudge suppressed; human navigator follow-up required in preferred communication channel.'
      END
    );

    INSERT INTO care_plans (id, consultation_id, member_id, status, created_by, created_at)
    VALUES (
      _pid, _cid, _mid, 'active', _prov,
      (_c_con_day[i] || 'T10:00:00Z')::timestamptz
    );

    -- Both actions pending, overdue before sim start
    INSERT INTO care_plan_actions
      (id, care_plan_id, member_id, action_type, title, why_plain,
       clinical_priority, provenance, due_date, status, created_at)
    VALUES
      (_a1, _pid, _mid, _c_type1[i]::action_type, _c_title1[i],
       'Mandatory clinical follow-up — requires navigator support to address structural barrier.',
       'mandatory', 'clinician_authored',
       _c_due[i]::date, 'pending',
       (_c_con_day[i] || 'T10:00:00Z')::timestamptz),
      (_a2, _pid, _mid, _c_type2[i]::action_type, _c_title2[i],
       'Recommended follow-up — pending navigator engagement to resolve barrier.',
       'mandatory', 'clinician_authored',
       _c_due[i]::date, 'pending',
       (_c_con_day[i] || 'T10:00:00Z')::timestamptz);
  END LOOP;

  RAISE NOTICE 'M9 seed complete. 32 new members, 62 new care plan actions.';
  RAISE NOTICE 'Pre-sim completion rate target: ~54%% (36 completed / 67 total active).';
  RAISE NOTICE 'Post-7-day-sim target: ~71%% (~10–12 completions from pending).';
  RAISE NOTICE 'Navigator tasks at seed: 4 open (run advance-simulation to grow to ~14).';

END $$;

-- ============================================================================
-- Verify (run these SELECT statements to confirm):
-- SELECT count(*) FROM members WHERE org_id = (SELECT id FROM organizations WHERE name = 'Acme Corp');
--   → ≥ 37 (5 from M1 + 32 from M9)
-- SELECT count(*) FROM care_plan_actions WHERE status = 'completed'
--   AND member_id IN (SELECT id FROM members WHERE org_id = (SELECT id FROM organizations WHERE name = 'Acme Corp'));
--   → 36 (2 from M1 Ananya + 34 from M9 Group A)
-- SELECT count(*) FROM navigator_tasks WHERE status = 'open';
--   → 4 (P1 Meera + P1 Arjun + P2 Rahul + P2 Deepak)
-- SELECT contract_lives FROM organizations WHERE name = 'Acme Corp';
--   → 12480
-- ============================================================================
