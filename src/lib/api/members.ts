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
// Uses a SECURITY DEFINER RPC to bypass profiles RLS (profiles RLS is scoped per-user).
export async function getMemberForDemoRole(role: string): Promise<MemberRow | null> {
  if (role === 'patient') {
    const { data: memberId } = await supabase.rpc('get_demo_patient_member_id')
    if (!memberId) return null
    return getMember(memberId as string)
  }
  return null
}

export async function listMembersForOrg(orgId: string): Promise<MemberRow[]> {
  const { data } = await supabase
    .from('members')
    .select('*')
    .eq('org_id', orgId)
    .order('risk_score', { ascending: false })

  return data ?? []
}
