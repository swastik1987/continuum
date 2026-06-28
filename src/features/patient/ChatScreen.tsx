import { useState, useEffect, useRef, Fragment, type CSSProperties } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { format, isToday, isYesterday } from 'date-fns'
import {
  ChevronLeft, Phone, EllipsisVertical, Info,
  CalendarCheck, CircleHelp, CheckCheck, LoaderCircle, Plus, Smile, Send,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useMember } from '@/lib/hooks/useMember'
import { listMessages, insertMessage } from '@/lib/api/messages'
import type { MessageRow } from '@/lib/api/messages'

// ── Helpers ───────────────────────────────────────────────────────────────────

function dayLabel(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isToday(d)) return 'TODAY'
  if (isYesterday(d)) return 'YESTERDAY'
  return format(d, 'EEE, d MMM').toUpperCase()
}

function msgTime(dateStr: string | null): string {
  if (!dateStr) return ''
  return format(new Date(dateStr), 'HH:mm')
}

function groupByDay(messages: MessageRow[]): Array<{ day: string; msgs: MessageRow[] }> {
  const map = new Map<string, MessageRow[]>()
  for (const m of messages) {
    const key = m.created_at ? format(new Date(m.created_at), 'yyyy-MM-dd') : 'unknown'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(m)
  }
  return Array.from(map.entries()).map(([key, msgs]) => ({
    day: key === 'unknown' ? '—' : dayLabel(key + 'T12:00:00'),
    msgs,
  }))
}

function isHandoff(body: string): boolean {
  return body.startsWith('—') && body.includes('Navigator')
}

function pickAutoReply(body: string): string {
  const s = body.toLowerCase()
  if (s.includes('book') || s.includes('test') || s.includes('collect') || s.includes('schedule'))
    return 'Great! I can schedule the home collection for your HbA1c test 🏠 Would morning (7–9am) or afternoon (2–4pm) suit you better?'
  if (s.includes('call') || s.includes('phone') || s.includes('ring'))
    return "Of course — I'll arrange a callback for you. Priya will ring on your registered number shortly."
  if (s.includes('?') || s.includes('question') || s.includes('how') || s.includes('what') || s.includes('when') || s.includes('why'))
    return 'Of course, ask away! Happy to help 🙏'
  return "Got it — Priya from your care team will follow up with you shortly. 🙏"
}

// ── Typing bubble ─────────────────────────────────────────────────────────────

function TypingBubble() {
  return (
    <>
      <style>{`@keyframes tdot{0%,80%,100%{opacity:.3}40%{opacity:1}}`}</style>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', maxWidth: '88%' }}>
        <div style={{ marginBottom: 2 }}>
          <ContinuumRing size={28} />
        </div>
        <div style={{ background: '#fff', borderRadius: '16px 16px 16px 4px', padding: '14px 16px', boxShadow: '0 1px 1px rgba(19,35,58,.07)' }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 14 }}>
            {[0, 0.18, 0.36].map((delay, i) => (
              <span key={i} style={{ width: 7, height: 7, borderRadius: 99, background: '#B0BCCA', display: 'inline-block', animation: `tdot 1.4s ease-in-out ${delay}s infinite` }} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Shared style ──────────────────────────────────────────────────────────────

const CHIP_STYLE: CSSProperties = {
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: '#fff',
  color: '#0B6F64',
  border: '1.5px solid #BFDCD7',
  borderRadius: 999,
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

// ── Avatars ───────────────────────────────────────────────────────────────────

function ContinuumRing({ size }: { size: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 99,
      background: '#EDF4F3',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width={size * 0.82} height={size * 0.82} viewBox="0 0 44 44" fill="none">
        <circle cx="22" cy="22" r="16" stroke="#CFE6E1" strokeWidth="6" />
        <circle cx="22" cy="22" r="16" stroke="#0E8C7F" strokeWidth="6"
          strokeLinecap="round" strokeDasharray="75 101"
          transform="rotate(-90 22 22)" />
      </svg>
    </div>
  )
}

function NavigatorAvatar() {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 99,
      background: '#13233A', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontSize: 11, fontWeight: 700,
    }}>P</div>
  )
}

// ── Bubble components ─────────────────────────────────────────────────────────

function SystemBubble({ msg }: { msg: MessageRow }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', maxWidth: '88%' }}>
      <div style={{ marginBottom: 2 }}>
        <ContinuumRing size={28} />
      </div>
      <div style={{
        background: '#fff', borderRadius: '16px 16px 16px 4px',
        padding: '12px 14px', boxShadow: '0 1px 1px rgba(19,35,58,.07)',
      }}>
        <div style={{ fontSize: 14, color: '#13233A', lineHeight: 1.55 }}>{msg.body}</div>
        <div style={{ fontSize: 10.5, color: '#A2AAB4', textAlign: 'right', marginTop: 5 }}>
          {msgTime(msg.created_at)}
        </div>
      </div>
    </div>
  )
}

function MemberBubble({ msg }: { msg: MessageRow }) {
  return (
    <div style={{ alignSelf: 'flex-end', maxWidth: '80%' }}>
      <div style={{
        background: '#E6F4EC', borderRadius: '16px 16px 4px 16px',
        padding: '12px 14px', boxShadow: '0 1px 1px rgba(19,35,58,.07)',
      }}>
        <div style={{ fontSize: 14, color: '#16331F', lineHeight: 1.55 }}>{msg.body}</div>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'flex-end', gap: 4, marginTop: 5,
        }}>
          <span style={{ fontSize: 10.5, color: '#6FA585' }}>{msgTime(msg.created_at)}</span>
          <CheckCheck size={15} color="#0E8C7F" />
        </div>
      </div>
    </div>
  )
}

