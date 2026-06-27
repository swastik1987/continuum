import { Calendar, ShieldCheck, CheckCircle2, Home, Video } from 'lucide-react'
import { format } from 'date-fns'
import type { ActionRow } from '@/lib/api/care-plans'
import { ACTION_ICON, ACTION_SUBTITLE, actionIconStyle } from './actionConfig'

const CARD_SHADOW = '0 1px 2px rgba(19,35,58,.04), 0 12px 30px -22px rgba(19,35,58,.22)'

interface Props {
  action: ActionRow
  onOpen: () => void
}

function StatusBadge({ action }: { action: ActionRow }) {
  if (action.status === 'completed' || action.status === 'declined') return null

  const daysOverdue =
    action.status === 'overdue' && action.due_date
      ? Math.max(0, Math.floor((Date.now() - new Date(action.due_date).getTime()) / 86400000))
      : 0

  if (action.status === 'overdue') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 9px',
          borderRadius: 99,
          background: '#FBEFDD',
          color: '#A6620F',
          fontSize: 11.5,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: 99, background: '#D9821B', display: 'inline-block' }} />
        Overdue{daysOverdue > 0 ? ` · ${daysOverdue}d` : ''}
      </span>
    )
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        borderRadius: 99,
        background: '#EEF1F5',
        color: '#475569',
        fontSize: 11.5,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: 99, background: '#64748B', display: 'inline-block' }} />
      Due soon
    </span>
  )
}

function ActionCta({ action, onOpen }: { action: ActionRow; onOpen: () => void }) {
  const primary: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    padding: '10px 16px',
    borderRadius: 11,
    background: '#0E8C7F',
    color: '#fff',
    border: 'none',
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
    flex: 1,
  }

  const secondary: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    padding: '10px 16px',
    borderRadius: 11,
    background: 'transparent',
    color: '#3A4A5E',
    border: '1.5px solid #D9D7D2',
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
  }

  if (action.status === 'completed') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderRadius: 12,
          background: '#E6F4EC',
          marginTop: 14,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#167A41' }}>
          <CheckCircle2 size={17} strokeWidth={1.75} />
          {action.due_date ? `Completed on ${format(new Date(action.due_date), 'd MMM')}` : 'Completed'}
        </span>
        <button onClick={onOpen} style={{ background: 'transparent', color: '#167A41', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
          View
        </button>
      </div>
    )
  }

  if (action.status === 'declined') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '10px 14px',
          borderRadius: 12,
          background: '#FAE8E7',
          marginTop: 14,
          fontSize: 13.5,
          fontWeight: 600,
          color: '#A8332F',
        }}
      >
        Declined
      </div>
    )
  }

  if (action.action_type === 'follow_up_consult') {
    return (
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={onOpen} style={primary}>
          <Video size={16} strokeWidth={1.75} />
          Book a slot
        </button>
        <button onClick={onOpen} style={secondary}>
          Reschedule
        </button>
      </div>
    )
  }

  if (action.action_type === 'lab_test') {
    return (
      <button onClick={onOpen} style={{ ...primary, width: '100%', marginTop: 16 }}>
        <Home size={16} strokeWidth={1.75} />
        Book home collection
      </button>
    )
  }

  return (
    <button onClick={onOpen} style={{ ...primary, width: '100%', marginTop: 16 }}>
      Book now
    </button>
  )
}

export function ActionCard({ action, onOpen }: Props) {
  const iconStyle = actionIconStyle(action.status)
  const ActionIcon = ACTION_ICON[action.action_type]
  const subtitle = ACTION_SUBTITLE[action.action_type]
  const hasCliniciandBadge =
    action.provenance === 'clinician_authored' || action.provenance === 'clinician_confirmed'

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #EDEBE6',
        borderRadius: 18,
        padding: 18,
        boxShadow: CARD_SHADOW,
        marginBottom: 14,
      }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Icon tile */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            background: iconStyle.background,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ActionIcon size={22} strokeWidth={1.75} color={iconStyle.color} />
        </div>

        {/* Content column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title + status badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#13233A', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
              {action.title}
            </div>
            <StatusBadge action={action} />
          </div>

          {/* Subtitle */}
          <div style={{ fontSize: 12.5, color: '#8794A5', marginTop: 3 }}>
            {subtitle}
          </div>

          {/* Why text */}
          {action.why_plain && (
            <div
              style={{
                fontSize: 13.5,
                color: '#5A6B80',
                marginTop: 10,
                lineHeight: 1.55,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden',
              }}
            >
              {action.why_plain}
            </div>
          )}

          {/* Date + provenance row */}
          {(action.due_date || hasCliniciandBadge) && action.status !== 'completed' && action.status !== 'declined' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 11, flexWrap: 'wrap' }}>
              {action.due_date && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: action.status === 'overdue' ? '#A6620F' : '#8794A5',
                  }}
                >
                  <Calendar size={13} strokeWidth={1.75} />
                  {action.status === 'overdue' ? 'Was due' : 'Due'} {format(new Date(action.due_date), 'd MMM')}
                </span>
              )}
              {hasCliniciandBadge && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 8px',
                    borderRadius: 7,
                    background: '#EDF4F3',
                    border: '1px solid #CFE6E1',
                    color: '#0B6F64',
                    fontSize: 11.5,
                    fontWeight: 600,
                  }}
                >
                  <ShieldCheck size={11} strokeWidth={1.75} />
                  Clinician-authored
                </span>
              )}
            </div>
          )}

          {/* CTA */}
          <ActionCta action={action} onOpen={onOpen} />
        </div>
      </div>
    </div>
  )
}
