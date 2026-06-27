-- ============================================================================
-- Continuum — Demo Seed Data (M1)
-- Run in Lovable SQL Editor AFTER 001_init.sql and AFTER running
-- scripts/setup-demo-users.ts (so auth.users + profiles exist).
-- Safe to re-run — all inserts use ON CONFLICT DO NOTHING on explicit UUIDs.
-- ============================================================================

-- ========== STEP 0: Pin sim clock to a stable demo date ==========
-- Keeps all relative "overdue" / "upcoming" labels consistent.
UPDATE sim_state SET current_day = current_date, updated_at = now() WHERE id = 1;

-- ========== STEP 1: Members ==========
-- Using explicit UUIDs so this file is idempotent.
INSERT INTO members (id, org_id, full_name, phone, dob, gender, preferred_language,
                     risk_tier, risk_score, risk_drivers, drop_segment, wallet_balance, is_chronic)
VALUES
  -- Primary demo patient (linked to patient@demo.continuum.health below)
  ('11111111-0000-0000-0000-000000000001',
   (SELECT id FROM organizations WHERE name = 'Acme Corp'),
   'Ananya Sharma', '+91-98100-11001', '1990-03-14', 'F', 'English',
   'medium', 42,
   '["Borderline HbA1c 5.9%", "Missed HbA1c retest"]'::jsonb,
   'forgot', 3500, false),

  -- Navigator worklist: high-risk, cost barrier
  ('11111111-0000-0000-0000-000000000002',
   (SELECT id FROM organizations WHERE name = 'Acme Corp'),
   'Rahul Nair', '+91-98100-11002', '1978-07-22', 'M', 'English',
   'high', 78,
   '["Type 2 Diabetes", "Missed 3 consecutive follow-ups", "Cost barrier identified"]'::jsonb,
   'cost', 0, true),

  -- Low-risk, feels-better drop-off
  ('11111111-0000-0000-0000-000000000003',
   (SELECT id FROM organizations WHERE name = 'Acme Corp'),
   'Kavita Singh', '+91-98100-11003', '1985-11-05', 'F', 'Hindi',
   'low', 18,
   '["Occasional fatigue", "Reported feeling better — drop-off risk"]'::jsonb,
   'feels_better', 2000, false),

  -- Medium-risk, logistics barrier + recent ER visit
  ('11111111-0000-0000-0000-000000000004',
   (SELECT id FROM organizations WHERE name = 'Acme Corp'),
   'Deepak Verma', '+91-98100-11004', '1965-01-30', 'M', 'Hindi',
   'medium', 55,
   '["ER visit 72h ago (chest pain)", "Logistics barrier — no transport"]'::jsonb,
   'logistics', 1500, true),

  -- High-risk, trust barrier + declined mandatory test
  ('11111111-0000-0000-0000-000000000005',
   (SELECT id FROM organizations WHERE name = 'Acme Corp'),
   'Meera Pillai', '+91-98100-11005', '1972-09-18', 'F', 'Malayalam',
   'high', 81,
   '["Hypertension Stage 2", "Declined mandatory HbA1c test", "Expressed distrust of digital health"]'::jsonb,
   'trust', 4000, true)

ON CONFLICT (id) DO NOTHING;

-- ========== STEP 2: Link patient@demo profile → Ananya Sharma ==========
-- No-op if setup-demo-users.ts has not been run yet.
UPDATE profiles
   SET member_id = '11111111-0000-0000-0000-000000000001'
 WHERE id = (SELECT id FROM auth.users WHERE email = 'patient@demo.continuum.health');

-- ========== STEP 3: Consultations ==========
INSERT INTO consultations (id, member_id, provider_id, consulted_at, mode, chief_complaint, summary)
VALUES
  -- Ananya — the primary demo consultation (design ref: "Dr. Mehra, 12 Jun")
  ('22222222-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   (SELECT id FROM providers WHERE full_name = 'Dr. Anil Mehra'),
   (current_date - interval '15 days')::timestamptz,
   'tele',
   'Fatigue and borderline HbA1c on routine check-up',
   'Patient presents with fatigue over 4 weeks. Routine bloods show HbA1c 5.9% (borderline). FBS 108 mg/dL. BP normal. No medication currently. Plan: repeat HbA1c + fasting BG in 2 weeks; Endo referral if not improved; lifestyle counselling re diet + activity.'),

  -- Rahul — missed follow-up, needs navigator
  ('22222222-0000-0000-0000-000000000003',
   '11111111-0000-0000-0000-000000000002',
   (SELECT id FROM providers WHERE full_name = 'Dr. Anil Mehra'),
   (current_date - interval '30 days')::timestamptz,
   'tele',
   'T2DM routine review — HbA1c 8.4%',
   'Poorly controlled T2DM. HbA1c 8.4%. Has not attended follow-up despite 3 reminders. Expressed concern about out-of-pocket costs. Mandatory: repeat HbA1c, diabetologist referral.'),

  -- Meera — declined mandatory test
  ('22222222-0000-0000-0000-000000000002',
   '11111111-0000-0000-0000-000000000005',
   (SELECT id FROM providers WHERE full_name = 'Dr. Anil Mehra'),
   (current_date - interval '20 days')::timestamptz,
   'in_person',
   'Hypertension management review',
   'Stage 2 HTN. HbA1c recommended to screen for metabolic syndrome. Patient declined, citing privacy concerns about digital records. Mandatory: HbA1c. Recommended: 24h BP monitoring.')

