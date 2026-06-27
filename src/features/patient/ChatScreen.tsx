import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Phone, MoreVertical, Info, CheckCheck, Loader, Plus, Send } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/lib/auth/context'
import { getMemberByProfileId, listMessages, insertMessage } from '@/lib/api'
import type { MessageRow } from '@/lib/api/messages'

const QUICK_REPLIES = [
  'How is my care plan looking?',
  'When is my next step due?',
  'Can someone call me?',
]

function isHandoffChip(msg: MessageRow) {
  return msg.sender === 'system' && msg.body.startsWith('—')
}

function ContinuumAvatar() {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 99,
        background: '#EDF4F3',
        border: '1.5px solid #0E8C7F',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 800, color: '#0E8C7F' }}>C</span>
    </div>
  )
}

function NavigatorAvatar() {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 99,
        background: '#13233A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>P</span>
    </div>
  )
}

function MessageBubble({ msg, prevSender }: { msg: MessageRow; prevSender: string | null }) {
  if (isHandoffChip(msg)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '6px 14px',
            borderRadius: 99,
            background: '#EEF1F5',
            color: '#5A6B80',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <Loader size={12} strokeWidth={1.75} />
          {msg.body.replace(/^—\s*/, '').replace(/\s*—$/, '')}
        </span>
      </div>
    )
  }

  if (msg.sender === 'member') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingLeft: 48 }}>
        <div style={{ maxWidth: '80%' }}>
          <div
            style={{
              background: '#E6F4EC',
              borderRadius: '16px 16px 4px 16px',
              padding: '10px 14px',
              fontSize: 14,
              color: '#13233A',
              lineHeight: 1.55,
            }}
          >
            {msg.body}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <span style={{ fontSize: 11, color: '#8794A5' }}>
              {format(new Date(msg.created_at), 'h:mm a')}
            </span>
            <CheckCheck size={14} strokeWidth={1.75} color="#0E8C7F" />
          </div>
        </div>
      </div>
    )
  }

  const isNav = msg.sender === 'navigator'
  const showAvatar = prevSender !== msg.sender

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, paddingRight: 48 }}>
      <div style={{ width: 28, flexShrink: 0 }}>
        {showAvatar && (isNav ? <NavigatorAvatar /> : <ContinuumAvatar />)}
      </div>
      <div style={{ maxWidth: '80%' }}>
        {showAvatar && isNav && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0E8C7F' }}>Priya</span>
            <span style={{ fontSize: 11.5, color: '#8794A5' }}>Care Navigator</span>
          </div>
        )}
        <div
          style={{
            background: '#fff',
            borderRadius: '16px 16px 16px 4px',
            padding: '10px 14px',
            fontSize: 14,
            color: '#13233A',
            lineHeight: 1.55,
            boxShadow: '0 1px 2px rgba(19,35,58,.06)',
          }}
        >
          {msg.body}
        </div>
        <div style={{ marginTop: 3 }}>
          <span style={{ fontSize: 11, color: '#8794A5' }}>
            {format(new Date(msg.created_at), 'h:mm a')}
          </span>
        </div>
      </div>
    </div>
  )
}

export function ChatScreen() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState('')

  const { data: member } = useQuery({
    queryKey: ['member', profile?.id],
    queryFn: () => getMemberByProfileId(profile!.id),
    enabled: !!profile,
  })

  const memberId = member?.id

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', memberId],
    queryFn: () => listMessages(memberId!),
    enabled: !!memberId,
    refetchInterval: 30_000,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSend(text?: string) {
    const body = (text ?? draft).trim()
    if (!body || !memberId) return
    setDraft('')
    const msg = await insertMessage({
      member_id: memberId,
      sender: 'member',
      channel: 'app',
      body,
    })
    if (msg) {
      queryClient.setQueryData<MessageRow[]>(['messages', memberId], (old) => [
        ...(old ?? []),
        msg,
      ])
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F7F6F3' }}>
      {/* Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: '#fff',
          borderBottom: '1px solid #ECEAE5',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <button
          onClick={() => navigate({ to: '/patient' })}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#13233A', padding: 4, display: 'flex' }}
        >
          <ChevronLeft size={22} strokeWidth={1.75} />
        </button>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 99,
            background: '#EDF4F3',
            border: '2px solid #0E8C7F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 800, color: '#0E8C7F' }}>C</span>
          <span
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 9,
              height: 9,
              borderRadius: 99,
              background: '#22C55E',
              border: '2px solid #fff',
            }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#13233A', letterSpacing: '-0.01em' }}>
            Continuum Care Team
          </div>
          <div style={{ fontSize: 12, color: '#22C55E', fontWeight: 500 }}>
            Online · typically replies in minutes
          </div>
        </div>
        <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#3A4A5E', padding: 4, display: 'flex' }}>
          <Phone size={19} strokeWidth={1.75} />
        </button>
        <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#3A4A5E', padding: 4, display: 'flex' }}>
          <MoreVertical size={19} strokeWidth={1.75} />
        </button>
      </div>

      {/* Demo banner */}
      <div
        style={{
          background: '#FBEFDD',
          borderBottom: '1px solid #F0D9B5',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          fontSize: 12.5,
          color: '#A6620F',
          fontWeight: 500,
          lineHeight: 1.45,
        }}
      >
        <Info size={15} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 1 }} />
        Simulated in-app chat for the prototype. Real product would connect via WhatsApp or SMS.
      </div>

      {/* Thread */}
      <div
        style={{
          flex: 1,
          background: '#EAE8E2',
          padding: '18px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#8794A5', fontSize: 13.5, padding: '40px 20px' }}>
            Your care team will reach out soon.
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            prevSender={i > 0 ? messages[i - 1].sender : null}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies + input */}
      <div
        style={{
          position: 'sticky',
          bottom: '4.25rem',
          zIndex: 10,
          background: '#F7F6F3',
          borderTop: '1px solid #ECEAE5',
        }}
      >
        {/* Quick reply chips */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: '12px 14px 8px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {QUICK_REPLIES.map((qr) => (
            <button
              key={qr}
              onClick={() => handleSend(qr)}
              style={{
                padding: '7px 14px',
                borderRadius: 99,
                border: '1.5px solid #D9D7D2',
                background: '#fff',
                color: '#3A4A5E',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {qr}
            </button>
          ))}
        </div>

        {/* Input row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 14px 10px',
          }}
        >
          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#8794A5', padding: 4, display: 'flex' }}>
            <Plus size={22} strokeWidth={1.75} />
          </button>
          <div
            style={{
              flex: 1,
              background: '#fff',
              border: '1.5px solid #DDDBD6',
              borderRadius: 22,
              display: 'flex',
              alignItems: 'center',
              padding: '0 14px',
              gap: 8,
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Type a message…"
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: 14,
                color: '#13233A',
                padding: '10px 0',
              }}
            />
          </div>
          <button
            onClick={() => handleSend()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 99,
              background: draft.trim() ? '#0E8C7F' : '#D9D7D2',
              border: 'none',
              cursor: draft.trim() ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
          >
            <Send size={17} strokeWidth={1.75} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  )
}
