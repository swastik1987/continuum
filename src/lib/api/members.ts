import { supabase } from '@/integrations/supabase/client'
import type { Tables } from '@/lib/database.types'

export type MemberRow = Tables<'members'>

export async function getMemberByProfileId(profileId: string): Promise<MemberRow | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single()

  if (!profile?.member_id) return null

  const { data } = await supabase
    .from('members')
    .select('*')
    .eq('id', profile.member_id)
    .single()

  return data ?? null
}

export async function getMember(memberId: string): Promise<MemberRow | null> {
  const { data } = await supabase
    .from('members')
    .select('*')
    .eq('id', memberId)
    .single()

  return data ?? null
}

// Used by useMember hook to give admin a demo patient view when they have no member_id.
// Uses a SECURITY DEFINER RPC (bypasses profiles RLS) with a name-based fallback.
export async function getMemberForDemoRole(role: string): Promise<MemberRow | null> {
  if (role !== 'patient') return null

  // Strategy 1: SECURITY DEFINER RPC looks up the patient profile's member_id.
  // PostgREST may return a scalar string or a single-element array — handle both.
  const { data: rpcResult } = await supabase.rpc('get_demo_patient_member_id')
  if (rpcResult) {
    const id =
      typeof rpcResult === 'string'
        ? rpcResult
        : Array.isArray(rpcResult)
          ? String(
              typeof rpcResult[0] === 'string'
                ? rpcResult[0]
                : (rpcResult[0] as { member_id?: string })?.member_id ?? '',
            )
          : null
    if (id) {
      const m = await getMember(id)
      if (m) return m
    }
  }

  // Strategy 2: The setup script always links patient@demo to 'Priya Sharma'.
  // Admin can read the members table (permissive authenticated policy).
  const { data } = await supabase
    .from('members')
    .select('*')
    .eq('full_name', 'Priya Sharma')
    .maybeSingle()
  return data ?? null
}

export async function listMembersForOrg(orgId: string): Promise<MemberRow[]> {
  const { data } = await supabase
    .from('members')
    .select('*')
    .eq('org_id', orgId)
    .order('risk_score', { ascending: false })

  return data ?? []
}
