import { supabase } from '@/integrations/supabase/client'
import type { Tables, TablesInsert } from '@/lib/database.types'

export type MessageRow = Tables<'messages'>

export async function listMessages(memberId: string): Promise<MessageRow[]> {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: true })

  return data ?? []
}

export async function insertMessage(
  msg: Omit<TablesInsert<'messages'>, 'id'>,
): Promise<MessageRow | null> {
  const { data } = await supabase
    .from('messages')
    .insert(msg)
    .select()
    .single()

  return data ?? null
}
