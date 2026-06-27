import { supabase } from '@/integrations/supabase/client'
import type { Tables, Enums } from '@/lib/database.types'

export type NavigatorTaskRow = Tables<'navigator_tasks'>

// Members columns joined on navigator worklist queries
type MemberSummary = Pick<
  Tables<'members'>,
  'full_name' | 'risk_tier' | 'drop_segment' | 'gender' | 'dob' | 'risk_score' | 'org_id'
>

export type NavigatorTaskWithMember = NavigatorTaskRow & {
  member: MemberSummary | null
}

export interface TaskFilter {
  priority?: Enums<'task_priority'>
  status?: Enums<'task_status'>
  trigger_reason?: Enums<'task_reason'>
  member_id?: string
}

export async function listNavigatorTasks(
  filter: TaskFilter = {},
): Promise<NavigatorTaskWithMember[]> {
  let query = supabase
    .from('navigator_tasks')
    .select('*, member:members(full_name, risk_tier, drop_segment, gender, dob, risk_score, org_id)')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })

  if (filter.priority) query = query.eq('priority', filter.priority)
  if (filter.status) query = query.eq('status', filter.status)
  if (filter.trigger_reason) query = query.eq('trigger_reason', filter.trigger_reason)
  if (filter.member_id) query = query.eq('member_id', filter.member_id)

  const { data } = await query

  // Supabase join returns member as object; cast to our type
  return (data ?? []) as NavigatorTaskWithMember[]
}

export async function getNavigatorTask(taskId: string): Promise<NavigatorTaskWithMember | null> {
  const { data } = await supabase
    .from('navigator_tasks')
    .select('*, member:members(full_name, risk_tier, drop_segment, gender, dob, risk_score, org_id)')
    .eq('id', taskId)
    .single()

  return data ? (data as NavigatorTaskWithMember) : null
}

export async function updateTaskStatus(
  taskId: string,
  status: Enums<'task_status'>,
  notes?: string,
): Promise<void> {
  await supabase
    .from('navigator_tasks')
    .update({
      status,
      notes: notes ?? undefined,
      resolved_at: status === 'resolved' ? new Date().toISOString() : undefined,
    })
    .eq('id', taskId)
}

export async function resolveTask(taskId: string, notes?: string): Promise<void> {
  return updateTaskStatus(taskId, 'resolved', notes)
}

export async function createNavigatorTask(
  memberId: string,
  triggerReason: Enums<'task_reason'>,
  priority: Enums<'task_priority'>,
  notes?: string,
): Promise<void> {
  await supabase.from('navigator_tasks').insert({
    member_id: memberId,
    trigger_reason: triggerReason,
    priority,
    status: 'open',
    notes: notes ?? null,
  })
}