ON CONFLICT (id) DO NOTHING;

-- ========== STEP 4: Care Plans ==========
INSERT INTO care_plans (id, consultation_id, member_id, status, created_by, created_at)
VALUES
  ('33333333-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   'active',
   (SELECT id FROM providers WHERE full_name = 'Dr. Anil Mehra'),
   (current_date - interval '15 days')::timestamptz),

  ('33333333-0000-0000-0000-000000000002',
   '22222222-0000-0000-0000-000000000002',
   '11111111-0000-0000-0000-000000000005',
   'active',
   (SELECT id FROM providers WHERE full_name = 'Dr. Anil Mehra'),
   (current_date - interval '20 days')::timestamptz),

  ('33333333-0000-0000-0000-000000000003',
   '22222222-0000-0000-0000-000000000003',
   '11111111-0000-0000-0000-000000000002',
   'active',
   (SELECT id FROM providers WHERE full_name = 'Dr. Anil Mehra'),
   (current_date - interval '30 days')::timestamptz)

ON CONFLICT (id) DO NOTHING;

-- ========== STEP 5: Care Plan Actions ==========
-- Ananya: 4 actions — design ref "2 of 4 steps done"
-- #1 overdue  #2 completed (closed-loop)  #3 pending  #4 completed
INSERT INTO care_plan_actions (id, care_plan_id, member_id, action_type, title, why_plain,
                               clinical_priority, provenance, due_date, status,
                               decline_reason, completed_via_event_id, created_at)
VALUES
  -- ACTION 1: HbA1c retest — OVERDUE (due 7 days ago, not yet done)
  ('44444444-0000-0000-0000-000000000001',
   '33333333-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   'lab_test',
   'Repeat HbA1c blood test',
   'Your last reading was borderline (5.9%). A repeat test checks whether your blood sugar has improved or needs attention.',
   'mandatory', 'clinician_authored',
   (current_date - interval '7 days'),
   'overdue',
   NULL, NULL,
   (current_date - interval '15 days')::timestamptz),

  -- ACTION 2: Fasting blood sugar — COMPLETED via diagnostic event (closed-loop demo moment)
  ('44444444-0000-0000-0000-000000000002',
   '33333333-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   'lab_test',
   'Fasting blood glucose test',
   'Checks your sugar levels after an overnight fast. Together with HbA1c, this gives Dr. Mehra a full picture of how your body handles sugar.',
   'mandatory', 'clinician_authored',
   (current_date - interval '9 days'),
   'completed',
   NULL,
   '55555555-0000-0000-0000-000000000001',  -- completed via clinical event
   (current_date - interval '15 days')::timestamptz),

  -- ACTION 3: Endocrinology follow-up — PENDING (upcoming)
  ('44444444-0000-0000-0000-000000000003',
   '33333333-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   'follow_up_consult',
   'Consult with Dr. Sara Iyer (Endocrinology)',
   'If your HbA1c remains borderline, Dr. Mehra has referred you to a specialist to create a personalised plan before it progresses.',
   'recommended', 'clinician_authored',
   (current_date + interval '13 days'),
   'pending',
   NULL, NULL,
   (current_date - interval '15 days')::timestamptz),

  -- ACTION 4: Metformin 500mg — COMPLETED
  ('44444444-0000-0000-0000-000000000004',
   '33333333-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   'medication',
   'Start Metformin 500mg daily',
   'A low dose to support blood sugar control while we wait for your retest results. Take with food.',
   'recommended', 'clinician_authored',
   (current_date - interval '12 days'),
   'completed',
   NULL, NULL,
   (current_date - interval '15 days')::timestamptz),

  -- Meera ACTION: HbA1c — DECLINED (mandatory → routes to navigator)
  ('44444444-0000-0000-0000-000000000005',
   '33333333-0000-0000-0000-000000000002',
   '11111111-0000-0000-0000-000000000005',
   'lab_test',
   'HbA1c blood test (metabolic screening)',
   'To screen for diabetes alongside your blood pressure condition — both conditions often appear together.',
   'mandatory', 'clinician_authored',
   (current_date - interval '12 days'),
   'declined',
   'privacy_concern',
   NULL,
   (current_date - interval '20 days')::timestamptz),

  -- Rahul ACTION: diabetologist referral — PENDING (suppressed nudge, cost segment)
  ('44444444-0000-0000-0000-000000000006',
   '33333333-0000-0000-0000-000000000003',
   '11111111-0000-0000-0000-000000000002',
   'follow_up_consult',
   'Diabetologist referral consult',
   'Your HbA1c is 8.4% — higher than the 7% target. A specialist can adjust your medication and help bring it down.',
   'mandatory', 'clinician_authored',
   (current_date - interval '20 days'),
   'pending',
   NULL, NULL,
   (current_date - interval '30 days')::timestamptz)

