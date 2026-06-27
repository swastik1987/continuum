import { supabase } from '@/integrations/supabase/client'
import type { Tables, Enums } from '@/lib/database.types'

export type CarePlanRow = Tables<'care_plans'>
export type ActionRow = Tables<'care_plan_actions'>
export type ConsultationRow = Tables<'consultations'>

export type ActivePlanResult = {
  plan: CarePlanRow
  consultation: ConsultationRow | null
  providerName: string | null
  actions: ActionRow[]
}

export async function getActivePlanForMember(memberId: string): Promise<ActivePlanResult | null> {
  const { data: plan } = await supabase
    .from('care_plans')
    .select('*')
    .eq('member_id', memberId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!plan) return null

  const { data: actions } = await supabase
    .from('care_plan_actions')
    .select('*')
    .eq('care_plan_id', plan.id)
    .order('created_at', { ascending: true })

  let consultation: ConsultationRow | null = null
  if (plan.consultation_id) {
    const { data } = await supabase
      .from('consultations')
      .select('*')
      .eq('id', plan.consultation_id)
      .single()
    consultation = data ?? null
  }

  let providerName: string | null = null
  if (consultation?.provider_id) {
    const { data: provider } = await supabase
      .from('providers')
      .select('full_name')
      .eq('id', consultation.provider_id)
      .single()
    providerName = provider?.full_name ?? null
  }

  return {
    plan,
    consultation,
    providerName,
    actions: actions ?? [],
  }
}

export async function getAction(actionId: string): Promise<ActionRow | null> {
  const { data } = await supabase
    .from('care_plan_actions')
    .select('*')
    .eq('id', actionId)
    .single()

  return data ?? null
}

export async function listActionsForPlan(carePlanId: string): Promise<ActionRow[]> {
  const { data } = await supabase
    .from('care_plan_actions')
    .select('*')
    .eq('care_plan_id', carePlanId)
    .order('created_at', { ascending: true })

  return data ?? []
}

export async function updateActionStatus(
  actionId: string,
  status: Enums<'action_status'>,
  opts?: { declineReason?: string },
): Promise<void> {
  await supabase
    .from('care_plan_actions')
    .update({ status, decline_reason: opts?.declineReason ?? null })
    .eq('id', actionId)
}
