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
  Calendar,
  Check,
  CircleHelp,
  Clock,
} from 'lucide-react'
import { format, addDays } from 'date-fns'
import { useAuth } from '@/lib/auth/context'
import { getAction, scheduleAction, updateActionStatus, getMemberByProfileId } from '@/lib/api'
import { createBookingEvent } from '@/lib/api/clinical-events'
import { createNavigatorTask } from '@/lib/api/navigator-tasks'
import { ACTION_ICON, ACTION_SUBTITLE, actionIconStyle } from './actionConfig'

const DECLINE_REASONS = [
  { id: 'feels_better', label: 'Feeling better' },
  { id: 'logistics', label: 'Too busy' },
  { id: 'cost', label: 'Cost concern' },
  { id: 'trust', label: "Don't think I need it" },
  { id: 'other', label: 'Other' },
]

interface Props {
  actionId: string
}

export function ActionDetail({ actionId }: Props) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [mode, setMode] = useState<'home' | 'centre'>('home')
  const [selectedSlot, setSelectedSlot] = useState<number>(0)
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

  const simDay = new Date()
  const slots =
    mode === 'home'
      ? [
          { day: format(addDays(simDay, 1), 'EEE d'), time: '7:30 AM' },
          { day: format(addDays(simDay, 1), 'EEE d'), time: '9:00 AM' },
          { day: format(addDays(simDay, 2), 'EEE d'), time: '8:00 AM' },
        ]
      : [
          { day: 'Today', time: '5:30 PM' },
          { day: format(addDays(simDay, 1), 'EEE d'), time: '8:15 AM' },
          { day: format(addDays(simDay, 2), 'EEE d'), time: '11:00 AM' },
        ]

  async function handleConfirm() {
    if (!action || !member) return
    setSubmitting(true)
    const slotLabel = `${slots[selectedSlot].day} ${slots[selectedSlot].time}`
    const eventType =
      action.action_type === 'lab_test' && mode === 'home'
        ? ('home_collection_scheduled' as const)
        : ('appointment_booked' as const)
    await createBookingEvent(member.id, action.id, eventType, slotLabel)
    await scheduleAction(action.id)
    queryClient.invalidateQueries({ queryKey: ['active-plan'] })
    setBooked(true)
    setSubmitting(false)
    await new Promise((r) => setTimeout(r, 1400))
    navigate({ to: '/patient' })
  }

  async function handleDecline() {
    if (!declineReason || !action || !member) return
    setSubmitting(true)
    await updateActionStatus(action.id, 'declined', { declineReason })
    if (action.clinical_priority === 'mandatory') {
      await createNavigatorTask(
        member.id,
        'declined_mandatory',
        'p1',
        `Patient declined mandatory action: ${action.title}`,
      )
    }
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
  const subtitle = ACTION_SUBTITLE[action.action_type]
  const hasCliniciandBadge =
    action.provenance === 'clinician_authored' || action.provenance === 'clinician_confirmed'
  const walletBalance = member?.wallet_balance ?? 0
  const walletLimit = 5000
  const confirmLabel =
    action.action_type === 'follow_up_consult'
      ? 'Confirm appointment'
      : mode === 'home'
        ? 'Confirm home collection'
        : 'Confirm centre visit'

  return (
    <div style={{ minHeight: '100vh', background: '#F7F6F3', position: 'relative' }}>
      {/* Nav row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 18px 10px',
        }}
      >
        <button
          onClick={() => navigate({ to: '/patient' })}
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: '#fff',
            border: '1px solid #ECEAE5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ChevronLeft size={20} strokeWidth={1.75} color="#13233A" />
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#5A6B80' }}>Care step</span>
        <button
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: '#fff',
            border: '1px solid #ECEAE5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Share2 size={18} strokeWidth={1.75} color="#5A6B80" />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '6px 20px 120px' }}>
        {/* Action header — icon + title, no enclosing card */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
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
            <div
              style={{
                fontSize: 21,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                color: '#13233A',
              }}
            >
              {action.title}
            </div>
            <div style={{ fontSize: 12.5, color: '#8794A5', marginTop: 3 }}>{subtitle}</div>
          </div>
        </div>

        {/* Status + provenance badges row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {action.status === 'overdue' && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                background: '#FBEFDD',
                color: '#A6620F',
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 99, background: '#D9821B' }} />
              Overdue
              {action.due_date ? ` · ${format(new Date(action.due_date), 'd MMM')}` : ''}
            </span>
          )}
          {(action.status === 'pending' || action.status === 'scheduled') && action.due_date && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                background: '#EEF1F5',
                color: '#475569',
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              <Calendar size={13} strokeWidth={1.75} />
              Due {format(new Date(action.due_date), 'd MMM')}
            </span>
          )}
          {hasCliniciandBadge && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 11px',
                borderRadius: 8,
                background: '#EDF4F3',
                border: '1px solid #CFE6E1',
                color: '#0B6F64',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={14} strokeWidth={1.75} />
              Clinician-authored
            </span>
          )}
        </div>

        {/* Why this matters */}
        {action.why_plain && (
          <div
            style={{
              background: '#EDF4F3',
              border: '1px solid #DBEAE7',
              borderRadius: 16,
              padding: '16px 18px',
              marginBottom: 18,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13.5,
                fontWeight: 600,
                color: '#0B6F64',
                marginBottom: 8,
              }}
            >
              <HeartPulse size={17} strokeWidth={1.75} />
              Why this matters
            </div>
            <div style={{ fontSize: 14, color: '#2E4A45', lineHeight: 1.55 }}>
              {action.why_plain}
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
            <CheckCircle2
              size={40}
              strokeWidth={1.5}
              color="#1F9D55"
              style={{ margin: '0 auto 12px', display: 'block' }}
            />
            <div style={{ fontSize: 17, fontWeight: 600, color: '#167A41', letterSpacing: '-0.01em' }}>
              Booking confirmed!
            </div>
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
                padding: 20,
                boxShadow: '0 1px 2px rgba(19,35,58,.04), 0 16px 38px -22px rgba(19,35,58,.22)',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  color: '#13233A',
                  marginBottom: 14,
                }}
              >
                Book your test
              </div>

              {/* Mode toggle */}
              <div
                style={{
                  display: 'flex',
                  background: '#F1EFEB',
                  borderRadius: 13,
                  padding: 4,
                  gap: 3,
                  marginBottom: 18,
                }}
              >
                {(
                  [
                    { id: 'home', label: 'Home collection', Icon: Home },
                    { id: 'centre', label: 'Visit a centre', Icon: Building2 },
                  ] as const
                ).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => { setMode(id); setSelectedSlot(0) }}
                    style={{
                      fontFamily: 'inherit',
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 13.5,
                      fontWeight: 600,
                      padding: '10px',
                      borderRadius: 10,
                      transition: 'all .15s',
                      background: mode === id ? '#fff' : 'transparent',
                      color: mode === id ? '#0B6F64' : '#5A6B80',
                      boxShadow: mode === id ? '0 1px 2px rgba(19,35,58,.12)' : 'none',
                    }}
                  >
                    <Icon size={16} strokeWidth={1.75} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Context row — address / centre */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '11px 13px',
                  borderRadius: 12,
                  background: '#F7F6F3',
                  marginBottom: 18,
                }}
              >
                {mode === 'home' ? (
                  <MapPin size={17} strokeWidth={1.75} color="#5A6B80" />
                ) : (
                  <Building2 size={17} strokeWidth={1.75} color="#5A6B80" />
                )}
                <span style={{ fontSize: 13, color: '#3A4A5E', fontWeight: 500, flex: 1 }}>
                  {mode === 'home'
                    ? '14, Lotus Apartments, HSR Layout'
                    : 'Apollo Diagnostics, 100ft Road · 1.2 km'}
                </span>
                <span
                  style={{ fontSize: 12.5, fontWeight: 600, color: '#0B6F64', cursor: 'pointer' }}
                >
                  Change
                </span>
              </div>

              {/* Slot picker */}
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#5A6B80',
                  marginBottom: 10,
                }}
              >
                Choose a slot
              </div>
              <div style={{ display: 'flex', gap: 9, marginBottom: 18 }}>
                {slots.map((slot, i) => {
                  const sel = selectedSlot === i
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedSlot(i)}
                      style={{
                        fontFamily: 'inherit',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 3,
                        cursor: 'pointer',
                        padding: '11px 6px',
                        borderRadius: 13,
                        transition: 'all .15s',
                        border: sel ? '1.5px solid #0E8C7F' : '1.5px solid #E4E2DD',
                        background: sel ? '#EDF4F3' : '#fff',
                        color: sel ? '#0B6F64' : '#3A4A5E',
                        boxShadow: sel ? '0 0 0 3px rgba(14,140,127,.12)' : 'none',
                      }}
                    >
                      <span style={{ fontSize: 11.5, fontWeight: 500, opacity: 0.75 }}>
                        {slot.day}
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {slot.time}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Wallet / cost line */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 13,
                  padding: 14,
                  borderRadius: 14,
                  background: '#E6F4EC',
                  border: '1px solid #D2EBDC',
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 11,
                    background: '#fff',
                    color: '#1F9D55',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Wallet size={21} strokeWidth={1.75} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#167A41', lineHeight: 1.35 }}>
                    Covered by your Acme health wallet
                  </div>
                  <div style={{ fontSize: 12, color: '#3F7A57', marginTop: 2 }}>
                    Balance ₹{walletBalance.toLocaleString('en-IN')} of ₹{walletLimit.toLocaleString('en-IN')} this year
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#167A41',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    ₹0
                  </div>
                  <div style={{ fontSize: 11, color: '#3F7A57' }}>to pay</div>
                </div>
              </div>

              {/* Confirm button */}
              <button
                onClick={handleConfirm}
                disabled={submitting}
                style={{
                  fontFamily: 'inherit',
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: submitting ? '#D9D7D2' : '#0E8C7F',
                  color: submitting ? '#8794A5' : '#fff',
                  border: 'none',
                  borderRadius: 13,
                  padding: 15,
                  fontSize: 15.5,
                  fontWeight: 600,
                  cursor: submitting ? 'default' : 'pointer',
                  boxShadow: '0 2px 4px rgba(14,140,127,.3)',
                }}
              >
                <Check size={19} strokeWidth={2.5} />
                {submitting ? 'Booking…' : confirmLabel}
              </button>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: '#8794A5',
                  marginTop: 11,
                }}
              >
                <Clock size={13} strokeWidth={1.75} />
                Takes 2 minutes · a phlebotomist visits you
              </div>
            </div>

            {/* Can't do this right now */}
            <div
              style={{
                background: '#fff',
                border: '1px solid #EDEBE6',
                borderRadius: 18,
                overflow: 'hidden',
                marginBottom: 18,
              }}
            >
              <button
                onClick={() => setDeclineOpen((v) => !v)}
                style={{
                  fontFamily: 'inherit',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  background: 'transparent',
                  border: 'none',
                  padding: '16px 18px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#3A4A5E',
                  }}
                >
                  <CircleHelp size={18} strokeWidth={1.75} color="#8794A5" />
                  Can't do this right now?
                </span>
                <ChevronDown
                  size={18}
                  strokeWidth={1.75}
                  color="#8794A5"
                  style={{
                    transform: declineOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform .2s',
                    flexShrink: 0,
                  }}
                />
              </button>
              {declineOpen && (
                <div style={{ padding: '0 14px 14px' }}>
                  <button
                    style={{
                      fontFamily: 'inherit',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      background: '#F7F6F3',
                      border: 'none',
                      borderRadius: 12,
                      padding: '13px 14px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      marginBottom: 8,
                    }}
                  >
                    <Bell size={18} strokeWidth={1.75} color="#475569" />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#13233A' }}>
                      Remind me later
                    </span>
                    <span style={{ fontSize: 12, color: '#8794A5' }}>in 3 days</span>
                    <ChevronDown
                      size={17}
                      strokeWidth={1.75}
                      color="#B7BFC9"
                      style={{ transform: 'rotate(-90deg)' }}
                    />
                  </button>
                  <button
                    onClick={() => {
                      setDeclineOpen(false)
                      setShowDecline(true)
                    }}
                    style={{
                      fontFamily: 'inherit',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      background: '#F7F6F3',
                      border: 'none',
                      borderRadius: 12,
                      padding: '13px 14px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <CircleSlash size={18} strokeWidth={1.75} color="#5A6B80" />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#13233A' }}>
                      I've decided not to
                    </span>
                    <ChevronDown
                      size={17}
                      strokeWidth={1.75}
                      color="#B7BFC9"
                      style={{ transform: 'rotate(-90deg)' }}
                    />
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
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: 390,
              background: '#fff',
              borderRadius: '28px 28px 42px 42px',
              padding: '10px 22px 30px',
              zIndex: 50,
              boxShadow: '0 -16px 50px -16px rgba(19,35,58,.3)',
            }}
          >
            {/* Drag handle */}
            <div
              style={{
                width: 38,
                height: 5,
                borderRadius: 99,
                background: '#E0DDD7',
                margin: '6px auto 18px',
              }}
            />

            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 13,
                background: '#EEF1F5',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <CircleSlash size={23} strokeWidth={1.75} />
            </div>
            <div
              style={{
                fontSize: 19,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                lineHeight: 1.2,
                color: '#13233A',
              }}
            >
              That's completely okay
            </div>
            <div style={{ fontSize: 14, color: '#5A6B80', lineHeight: 1.55, marginTop: 8 }}>
              If you'd like, tell us why — it helps your care team support you. Totally optional.
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: '#5A6B80', margin: '20px 0 11px' }}>
              Reason{' '}
              <span style={{ fontWeight: 500, color: '#A2AAB4' }}>(optional)</span>
            </div>

            {/* Horizontal chip wrap */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
              {DECLINE_REASONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setDeclineReason(r.id)}
                  style={{
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    fontSize: 13.5,
                    fontWeight: 600,
                    padding: '9px 15px',
                    borderRadius: 11,
                    transition: 'all .15s',
                    border: declineReason === r.id ? '1.5px solid #0E8C7F' : '1.5px solid #E4E2DD',
                    background: declineReason === r.id ? '#EDF4F3' : '#fff',
                    color: declineReason === r.id ? '#0B6F64' : '#3A4A5E',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Empathy notice */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '13px 14px',
                borderRadius: 13,
                background: '#F2F8F7',
                border: '1px solid #DBEAE7',
                margin: '20px 0 18px',
              }}
            >
              <HeartPulse size={18} strokeWidth={1.75} color="#0B6F64" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: '#2E4A45', lineHeight: 1.5 }}>
                No problem — we'll let your care team know in case they can help. A navigator may
                reach out, never to pressure you.
              </span>
            </div>

            <button
              onClick={handleDecline}
              disabled={submitting}
              style={{
                fontFamily: 'inherit',
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: submitting ? '#8794A5' : '#13233A',
                color: '#fff',
                border: 'none',
                borderRadius: 13,
                padding: 15,
                fontSize: 15,
                fontWeight: 600,
                cursor: submitting ? 'default' : 'pointer',
              }}
            >
              {submitting ? 'Saving…' : 'Share with my care team'}
            </button>
            <button
              onClick={() => setShowDecline(false)}
              style={{
                fontFamily: 'inherit',
                width: '100%',
                background: 'transparent',
                color: '#0B6F64',
                border: 'none',
                padding: 14,
                fontSize: 14.5,
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 4,
              }}
            >
              Actually, I'll book it
            </button>
          </div>
        </>
      )}
    </div>
  )
}