function NavigatorBubble({ msg }: { msg: MessageRow }) {
  const name = msg.sender === 'clinician' ? 'Dr. Mehra' : 'Priya'
  const role = msg.sender === 'clinician' ? 'Clinician' : 'Care Navigator'
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', maxWidth: '88%' }}>
      <div style={{ marginBottom: 2 }}>
        <NavigatorAvatar />
      </div>
      <div style={{
        background: '#fff', borderRadius: '16px 16px 16px 4px',
        padding: '12px 14px', boxShadow: '0 1px 1px rgba(19,35,58,.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0B6F64' }}>{name}</span>
          <span style={{ fontSize: 11, color: '#8794A5' }}>{role}</span>
        </div>
        <div style={{ fontSize: 14, color: '#13233A', lineHeight: 1.55 }}>{msg.body}</div>
        <div style={{ fontSize: 10.5, color: '#A2AAB4', textAlign: 'right', marginTop: 5 }}>
          {msgTime(msg.created_at)}
        </div>
      </div>
    </div>
  )
}

function HandoffPill({ msg }: { msg: MessageRow }) {
  const label = msg.body.replace(/^—\s*/, '').replace(/\s*—$/, '')
  return (
    <div style={{ alignSelf: 'center' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '7px 15px', borderRadius: 999,
        background: '#EEF1F5', border: '1px solid #DEE4EC',
      }}>
        <LoaderCircle size={13} color="#64748B" />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{label}</span>
      </div>
    </div>
  )
}

function ContextualChips({ onSend }: { onSend: (text: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, paddingLeft: 36, marginTop: 4, flexWrap: 'wrap' }}>
      <button style={CHIP_STYLE} onClick={() => onSend("I'd like to book my test")}>
        <CalendarCheck size={15} /> Book now
      </button>
      <button style={CHIP_STYLE} onClick={() => onSend('I have a question')}>
        <CircleHelp size={15} /> I have a question
      </button>
    </div>
  )
}

// ── MessageItem ───────────────────────────────────────────────────────────────

interface MessageItemProps {
  msg: MessageRow
  showChips: boolean
  onChipSend: (text: string) => void
}

