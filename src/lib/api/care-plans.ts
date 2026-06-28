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
    .maybeSingle()

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
      .select('*')
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

export async function scheduleAction(actionId: string): Promise<void> {
  await supabase
    .from('care_plan_actions')
    .update({ status: 'scheduled' })
    .eq('id', actionId)
}

type ConsultationWithProvider = ConsultationRow & {
  provider: { full_name: string; specialty: string | null } | null
}

export async function listConsultationsForMember(memberId: string): Promise<ConsultationWithProvider[]> {
  const { data } = await supabase
    .from('consultations')
    .select('*, provider:providers(full_name, specialty)')
    .eq('member_id', memberId)
    .order('consulted_at', { ascending: false })

  return (data ?? []) as ConsultationWithProvider[]
}

// ── Care Plan Builder API ──────────────────────────────────────────────────

export type ConsultationWithMeta = ConsultationRow & {
  member: { id: string; full_name: string; dob: string | null } | null
  provider: { id: string; full_name: string; specialty: string | null } | null
}

export async function listConsultations(): Promise<ConsultationWithMeta[]> {
  const { data } = await supabase
    .from('consultations')
    .select('*, member:members(id,full_name,dob), provider:providers(id,full_name,specialty)')
    .order('consulted_at', { ascending: false })

  return (data ?? []) as ConsultationWithMeta[]
}

type ActionPatch = {
  action_type?: ActionRow['action_type']
  title?: string
  why_plain?: string | null
  clinical_priority?: ActionRow['clinical_priority']
  due_date?: string | null
}

export async function updateCarePlanAction(id: string, patch: ActionPatch): Promise<void> {
  await supabase.from('care_plan_actions').update(patch).eq('id', id)
}

export async function addCarePlanAction(
  planId: string,
  memberId: string,
  data: {
    action_type: ActionRow['action_type']
    title: string
    why_plain?: string
    clinical_priority: ActionRow['clinical_priority']
    due_date?: string
  },
): Promise<ActionRow | null> {
  const { data: row } = await supabase
    .from('care_plan_actions')
    .insert({
      care_plan_id: planId,
      member_id: memberId,
      provenance: 'clinician_authored',
      status: 'pending',
      ...data,
    })
    .select()
    .single()

  return row ?? null
}

export async function deleteCarePlanAction(id: string): Promise<void> {
  await supabase.from('care_plan_actions').delete().eq('id', id)
}

export async function confirmSuggestedAction(id: string): Promise<void> {
  await supabase
    .from('care_plan_actions')
    .update({ provenance: 'clinician_confirmed' })
    .eq('id', id)
}

// ── Returns the single most urgent at-risk action for a member (overdue first, then declined).
// Used by the navigator worklist "Action at risk" column.
export async function getAtRiskActionForMember(memberId: string): Promise<ActionRow | null> {
  const { data: overdue } = await supabase
    .from('care_plan_actions')
    .select('*')
    .eq('member_id', memberId)
    .eq('status', 'overdue')
    .order('due_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (overdue) return overdue

  const { data: declined } = await supabase
    .from('care_plan_actions')
    .select('*')
    .eq('member_id', memberId)
    .eq('status', 'declined')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return declined ?? null
}
