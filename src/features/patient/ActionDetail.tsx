import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  ChevronLeft,
  Share2,
  HeartPulse,
  ShieldCheck,
  Home,
  Building2,
  MapPin,
  Wallet,
  CheckCircle2,
  Bell,
  CircleSlash,
  ChevronDown,
  ChevronUp,
  Calendar,
} from 'lucide-react'
import { format, addDays } from 'date-fns'
import { useAuth } from '@/lib/auth/context'
import { getAction, updateActionStatus, getMemberByProfileId } from '@/lib/api'
import { ACTION_ICON, ACTION_SUBTITLE, actionIconStyle } from './actionConfig'

const DECLINE_REASONS = [
  { id: 'cost', label: 'Too expensive right now' },
  { id: 'logistics', label: 'Hard to get there' },
  { id: 'feels_better', label: 'I feel fine' },
  { id: 'trust', label: 'Not sure I need this' },
  { id: 'other', label: 'Something else' },
]

const SLOT_DATES = [
  { label: format(addDays(new Date(), 1), 'EEE d'), time: '7:30 AM' },
  { label: format(addDays(new Date(), 1), 'EEE d'), time: '9:00 AM' },
  { label: format(addDays(new Date(), 2), 'EEE d'), time: '8:00 AM' },
]

interface Props {
  actionId: string
}

