import { HeartPulse, FlaskConical, Pill, Stethoscope, Activity, Syringe, Check, Zap } from 'lucide-react'
import { format } from 'date-fns'
import type { Tables } from '@/lib/database.types'

type ActionRow = Tables<'care_plan_actions'>

const ACTION_ICON: Record<string, React.FC<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>> = {
  lab_test: FlaskConical,
  follow_up_consult: Stethoscope,
  medication: Pill,
  vaccination: Syringe,
  lifestyle: HeartPulse,
  imaging: Activity,
}

type NodeTheme = {
  bg: string
  border: string
  iconColor: string
  cardBg: string
  cardBorder: string
}

function nodeTheme(action: ActionRow): NodeTheme {
  if (action.completed_via_event_id) {
    return {
      bg: '#0E8C7F', border: '3px solid #fff',
      iconColor: '#fff', cardBg: '#fff', cardBorder: '1.5px solid #9AD2CA',
    }
  }
  const map: Record<string, NodeTheme> = {
    completed: { bg: '#E6F4EC', border: '3px solid #fff', iconColor: '#167A41', cardBg: '#fff', cardBorder: '1px solid #ECEAE5' },
    overdue: { bg: '#FBEFDD', border: '3px solid #fff', iconColor: '#A6620F', cardBg: '#FFFCF6', cardBorder: '1px solid #F0DDBE' },
    declined: { bg: '#FAE8E7', border: '3px solid #fff', iconColor: '#A8332F', cardBg: '#fff', cardBorder: '1px solid #ECEAE5' },
    pending: { bg: '#EEF1F5', border: '3px solid #fff', iconColor: '#475569', cardBg: '#fff', cardBorder: '1px solid #ECEAE5' },
    scheduled: { bg: '#EDF4F3', border: '3px solid #fff', iconColor: '#0B6F64', cardBg: '#fff', cardBorder: '1px solid #ECEAE5' },
    snoozed: { bg: '#EEF1F5', border: '3px solid #fff', iconColor: '#475569', cardBg: '#fff', cardBorder: '1px solid #ECEAE5' },
  }
  return map[action.status] ?? map.pending
}

function StatusBadge({ action, simDay }: { action: ActionRow; simDay?: Date }) {
  if (action.completed_via_event_id || action.status === 'completed') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 11px', borderRadius: '999px', background: '#E6F4EC', color: '#167A41', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
        <Check size={13} strokeWidth={2} /> Done
      </span>
    )
  }
  const map: Record<string, { bg: string; text: string; dot?: string; label: string }> = {
    overdue: { bg: '#FBEFDD', text: '#A6620F', dot: '#D9821B', label: simDay && action.due_date ? (Math.round((simDay.getTime() - new Date(action.due_date).getTime()) / 86400000) > 0 ? `Overdue ${Math.round((simDay.getTime() - new Date(action.due_date).getTime()) / 86400000)}d` : 'Overdue today') : 'Overdue' },
    declined: { bg: '#FAE8E7', text: '#A8332F', dot: '#D24B47', label: 'Declined' },
    pending: { bg: '#EEF1F5', text: '#475569', dot: '#64748B', label: 'Pending' },
    scheduled: { bg: '#EDF4F3', text: '#0B6F64', dot: '#0E8C7F', label: 'Scheduled' },
    snoozed: { bg: '#EEF1F5', text: '#475569', dot: '#64748B', label: 'Snoozed' },
  }
  const cfg = map[action.status] ?? map.pending
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 11px', borderRadius: '999px', background: cfg.bg, color: cfg.text, fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {cfg.dot && <span style={{ width: '6px', height: '6px', borderRadius: '99px', background: cfg.dot }} />}
      {cfg.label}
    </span>
  )
}