function MessageItem({ msg, showChips, onChipSend }: MessageItemProps) {
  if (isHandoff(msg.body)) return <HandoffPill msg={msg} />
  if (msg.sender === 'member') return <MemberBubble msg={msg} />

  const chips = showChips ? <ContextualChips onSend={onChipSend} /> : null

  if (msg.sender === 'navigator' || msg.sender === 'clinician') {
    return (
      <Fragment>
        <NavigatorBubble msg={msg} />
        {chips}
      </Fragment>
    )
  }

  // system
  return (
    <Fragment>
      <SystemBubble msg={msg} />
      {chips}
    </Fragment>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function ChatScreen() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const threadRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const { data: member } = useMember()
  const memberId = member?.id

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', memberId],
    queryFn: () => listMessages(memberId!),
    enabled: !!memberId,
  })

  // Live updates via Supabase Realtime
  useEffect(() => {
    if (!memberId) return
    const channel = supabase
      .channel(`chat:${memberId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `member_id=eq.${memberId}` },
        () => { queryClient.invalidateQueries({ queryKey: ['messages', memberId] }) },
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [memberId, queryClient])

  // Auto-scroll to bottom on new messages or when typing indicator appears
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [messages.length, isTyping])

  const sendMessage = async (body: string) => {
    const trimmed = body.trim()
    if (!memberId || !trimmed) return
    setInputValue('')
    setIsTyping(true)

    await insertMessage({ member_id: memberId, sender: 'member', channel: 'app', body: trimmed })
    queryClient.invalidateQueries({ queryKey: ['messages', memberId] })

    try {
      const { error } = await supabase.functions.invoke('conversational-reply', {
        body: { member_id: memberId, message: trimmed },
      })
      if (error) throw error
      // Realtime subscription updates messages; also invalidate for safety
      queryClient.invalidateQueries({ queryKey: ['messages', memberId] })
    } catch {
      // Fallback: local scripted reply
      const reply = pickAutoReply(trimmed)
      await insertMessage({ member_id: memberId, sender: 'navigator', channel: 'app', body: reply })
      queryClient.invalidateQueries({ queryKey: ['messages', memberId] })
    } finally {
      setIsTyping(false)
    }
  }

  const grouped = groupByDay(messages)
  const lastMsg = messages[messages.length - 1]
  const showChips = !!lastMsg && ['system', 'navigator', 'clinician'].includes(lastMsg.sender)

  return (
    <div style={{
      height: 'calc(100svh - 4.5rem)',
      display: 'flex', flexDirection: 'column', minHeight: 0,
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px 12px',
        background: '#fff', borderBottom: '1px solid #ECEAE5', flexShrink: 0,
      }}>
        <button onClick={() => void navigate({ to: '/patient' })} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', marginRight: 2 }}>
          <ChevronLeft size={24} color="#13233A" />
        </button>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <ContinuumRing size={42} />
          <span style={{
            position: 'absolute', right: 1, bottom: 1,
            width: 11, height: 11, borderRadius: 99,
            background: '#1F9D55', border: '2px solid #fff',
          }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: '-0.01em', color: '#13233A' }}>
            Continuum Care Team
          </div>
          <div style={{ fontSize: 12, color: '#1F9D55', fontWeight: 500, marginTop: 1 }}>
            Online · typically replies in minutes
          </div>
        </div>
        <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
          <Phone size={20} color="#0E8C7F" />
        </button>
        <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
          <EllipsisVertical size={20} color="#8794A5" />
        </button>
      </div>

      {/* Demo banner */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        padding: '7px 16px', background: '#FBEFDD', flexShrink: 0,
      }}>
        <Info size={13} color="#A6620F" />
        <span style={{ fontSize: 11.5, color: '#A6620F', fontWeight: 500 }}>
          Simulated WhatsApp experience for the prototype
        </span>
      </div>

      {/* Thread */}
      <div
        ref={threadRef}
        style={{
          flex: 1, overflowY: 'auto', minHeight: 0,
          background: '#EAE8E2', padding: '18px 14px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        {grouped.map(({ day, msgs }) => (
          <Fragment key={day}>
            <div style={{
              alignSelf: 'center', padding: '4px 13px', borderRadius: 999,
              background: 'rgba(255,255,255,.72)', fontSize: 11, fontWeight: 600,
              color: '#8794A5', marginBottom: 2,
            }}>
              {day}
            </div>
            {msgs.map((msg) => {
              const isLast = msg === messages[messages.length - 1]
              return (
                <MessageItem
                  key={msg.id}
                  msg={msg}
                  showChips={isLast && showChips}
                  onChipSend={sendMessage}
                />
              )
            })}
          </Fragment>
        ))}

        {isTyping && <TypingBubble />}

        {!memberId && (
          <div style={{ alignSelf: 'center', fontSize: 13, color: '#A2AAB4', marginTop: 48 }}>
            Loading conversation…
          </div>
        )}
      </div>

      {/* Persistent quick-reply bar */}
      <div style={{
        display: 'flex', gap: 8, padding: '9px 14px 8px',
        background: '#F7F6F3', overflowX: 'auto',
        borderTop: '1px solid #ECEAE5', flexShrink: 0,
      }}>
        {[
          { label: '📞 Call me',  body: 'Can I get a call back?' },
          { label: 'Prefer chat', body: "I'd prefer to continue on chat." },
          { label: 'Book test',   body: "I'd like to book my test." },
        ].map(({ label, body }) => (
          <button key={label} style={{ ...CHIP_STYLE, fontSize: 12.5, padding: '7px 13px' }}
            onClick={() => void sendMessage(body)}>
            {label}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 14px 20px', background: '#F7F6F3', flexShrink: 0,
      }}>
        <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
          <Plus size={24} color="#8794A5" />
        </button>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: '#fff', border: '1px solid #E4E2DD',
          borderRadius: 999, padding: '10px 16px',
        }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void sendMessage(inputValue)
              }
            }}
            placeholder="Message your care team…"
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: 14, color: '#13233A',
              background: 'transparent', fontFamily: 'inherit',
            }}
          />
          <Smile size={18} color="#C0C8D2" />
        </div>
        <button
          onClick={() => void sendMessage(inputValue)}
          disabled={!inputValue.trim()}
          style={{
            width: 44, height: 44, borderRadius: 99, border: 'none', flexShrink: 0,
            background: inputValue.trim() ? '#0E8C7F' : '#E4E2DD',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: inputValue.trim() ? 'pointer' : 'default',
            boxShadow: inputValue.trim() ? '0 2px 6px rgba(14,140,127,.30)' : 'none',
            transition: 'background 0.15s, box-shadow 0.15s',
          }}
        >
          <Send size={18} color={inputValue.trim() ? '#fff' : '#A2AAB4'} />
        </button>
      </div>

    </div>
  )
}