ON CONFLICT (id) DO NOTHING;

-- ========== STEP 6: Clinical Events ==========
INSERT INTO clinical_events (id, member_id, event_type, source, linked_action_id, occurred_at, payload)
VALUES
  -- The CLOSED-LOOP moment: Ananya's fasting BG result auto-completes action #2
  ('55555555-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   'diagnostic_completed',
   'diagnostics',
   '44444444-0000-0000-0000-000000000002',
   (current_date - interval '9 days')::timestamptz,
   '{"test": "Fasting Blood Glucose", "result": "95 mg/dL", "normal_range": "70–99 mg/dL", "status": "normal", "lab": "SRL Diagnostics"}'::jsonb),

  -- Home collection booked (feeds "scheduled" event type)
  ('55555555-0000-0000-0000-000000000002',
   '11111111-0000-0000-0000-000000000001',
   'home_collection_scheduled',
   'app',
   '44444444-0000-0000-0000-000000000002',
   (current_date - interval '10 days')::timestamptz,
   '{"slot": "07:30–08:00", "collection_by": "SRL Home Collection"}'::jsonb),

  -- Deepak ER visit — triggers 72h follow-up navigator task
  ('55555555-0000-0000-0000-000000000003',
   '11111111-0000-0000-0000-000000000004',
   'er_visit',
   'ambulance',
   NULL,
   (current_date - interval '2 days')::timestamptz,
   '{"hospital": "Max Hospital, Saket", "presenting_complaint": "Chest pain, ruled out ACS", "discharged_at": "2026-06-25T14:30:00"}'::jsonb)

ON CONFLICT (id) DO NOTHING;

-- ========== STEP 7: Nudges ==========
INSERT INTO nudges (id, action_id, member_id, channel, template_key, status,
                    suppression_reason, response_text, sent_at)
VALUES
  -- Ananya HbA1c nudge: sent (forgot segment → automated nudge is appropriate)
  ('66666666-0000-0000-0000-000000000001',
   '44444444-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   'whatsapp', 'overdue_lab_reminder', 'sent',
   NULL, NULL,
   (current_date - interval '6 days')::timestamptz),

  -- Ananya responds to nudge
  ('66666666-0000-0000-0000-000000000004',
   '44444444-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   'whatsapp', 'overdue_lab_reminder', 'responded',
   NULL, 'Is this really necessary? I feel fine now.',
   (current_date - interval '6 days')::timestamptz),

  -- Rahul: SUPPRESSED — cost segment; automated nudge suppressed → navigator task created instead
  ('66666666-0000-0000-0000-000000000002',
   '44444444-0000-0000-0000-000000000006',
   '11111111-0000-0000-0000-000000000002',
   'whatsapp', 'mandatory_followup_reminder', 'suppressed',
   'cost_barrier — member in cost drop segment; routing to navigator for financial barrier support',
   NULL,
   (current_date - interval '15 days')::timestamptz),

  -- Meera: SUPPRESSED — trust segment; automated nudge suppressed → navigator task
  ('66666666-0000-0000-0000-000000000003',
   '44444444-0000-0000-0000-000000000005',
   '11111111-0000-0000-0000-000000000005',
   'whatsapp', 'mandatory_lab_reminder', 'suppressed',
   'trust_barrier — member in trust drop segment; declined mandatory action; routing to human navigator',
   NULL,
   (current_date - interval '11 days')::timestamptz)

ON CONFLICT (id) DO NOTHING;