export function CarePlanTimeline({
  actions,
  providerName,
  consultAt,
  simDay,
}: {
  actions: ActionRow[]
  providerName: string | null
  consultAt: string | null
  simDay?: Date
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #ECEAE5',
        borderRadius: '16px',
        padding: '24px 26px 26px',
        boxShadow: '0 1px 2px rgba(19,35,58,.04), 0 14px 34px -24px rgba(19,35,58,.18)',
        alignSelf: 'stretch',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>Care plan</h2>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 11px 5px 10px', borderRadius: '8px', background: '#EDF4F3', border: '1px solid #CFE6E1', color: '#0B6F64', fontSize: '12px', fontWeight: 600 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
          Clinician-authored
        </span>
      </div>
      <div style={{ fontSize: '12.5px', color: '#8794A5', marginBottom: '22px' }}>
        {providerName ? `Dr. ${providerName}` : 'Care team'} · {actions.length} action{actions.length !== 1 ? 's' : ''}
        {consultAt ? ` · from ${new Date(consultAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
      </div>

      <div style={{ position: 'relative' }}>
        {/* Vertical rail */}
        <div style={{ position: 'absolute', left: '16px', top: '14px', bottom: '14px', width: '2px', background: '#ECEAE5' }} />

        {actions.map((action, idx) => {
          const theme = nodeTheme(action)
          const Icon = ACTION_ICON[action.action_type] ?? HeartPulse
          const isAutoCompleted = !!action.completed_via_event_id
          const isLast = idx === actions.length - 1

          return (
            <div
              key={action.id}
              style={{ position: 'relative', paddingLeft: '48px', paddingBottom: isLast ? 0 : '24px' }}
            >
              {/* Node */}
              <div
                style={{
                  position: 'absolute',
                  left: '2px',
                  top: 0,
                  width: '32px',
                  height: '32px',
                  borderRadius: '99px',
                  background: theme.bg,
                  border: theme.border,
                  boxShadow: isAutoCompleted
                    ? '0 0 0 3px rgba(14,140,127,.18)'
                    : `0 0 0 1px ${theme.border.replace('3px solid ', '')}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: theme.iconColor,
                  zIndex: 1,
                }}
              >
                {isAutoCompleted
                  ? <Zap size={16} strokeWidth={1.75} />
                  : action.status === 'completed'
                    ? <Check size={16} strokeWidth={1.75} />
                    : <Icon size={16} strokeWidth={1.75} />
                }
              </div>

              {/* Card */}
              <div
                style={{
                  border: theme.cardBorder,
                  borderRadius: '13px',
                  background: theme.cardBg,
                  overflow: 'hidden',
                  boxShadow: isAutoCompleted ? '0 8px 24px -16px rgba(14,140,127,.5)' : undefined,
                }}
              >
                {isAutoCompleted && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', background: '#0E8C7F', color: '#fff', fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.01em' }}>
                    <Zap size={14} strokeWidth={1.75} />
                    Auto-completed from diagnostics event{action.updated_at ? ` · ${format(new Date(action.updated_at), 'd MMM')}` : ''}
                  </div>
                )}
                <div style={{ padding: '15px 17px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '14.5px', fontWeight: 600, letterSpacing: '-0.01em' }}>{action.title}</div>
                      {action.due_date && (
                        <div style={{ fontSize: '12px', color: '#8794A5', marginTop: '3px' }}>
                          Due {new Date(action.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </div>
                      )}
                    </div>
                    <StatusBadge action={action} simDay={simDay} />
                  </div>

                  {action.status === 'declined' && action.decline_reason && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '11px', padding: '10px 12px', borderRadius: '9px', background: '#FAE8E7', color: '#A8332F', fontSize: '12px', lineHeight: 1.45 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/></svg>
                      <span><strong style={{ fontWeight: 600 }}>Decline reason:</strong> "{action.decline_reason}"</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginTop: '13px', paddingTop: '13px', borderTop: '1px solid #F2F0EC', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '7px', background: '#EDF4F3', border: '1px solid #CFE6E1', color: '#0B6F64', fontSize: '11.5px', fontWeight: 600 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                      {action.provenance === 'system_suggested' ? 'AI-suggested' : 'Clinician-authored'}
                    </span>
                    {isAutoCompleted && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#0B6F64', fontWeight: 600 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>
                        Loop closed automatically
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
