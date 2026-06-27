import { supabase } from '@/integrations/supabase/client'
import type { Tables, TablesInsert } from '@/lib/database.types'

export type NudgeRow = Tables<'nudges'>

export async function listNudgesForMember(memberId: string): Promise<NudgeRow[]> {
  const { data } = await supabase
    .from('nudges')
    .select('*')
    .eq('member_id', memberId)
    .order('sent_at', { ascending: false })

  return data ?? []
}

export async function insertNudge(
  nudge: Omit<TablesInsert<'nudges'>, 'id'>,
): Promise<NudgeRow | null> {
  const { data } = await supabase
    .from('nudges')
    .insert(nudge)
    .select()
    .single()

  return data ?? null
}

export async function countSuppressedNudges(): Promise<number> {
  const { count } = await supabase
    .from('nudges')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'suppressed')

  return count ?? 0
}
