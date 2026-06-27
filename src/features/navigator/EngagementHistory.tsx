import { MessageCircle, Smartphone, Phone, PhoneMissed, CheckCheck, CornerUpLeft } from 'lucide-react'
import type { Tables } from '@/lib/database.types'

type NudgeRow = Tables<'nudges'>

type ChannelMeta = {
  Icon: React.FC<{ size?: number; strokeWidth?: number }>
  bg: string
  iconColor: string
  label: string
}

const CHANNEL_META: Record<string, ChannelMeta> = {
  whatsapp: { Icon: MessageCircle, bg: '#E6F4EC', iconColor: '#167A41', label: 'WhatsApp' },
  app: { Icon: Smartphone, bg: '#EDF4F3', iconColor: '#0B6F64', label: 'App push' },
  sms: { Icon: MessageCircle, bg: '#EEF1F5', iconColor: '#475569', label: 'SMS' },
  call: { Icon: Phone, bg: '#FBEFDD', iconColor: '#A6620F', label: 'Call' },
}

type StatusChip = { bg: string; text: string; label: string; Icon?: React.FC<{ size?: number; strokeWidth?: number }> }

function statusChip(nudge: NudgeRow): StatusChip {
  if (nudge.status === 'responded') {
    return { bg: '#FAE8E7', text: '#A8332F', label: nudge.response_text ? 'Responded · Declined' : 'Responded', Icon: CornerUpLeft }
  }
  if (nudge.status === 'read' || nudge.status === 'delivered') {
    return { bg: '#EEF1F5', text: '#475569', label: 'Read · no response', Icon: CheckCheck }
  }
  if (nudge.status === 'sent') {
    return { bg: '#EDF4F3', text: '#0B6F64', label: 'Sent', Icon: CheckCheck }
  }
  if (nudge.status === 'suppressed') {
    return { bg: '#FAE8E7', text: '#A8332F', label: 'Suppressed' }
  }
  return { bg: '#EEF1F5', text: '#475569', label: nudge.status }
}

function nudgeTitle(nudge: NudgeRow): string {
  const channel = CHANNEL_META[nudge.channel]?.label ?? nudge.channel
  const key = nudge.template_key ?? 'outreach'
  const formatted = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return `${channel} · ${formatted}`
}

function dateLabel(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function EngagementHistory({ nudges }: { nudges: NudgeRow[] }) {
  const visible = nudges.slice(0, 6)

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #ECEAE5',
        borderRadius: '16px',
        padding: '22px',
        boxShadow: '0 1px 2px rgba(19,35,58,.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
        <h2 style={{ fontSize: '15.5px', fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>
          Engagement history
        </h2>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8794A5' }}>
          LAST 14 DAYS
        </span>
      </div>
      <div style={{ fontSize: '12.5px', color: '#8794A5', marginBottom: '18px' }}>
        Nudges sent, read &amp; responded.
      </div>

      {visible.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#8794A5', textAlign: 'center', padding: '16px 0' }}>
          No engagement events recorded yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {visible.map((nudge, idx) => {
            const ch = CHANNEL_META[nudge.channel] ?? CHANNEL_META.app
            const { Icon: ChIcon, bg: chBg, iconColor } = ch
            const chip = statusChip(nudge)
            const isLast = idx === visible.length - 1

            return (
              <div key={nudge.id} style={{ display: 'flex', gap: '12px', paddingBottom: isLast ? 0 : '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: chBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {nudge.status === 'sent' && nudge.channel === 'call'
                      ? <PhoneMissed size={16} strokeWidth={1.75} />
                      : <ChIcon size={16} strokeWidth={1.75} />
                    }
                  </div>
                  {!isLast && (
                    <div style={{ flex: 1, width: '2px', background: '#ECEAE5', marginTop: '6px' }} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0, paddingTop: '1px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{nudgeTitle(nudge)}</div>
                    <span style={{ fontSize: '11px', color: '#A2AAB4', whiteSpace: 'nowrap' }}>
                      {dateLabel(nudge.sent_at)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '6px', background: chip.bg, color: chip.text, fontSize: '11px', fontWeight: 600 }}>
                      {chip.Icon && <chip.Icon size={12} strokeWidth={1.75} />}
                      {chip.label}
                    </span>
                  </div>

                  {nudge.response_text && (
                    <div style={{ fontSize: '12px', color: '#5A6B80', marginTop: '8px', lineHeight: 1.45, padding: '9px 11px', background: '#F7F6F3', borderRadius: '9px' }}>
                      "{nudge.response_text}"
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