export function ActionDetail({ actionId }: Props) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [mode, setMode] = useState<'home' | 'centre'>('home')
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [booked, setBooked] = useState(false)
  const [showDecline, setShowDecline] = useState(false)
  const [declineOpen, setDeclineOpen] = useState(false)
  const [declineReason, setDeclineReason] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { data: action, isLoading } = useQuery({
    queryKey: ['action', actionId],
    queryFn: () => getAction(actionId),
    enabled: !!actionId,
  })

  const { data: member } = useQuery({
    queryKey: ['member', profile?.id],
    queryFn: () => getMemberByProfileId(profile!.id),
    enabled: !!profile,
  })

  async function handleConfirm() {
    setBooked(true)
    await new Promise((r) => setTimeout(r, 1400))
    navigate({ to: '/patient' })
  }

  async function handleDecline() {
    if (!declineReason || !action) return
    setSubmitting(true)
    await updateActionStatus(action.id, 'declined', { declineReason })
    queryClient.invalidateQueries({ queryKey: ['active-plan'] })
    setSubmitting(false)
    setShowDecline(false)
    navigate({ to: '/patient' })
  }

  if (isLoading || !action) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center', color: '#8794A5', fontSize: 14 }}>
        {isLoading ? 'Loading…' : 'Action not found.'}
      </div>
    )
  }

  const iconStyle = actionIconStyle(action.status)
  const ActionIcon = ACTION_ICON[action.action_type]
  const subtitle = action.action_subtitle ?? ACTION_SUBTITLE[action.action_type]
  const hasCliniciandBadge =
    action.provenance === 'clinician_authored' || action.provenance === 'clinician_confirmed'
  const walletBalance = member?.wallet_balance ?? 0

  return (
    <div style={{ minHeight: '100vh', background: '#F7F6F3', position: 'relative' }}>
      {/* Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'transparent',
        }}
      >
        <button
          onClick={() => navigate({ to: '/patient' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '8px 14px',
            borderRadius: 99,
            background: '#fff',
            border: 'none',
            boxShadow: '0 1px 4px rgba(19,35,58,.12)',
            cursor: 'pointer',
            color: '#13233A',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <ChevronLeft size={18} strokeWidth={2} />
          Back
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#5A6B80' }}>Care step</span>
        <button
          style={{
            width: 38,
            height: 38,
            borderRadius: 99,
            background: '#fff',
            border: 'none',
            boxShadow: '0 1px 4px rgba(19,35,58,.12)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#13233A',
          }}
        >
          <Share2 size={17} strokeWidth={1.75} />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '4px 20px 120px' }}>
        {/* Action header */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #EDEBE6',
            borderRadius: 20,
            padding: 20,
            boxShadow: '0 1px 2px rgba(19,35,58,.04), 0 12px 30px -22px rgba(19,35,58,.22)',
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 15,
                background: iconStyle.background,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ActionIcon size={26} strokeWidth={1.75} color={iconStyle.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#13233A', letterSpacing: '-0.015em', lineHeight: 1.25 }}>
                {action.action_title}
              </div>
              <div style={{ fontSize: 13, color: '#8794A5', marginTop: 4 }}>{subtitle}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {/* Status badge */}
                {action.status === 'overdue' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 99, background: '#FBEFDD', color: '#A6620F', fontSize: 12, fontWeight: 600 }}>
                    <span style={{ width: 5, height: 5, borderRadius: 99, background: '#D9821B', display: 'inline-block' }} />
                    Overdue
                  </span>
                )}
                {action.status === 'pending' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 99, background: '#EEF1F5', color: '#475569', fontSize: 12, fontWeight: 600 }}>
                    Pending
                  </span>
                )}
                {/* Provenance badge */}
                {hasCliniciandBadge && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 99, background: '#EDF4F3', border: '1px solid #CFE6E1', color: '#0B6F64', fontSize: 12, fontWeight: 600 }}>
                    <ShieldCheck size={11} strokeWidth={1.75} />
                    Clinician-authored
                  </span>
                )}
                {/* Due date */}
                {action.due_date && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 99, background: '#F5F4F0', color: '#8794A5', fontSize: 12, fontWeight: 500 }}>
                    <Calendar size={11} strokeWidth={1.75} />
                    {action.status === 'overdue' ? 'Was due' : 'Due'} {format(new Date(action.due_date), 'd MMM')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Why this matters */}
        {action.why_plain && (
          <div
            style={{
              background: '#EDF4F3',
              border: '1px solid #DBEAE7',
              borderRadius: 16,
              padding: '16px 18px',
              marginBottom: 14,
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <HeartPulse size={20} strokeWidth={1.75} color="#0B6F64" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0B6F64', letterSpacing: '0.04em', marginBottom: 6 }}>
                WHY THIS MATTERS
              </div>
              <div style={{ fontSize: 14, color: '#3A4A5E', lineHeight: 1.6 }}>
                {action.why_plain}
              </div>
            </div>
          </div>
        )}

        {/* Booking hero or success */}
        {booked ? (
          <div
            style={{
              background: '#E6F4EC',
              border: '1px solid #C6E6D1',
              borderRadius: 20,
              padding: '32px 20px',
              textAlign: 'center',
              marginBottom: 14,
            }}
          >
            <CheckCircle2 size={40} strokeWidth={1.5} color="#1F9D55" style={{ margin: '0 auto 12px', display: 'block' }} />
            <div style={{ fontSize: 17, fontWeight: 700, color: '#167A41', letterSpacing: '-0.01em' }}>Booking confirmed!</div>
            <div style={{ fontSize: 13.5, color: '#167A41', marginTop: 6 }}>
              You'll receive a confirmation shortly. Heading back…
            </div>
          </div>
        ) : (
          <>
            {/* Booking card */}
            <div
              style={{
                background: '#fff',
                border: '1px solid #EDEBE6',
                borderRadius: 20,
                padding: '18px 18px 20px',
                boxShadow: '0 1px 2px rgba(19,35,58,.04), 0 12px 30px -22px rgba(19,35,58,.22)',
                marginBottom: 14,
              }}
            >
              {/* Mode toggle */}
              <div
                style={{
                  display: 'flex',
                  background: '#F5F4F0',
                  borderRadius: 12,
                  padding: 4,
                  gap: 4,
                  marginBottom: 18,
                }}
              >
                {([{ id: 'home', label: 'Home collection', icon: Home }, { id: 'centre', label: 'Visit centre', icon: Building2 }] as const).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setMode(id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '9px 12px',
                      borderRadius: 9,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                      transition: 'all 0.15s',
                      background: mode === id ? '#fff' : 'transparent',
                      color: mode === id ? '#13233A' : '#8794A5',
                      boxShadow: mode === id ? '0 1px 3px rgba(19,35,58,.1)' : 'none',
                    }}
                  >
                    <Icon size={15} strokeWidth={1.75} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Context row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: '#5A6B80', padding: '0 2px' }}>
                <MapPin size={14} strokeWidth={1.75} color="#8794A5" />
                {mode === 'home'
                  ? 'Phlebotomist visits your home · takes ~10 min'
                  : 'Nearest lab: Metropolis · 2.1 km away'}
              </div>

              {/* Slot chips */}
              <div style={{ fontSize: 12, fontWeight: 700, color: '#8794A5', letterSpacing: '0.05em', marginBottom: 10 }}>
                PICK A SLOT
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SLOT_DATES.map((slot, i) => {
                  const sel = selectedSlot === i
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedSlot(i)}
                      style={{
                        padding: '9px 14px',
                        borderRadius: 12,
                        border: sel ? '1.5px solid #0E8C7F' : '1.5px solid #DDDBD6',
                        background: sel ? '#EDF4F3' : '#fff',
                        color: sel ? '#0B6F64' : '#3A4A5E',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.12s',
                      }}
                    >
                      {slot.label} · {slot.time}
                    </button>
                  )
                })}
              </div>

              {/* Wallet block */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 18,
                  padding: '13px 14px',
                  borderRadius: 13,
                  background: '#E6F4EC',
                }}
              >
                <Wallet size={20} strokeWidth={1.75} color="#167A41" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#167A41' }}>
                    {walletBalance > 0
                      ? `₹${walletBalance.toLocaleString('en-IN')} credits available`
                      : 'Covered by your plan'}
                  </div>
                  <div style={{ fontSize: 12, color: '#167A41', marginTop: 1 }}>₹0 to pay out of pocket</div>
                </div>
              </div>

              {/* Confirm button */}
              <button
                onClick={handleConfirm}
                disabled={selectedSlot === null}
                style={{
                  width: '100%',
                  marginTop: 16,
                  padding: '13px 20px',
                  borderRadius: 13,
                  border: 'none',
                  background: selectedSlot !== null ? '#0E8C7F' : '#D9D7D2',
                  color: selectedSlot !== null ? '#fff' : '#8794A5',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: selectedSlot !== null ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                  letterSpacing: '-0.01em',
                }}
              >
                Confirm booking
              </button>
            </div>

            {/* Can't do this right now? */}
            <div
              style={{
                background: '#fff',
                border: '1px solid #EDEBE6',
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => setDeclineOpen((v) => !v)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#3A4A5E',
                }}
              >
                Can't do this right now?
                {declineOpen ? <ChevronUp size={17} strokeWidth={2} /> : <ChevronDown size={17} strokeWidth={2} />}
              </button>
              {declineOpen && (
                <div style={{ borderTop: '1px solid #F0EDE8', padding: '14px 18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: '1.5px solid #DDDBD6',
                      background: '#fff',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#3A4A5E',
                    }}
                  >
                    <Bell size={17} strokeWidth={1.75} color="#8794A5" />
                    Remind me later
                  </button>
                  <button
                    onClick={() => { setDeclineOpen(false); setShowDecline(true) }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: '1.5px solid #DDDBD6',
                      background: '#fff',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#A8332F',
                    }}
                  >
                    <CircleSlash size={17} strokeWidth={1.75} color="#A8332F" />
                    I've decided not to
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Decline bottom sheet */}
      {showDecline && (
        <>
          {/* Scrim */}
          <div
            onClick={() => setShowDecline(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(19,35,58,.42)',
              backdropFilter: 'blur(1px)',
              zIndex: 40,
            }}
          />
          {/* Sheet */}
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: '390px',
              background: '#fff',
              borderRadius: '22px 22px 0 0',
              padding: '20px 20px 40px',
              zIndex: 50,
            }}
          >
            {/* Drag handle */}
            <div style={{ width: 36, height: 4, borderRadius: 99, background: '#D9D7D2', margin: '0 auto 20px' }} />

            <div style={{ fontSize: 18, fontWeight: 700, color: '#13233A', letterSpacing: '-0.015em', marginBottom: 6 }}>
              That's completely okay.
            </div>
            <div style={{ fontSize: 14, color: '#5A6B80', marginBottom: 20, lineHeight: 1.55 }}>
              Help us understand, so your care team can adjust your plan.
            </div>

            {/* Reason chips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              {DECLINE_REASONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setDeclineReason(r.id)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: declineReason === r.id ? '2px solid #0E8C7F' : '1.5px solid #DDDBD6',
                    background: declineReason === r.id ? '#EDF4F3' : '#fff',
                    color: declineReason === r.id ? '#0B6F64' : '#3A4A5E',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.12s',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Empathy notice */}
            <div style={{ fontSize: 12.5, color: '#8794A5', lineHeight: 1.55, marginBottom: 18, padding: '0 2px' }}>
              Your care navigator may reach out to see if there's a way we can help. No pressure.
            </div>

            <button
              onClick={handleDecline}
              disabled={!declineReason || submitting}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 13,
                border: 'none',
                background: !declineReason ? '#D9D7D2' : '#13233A',
                color: !declineReason ? '#8794A5' : '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: !declineReason ? 'default' : 'pointer',
                letterSpacing: '-0.01em',
              }}
            >
              {submitting ? 'Saving…' : 'Share with care team'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