-- ========== STEP 8: Messages (Ananya's WhatsApp chat thread) ==========
INSERT INTO messages (id, member_id, sender, channel, body, created_at)
VALUES
  -- Fasting BG completion confirmation (older — positive touchpoint)
  ('77777777-0000-0000-0000-000000000009',
   '11111111-0000-0000-0000-000000000001',
   'system', 'whatsapp',
   '✅ Your fasting blood glucose result has been received — 95 mg/dL (normal range). Dr. Mehra has been notified. Keep it up!',
   (current_date - interval '9 days')::timestamptz),

  -- System nudge about overdue HbA1c
  ('77777777-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   'system', 'whatsapp',
   'Hi Ananya 👋 Dr. Mehra recommended a repeat HbA1c test. It was due on ' ||
     to_char(current_date - interval '7 days', 'DD Mon') ||
     ' and is now overdue. Book a home sample collection — it''s covered by your Acme health wallet (₹0 to pay).',
   (current_date - interval '6 days')::timestamptz),

  -- Member questions it
  ('77777777-0000-0000-0000-000000000002',
   '11111111-0000-0000-0000-000000000001',
   'member', 'whatsapp',
   'Is this really necessary? I feel fine now.',
   (current_date - interval '6 days')::timestamptz),

  -- System empathetic reply (non-pressuring)
  ('77777777-0000-0000-0000-000000000003',
   '11111111-0000-0000-0000-000000000001',
   'system', 'whatsapp',
   'That''s a fair question! Dr. Mehra flagged this because your previous reading was borderline (5.9%). The test helps confirm whether your levels have improved — it takes only 10 minutes with a home collection. No pressure, but it''s worth knowing.',
   (current_date - interval '6 days')::timestamptz),

  -- Member asks about cost
  ('77777777-0000-0000-0000-000000000004',
   '11111111-0000-0000-0000-000000000001',
   'member', 'whatsapp',
   'How much will it cost?',
   (current_date - interval '6 days')::timestamptz),

  -- System resolves cost objection
  ('77777777-0000-0000-0000-000000000005',
   '11111111-0000-0000-0000-000000000001',
   'system', 'whatsapp',
   'Great news — it''s fully covered by your Acme health wallet. ₹0 out of pocket for home collection. Your wallet balance is ₹3,500.',
   (current_date - interval '6 days')::timestamptz),

  -- Member still hesitant
  ('77777777-0000-0000-0000-000000000006',
   '11111111-0000-0000-0000-000000000001',
   'member', 'whatsapp',
   'Ok, I''ll think about it.',
   (current_date - interval '6 days')::timestamptz),

  -- System handoff chip
  ('77777777-0000-0000-0000-000000000007',
   '11111111-0000-0000-0000-000000000001',
   'system', 'whatsapp',
   '— Connecting you to Priya, your Care Navigator —',
   (current_date - interval '5 days')::timestamptz),

  -- Navigator reaches out personally
  ('77777777-0000-0000-0000-000000000008',
   '11111111-0000-0000-0000-000000000001',
   'navigator', 'whatsapp',
   'Hi Ananya, this is Priya from the Continuum care team 👋 Totally understand the hesitation. I can schedule the home collection at a time that works for you — morning or afternoon? It''ll be a quick visit.',
   (current_date - interval '5 days')::timestamptz)

ON CONFLICT (id) DO NOTHING;

-- ========== STEP 9: Navigator Tasks ==========
INSERT INTO navigator_tasks (id, member_id, navigator_id, trigger_reason, priority, status, notes, created_at)
VALUES
  -- P1: Meera declined a mandatory test (trust barrier)
  ('88888888-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000005',
   (SELECT au.id FROM auth.users au WHERE au.email = 'navigator@demo.continuum.health'),
   'declined_mandatory', 'p1', 'open',
   'Member declined mandatory HbA1c citing privacy concerns. Automated nudge suppressed (trust segment). Needs personal outreach in preferred language (Malayalam).',
   (current_date - interval '11 days')::timestamptz),

  -- P2: Rahul has structural cost barrier
  ('88888888-0000-0000-0000-000000000002',
   '11111111-0000-0000-0000-000000000002',
   (SELECT au.id FROM auth.users au WHERE au.email = 'navigator@demo.continuum.health'),
   'structural_barrier', 'p2', 'open',
   'Member missed diabetologist referral — cost segment. Wallet balance ₹0. Explore employer subsidy options. Automated nudge suppressed.',
   (current_date - interval '15 days')::timestamptz),

  -- P2: Deepak had ER visit 2 days ago — 72h follow-up needed
  ('88888888-0000-0000-0000-000000000003',
   '11111111-0000-0000-0000-000000000004',
   (SELECT au.id FROM auth.users au WHERE au.email = 'navigator@demo.continuum.health'),
   'post_er_72h', 'p2', 'open',
   'Member discharged from Max Hospital (chest pain, ruled out ACS) 2 days ago. No follow-up booked. Logistics barrier — no transport. Help arrange tele-consult.',
   (current_date - interval '2 days')::timestamptz)

ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Verify: should see rows in all 8 tables.
-- SELECT count(*) FROM members;              → ≥5
-- SELECT count(*) FROM care_plan_actions;    → ≥6
-- SELECT count(*) FROM clinical_events;      → 3
-- SELECT count(*) FROM nudges;               → 4
-- SELECT count(*) FROM messages;             → 9
-- SELECT count(*) FROM navigator_tasks;      → 3
-- ============================================================================
