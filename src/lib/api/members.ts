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

// Used by useMember hook to give admin a demo patient view when they have no member_id
export async function getMemberForDemoRole(role: string): Promise<MemberRow | null> {
  const { data } = await supabase
    .from('profiles')
    .select('member_id')
    .eq('role', role)
    .not('member_id', 'is', null)
    .limit(1)
    .maybeSingle()
  if (!data?.member_id) return null
  return getMember(data.member_id)
}

export async function listMembersForOrg(orgId: string): Promise<MemberRow[]> {
  const { data } = await supabase
    .from('members')
    .select('*')
    .eq('org_id', orgId)
    .order('risk_score', { ascending: false })

  return data ?? []
}
