import { supabase } from '@/integrations/supabase/client'
import type { Tables } from '@/lib/database.types'

export type OrgRow = Tables<'organizations'>

export async function getOrg(orgId: string): Promise<OrgRow | null> {
  const { data } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()

  return data ?? null
}

export async function listOrgs(): Promise<OrgRow[]> {
  const { data } = await supabase
    .from('organizations')
    .select('*')
    .order('name', { ascending: true })

  return data ?? []
}
