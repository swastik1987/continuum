-- ============================================================================
-- Continuum — Database Schema Migration
-- Run this ONCE in the SQL editor of the Supabase project that Lovable connected
-- (via Lovable's Supabase panel, or Supabase Dashboard → SQL Editor → New query).
-- Run this AFTER the Lovable scaffold prompt has connected Supabase + enabled Auth,
-- so that auth.users exists for the profiles foreign key below.
-- ============================================================================

-- ========== ENUMS ==========
create type user_role as enum ('patient','navigator','clinician','employer_admin','admin');
create type risk_tier as enum ('low','medium','high');
create type drop_segment as enum ('forgot','cost','feels_better','logistics','lost_thread','trust','avoidance','none');
create type consult_mode as enum ('tele','in_person');
create type plan_status as enum ('active','completed','abandoned');
create type action_type as enum ('lab_test','follow_up_consult','medication','vaccination','lifestyle','imaging');
create type clinical_priority as enum ('mandatory','recommended','optional');
create type action_provenance as enum ('clinician_authored','clinician_confirmed','system_suggested');
create type action_status as enum ('pending','scheduled','completed','snoozed','declined','overdue');
create type nudge_channel as enum ('whatsapp','app','sms','call');
create type nudge_status as enum ('queued','sent','delivered','read','responded','suppressed');
create type msg_sender as enum ('system','member','navigator','clinician');
create type msg_channel as enum ('whatsapp','app');
create type clinical_event_type as enum ('appointment_booked','appointment_attended','diagnostic_completed','pharmacy_fulfilled','er_visit','home_collection_scheduled');
create type event_source as enum ('diagnostics','pharmacy','clinic','ambulance','app');
create type task_reason as enum ('post_er_72h','declined_mandatory','repeat_dropper','abnormal_result','high_risk_overdue','structural_barrier');
create type task_priority as enum ('p1','p2','p3');
create type task_status as enum ('open','in_progress','resolved','snoozed');

-- ========== CORE TABLES ==========
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan_type text,
  contract_lives int default 0,
  created_at timestamptz default now()
);

create table providers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  specialty text,
  created_at timestamptz default now()
);

create table members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  full_name text not null,
  phone text,
  dob date,
  gender text,
  preferred_language text default 'English',
  risk_tier risk_tier default 'low',
  risk_drivers jsonb default '[]'::jsonb,
  risk_score numeric default 0,
  drop_segment drop_segment default 'none',
  wallet_balance numeric default 0,
  is_chronic boolean default false,
  created_at timestamptz default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'patient',
  full_name text,
  member_id uuid references members(id),
  org_id uuid references organizations(id),
  provider_id uuid references providers(id),
  created_at timestamptz default now()
);

create table consultations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  provider_id uuid references providers(id),
  consulted_at timestamptz default now(),
  mode consult_mode default 'tele',
  chief_complaint text,
  summary text
);

create table care_plans (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid references consultations(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  status plan_status default 'active',
  created_by uuid references providers(id),
  created_at timestamptz default now()
);

create table care_plan_actions (
  id uuid primary key default gen_random_uuid(),
  care_plan_id uuid references care_plans(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  action_type action_type not null,
  title text not null,
  why_plain text,
  clinical_priority clinical_priority default 'recommended',
  provenance action_provenance default 'clinician_authored',
  due_date date,
  status action_status default 'pending',
  decline_reason text,
  completed_via_event_id uuid,
  created_at timestamptz default now()
);

create table nudges (
  id uuid primary key default gen_random_uuid(),
  action_id uuid references care_plan_actions(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  channel nudge_channel default 'whatsapp',
  template_key text,
  status nudge_status default 'queued',
  suppression_reason text,
  response_text text,
  sent_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  sender msg_sender not null,
  channel msg_channel default 'whatsapp',
  body text not null,
  created_at timestamptz default now()
);

create table clinical_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  event_type clinical_event_type not null,
  source event_source not null,
  linked_action_id uuid references care_plan_actions(id),
  occurred_at timestamptz default now(),
  payload jsonb default '{}'::jsonb
);

create table navigator_tasks (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  navigator_id uuid references profiles(id),
  trigger_reason task_reason not null,
  priority task_priority default 'p2',
  status task_status default 'open',
  notes text,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create table sim_state (
  id int primary key default 1,
  current_day date not null default current_date,
  updated_at timestamptz default now(),
  constraint sim_state_singleton check (id = 1)
);

-- ========== RLS (PROTOTYPE: permissive for authenticated users) ==========
-- NOTE: Intentionally permissive for the prototype demo. Production must scope
-- by role/org/member (see CLAUDE.md "Deferred for prototype").
alter table organizations enable row level security;
alter table providers enable row level security;
alter table members enable row level security;
alter table profiles enable row level security;
alter table consultations enable row level security;
alter table care_plans enable row level security;
alter table care_plan_actions enable row level security;
alter table nudges enable row level security;
alter table messages enable row level security;
alter table clinical_events enable row level security;
alter table navigator_tasks enable row level security;
alter table sim_state enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array[
    'organizations','providers','members','profiles','consultations',
    'care_plans','care_plan_actions','nudges','messages','clinical_events',
    'navigator_tasks','sim_state'])
  loop
    execute format('create policy "auth_all_%s" on %I for all to authenticated using (true) with check (true);', t, t);
  end loop;
end $$;

-- ========== MINIMAL SEED (Claude Code adds the full demo dataset later) ==========
insert into organizations (name, plan_type, contract_lives)
values ('Acme Corp', 'Corporate OPD + Preventive', 12480);

insert into providers (full_name, specialty) values
('Dr. Anil Mehra', 'Internal Medicine'),
('Dr. Sara Iyer', 'Endocrinology');

insert into sim_state (id, current_day) values (1, current_date);

-- ============================================================================
-- End of migration. Verify in Table Editor that 12 tables exist and that
-- organizations / providers / sim_state have seed rows.
-- ============================================================================
