import { supabase } from '@/integrations/supabase/client'
import type { Tables, Enums } from '@/lib/database.types'

export type ClinicalEventRow = Tables<'clinical_events'>

export async function listClinicalEventsForMember(memberId: string): Promise<ClinicalEventRow[]> {
  const { data } = await supabase
    .from('clinical_events')
    .select('*')
    .eq('member_id', memberId)
    .order('occurred_at', { ascending: false })

  return data ?? []
}

export async function getEventByAction(linkedActionId: string): Promise<ClinicalEventRow | null> {
  const { data } = await supabase
    .from('clinical_events')
    .select('*')
    .eq('linked_action_id', linkedActionId)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .single()

  return data ?? null
}

export async function createBookingEvent(
  memberId: string,
  actionId: string,
  eventType: Enums<'clinical_event_type'>,
  slotLabel: string,
): Promise<ClinicalEventRow | null> {
  const { data } = await supabase
    .from('clinical_events')
    .insert({
      member_id: memberId,
      event_type: eventType,
      source: 'app',
      linked_action_id: actionId,
      occurred_at: new Date().toISOString(),
      payload: { slot: slotLabel, booked_via: 'patient_app' },
    })
    .select()
    .single()

  return data ?? null
}
