/**
 * Creates 5 demo auth users (one per role) and their profiles in Supabase.
 * Also creates a demo member (Priya Sharma) linked to the patient account.
 *
 * Run: bun run scripts/setup-demo-users.ts
 *
 * Required env vars (in .env or exported):
 *   VITE_SUPABASE_URL        — your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — from Supabase dashboard → Settings → API
 *
 * Safe to run multiple times (upserts, not inserts).
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('\n[setup-demo-users] Missing env vars:')
  if (!SUPABASE_URL) console.error('  VITE_SUPABASE_URL (or SUPABASE_URL)')
  if (!SERVICE_KEY) console.error('  SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nAdd these to your .env file and re-run.\n')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PASSWORD = 'Continuum2024!'

const DEMO_USERS = [
  { email: 'patient@demo.continuum.health', role: 'patient', fullName: 'Priya Sharma (Demo)' },
  { email: 'navigator@demo.continuum.health', role: 'navigator', fullName: 'Rahul Nair (Demo)' },
  { email: 'clinician@demo.continuum.health', role: 'clinician', fullName: 'Dr. Anil Mehra (Demo)' },
  { email: 'employer@demo.continuum.health', role: 'employer_admin', fullName: 'Kavya Reddy (Demo)' },
  { email: 'admin@demo.continuum.health', role: 'admin', fullName: 'Demo Admin' },
] as const

async function main() {
  console.log('\n[setup-demo-users] Starting demo user setup…\n')

  // --- 1. Ensure Acme Corp org exists (may already exist from schema seed) ---
  const { data: existingOrg } = await admin
    .from('organizations')
    .select('id')
    .eq('name', 'Acme Corp')
    .single()

  let orgId: string
  if (existingOrg) {
    orgId = existingOrg.id
    console.log(`  ✓ Organization: Acme Corp (${orgId})`)
  } else {
    const { data: newOrg, error } = await admin
      .from('organizations')
      .insert({ name: 'Acme Corp', plan_type: 'Corporate OPD + Preventive', contract_lives: 12480 })
      .select('id')
      .single()
    if (error || !newOrg) { console.error('  ✗ Failed to create org:', error?.message); process.exit(1) }
    orgId = newOrg.id
    console.log(`  ✓ Created organization: Acme Corp (${orgId})`)
  }

  // --- 2. Create a demo member for the patient ---
  const { data: existingMember } = await admin
    .from('members')
    .select('id')
    .eq('full_name', 'Priya Sharma')
    .single()

  let memberId: string
  if (existingMember) {
    memberId = existingMember.id
    console.log(`  ✓ Member: Priya Sharma (${memberId})`)
  } else {
    const { data: newMember, error } = await admin
      .from('members')
      .insert({
        org_id: orgId,
        full_name: 'Priya Sharma',
        phone: '+91-98100-00001',
        dob: '1990-03-15',
        gender: 'Female',
        preferred_language: 'English',
        risk_tier: 'high',
        risk_drivers: ['hba1c_elevated', 'missed_followup_90d'],
        risk_score: 74,
        drop_segment: 'forgot',
        wallet_balance: 2500,
        is_chronic: true,
      })
      .select('id')
      .single()
    if (error || !newMember) { console.error('  ✗ Failed to create member:', error?.message); process.exit(1) }
    memberId = newMember.id
    console.log(`  ✓ Created member: Priya Sharma (${memberId})`)
  }

  // --- 3. Create auth users + profiles ---
  for (const user of DEMO_USERS) {
    // Check if user already exists
    const { data: existingList } = await admin.auth.admin.listUsers()
    const existing = existingList?.users.find((u) => u.email === user.email)

    let userId: string
    if (existing) {
      userId = existing.id
      console.log(`  ✓ Auth user exists: ${user.email} (${userId})`)
    } else {
      const { data: newUser, error } = await admin.auth.admin.createUser({
        email: user.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: user.fullName },
      })
      if (error || !newUser?.user) {
        console.error(`  ✗ Failed to create ${user.email}:`, error?.message)
        continue
      }
      userId = newUser.user.id
      console.log(`  ✓ Created auth user: ${user.email} (${userId})`)
    }

    // Upsert profile
    const profilePayload = {
      id: userId,
      role: user.role,
      full_name: user.fullName,
      member_id: user.role === 'patient' ? memberId : null,
      org_id: user.role === 'employer_admin' ? orgId : null,
      provider_id: null,
    }

    const { error: profileError } = await admin
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })

    if (profileError) {
      console.error(`  ✗ Failed to upsert profile for ${user.email}:`, profileError.message)
    } else {
      console.log(`  ✓ Profile upserted: ${user.role}`)
    }
  }

  // --- 4. Print credential summary ---
  console.log('\n' + '─'.repeat(56))
  console.log('  Demo credentials (all use the same password)')
  console.log('─'.repeat(56))
  console.log('  Password: ' + PASSWORD)
  console.log('─'.repeat(56))
  for (const user of DEMO_USERS) {
    const roleLabel = user.role.padEnd(14)
    console.log(`  ${roleLabel}  ${user.email}`)
  }
  console.log('─'.repeat(56) + '\n')
}

main().catch((e) => { console.error(e); process.exit(1) })
