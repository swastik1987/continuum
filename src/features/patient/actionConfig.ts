import { Droplet, Stethoscope, Pill, Syringe, HeartPulse, Scan } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Enums } from '@/lib/database.types'

type ActionType = Enums<'action_type'>
type ActionStatus = Enums<'action_status'>

export const ACTION_ICON: Record<ActionType, LucideIcon> = {
  lab_test: Droplet,
  follow_up_consult: Stethoscope,
  medication: Pill,
  vaccination: Syringe,
  lifestyle: HeartPulse,
  imaging: Scan,
}

export const ACTION_SUBTITLE: Record<ActionType, string> = {
  lab_test: 'Lab · home collection available',
  follow_up_consult: 'Video consult · 15 min',
  medication: 'Medication · take as directed',
  vaccination: 'Vaccination',
  lifestyle: 'Lifestyle & wellness',
  imaging: 'Imaging',
}

export function actionIconStyle(status: ActionStatus): { background: string; color: string } {
  switch (status) {
    case 'overdue':   return { background: '#FBEFDD', color: '#A6620F' }
    case 'completed': return { background: '#E6F4EC', color: '#167A41' }
    case 'declined':  return { background: '#FAE8E7', color: '#A8332F' }
    default:          return { background: '#EEF1F5', color: '#475569' }
  }
}
