import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { MessagesSquare, ChevronRight, Check, PartyPopper } from 'lucide-react'
import { format } from 'date-fns'
import { getActivePlanForMember } from '@/lib/api'
import { useMember } from '@/lib/hooks/useMember'
import type { ActionRow } from '@/lib/api/care-plans'
import type { Enums } from '@/lib/database.types'
import { ProgressRing } from './ProgressRing'
import { ActionCard } from './ActionCard'

type ActionStatus = Enums<'action_status'>

const STATUS_ORDER: Record<ActionStatus, number> = {
  overdue: 0,
  declined: 1,
  pending: 2,
  scheduled: 3,
  snoozed: 4,
  completed: 5,
}

function sortActions(actions: ActionRow[]): ActionRow[] {
  return [...actions].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
}

export function CarePlanHome() {
  const navigate = useNavigate()
  const { data: member, isLoading: loadingMember } = useMember()

  const { data: planResult, isLoading: loadingPlan } = useQuery({
    queryKey: ['active-plan', member?.id],
    queryFn: () => getActivePlanForMember(member!.id),
    enabled: !!member,
  })

  const loading = loadingMember || loadingPlan

  if (loading) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center', color: '#8794A5', fontSize: 14 }}>
        Loading your care plan…
      </div>
    )
  }

  if (!member) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center', color: '#8794A5', fontSize: 14 }}>
        No member record linked to this account.
      </div>
    )
  }

  const firstName = member.full_name?.split(' ')[0] ?? 'there'
  const initials = member.full_name
    ? member.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const actions = planResult?.actions ?? []
  const sortedActions = sortActions(actions)
  const completed = actions.filter((a) => a.status === 'completed').length
  const total = actions.length
  const overdueCnt = actions.filter((a) => a.status === 'overdue').length
  const allDone = total > 0 && completed === total

  let providerLine = 'Your care plan'
  if (planResult?.providerName && planResult.consultation?.consulted_at) {
    providerLine = `from ${planResult.providerName} · ${format(new Date(planResult.consultation.consulted_at), 'd MMM')}`
  } else if (planResult?.consultation?.consulted_at) {
    providerLine = `Your care plan · ${format(new Date(planResult.consultation.consulted_at), 'd MMM')}`
  }

  function openAction(actionId: string) {
    navigate({ to: '/patient/action/$actionId', params: { actionId } })
  }

  return (
    <div style={{ padding: '8px 20px 0' }}>
      {/* Greeting */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '10px 2px 18px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              color: '#13233A',
            }}
          >
            Hi {firstName}
          </div>
          <div style={{ fontSize: 13.5, color: '#5A6B80', marginTop: 6 }}>{providerLine}</div>
        </div>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 999,
            background: '#13233A',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
      </div>

      {/* Progress ring card */}
      {planResult && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #EDEBE6',
            borderRadius: 20,
            padding: '18px 20px',
            boxShadow: '0 1px 2px rgba(19,35,58,.04), 0 14px 34px -20px rgba(19,35,58,.18)',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <ProgressRing completed={completed} total={total} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 17,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: '#13233A',
                lineHeight: 1.3,
              }}
            >
              {allDone ? 'All steps done!' : `${completed} of ${total} steps done`}
            </div>
            <div style={{ fontSize: 13.5, color: '#5A6B80', lineHeight: 1.55, marginTop: 6 }}>
              {allDone
                ? `Wonderful work, ${firstName}. Your care team has been notified.`
                : overdueCnt > 0
                  ? `${overdueCnt} step${overdueCnt > 1 ? 's are' : ' is'} overdue — tap to take action.`
                  : "You're on track — keep going!"}
            </div>
          </div>
        </div>
      )}

      {/* Next steps heading */}
      {total > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: '26px 4px 14px',
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', color: '#13233A' }}>
            Next steps
          </div>
          {overdueCnt > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 999,
                background: '#FBEFDD',
                color: '#A6620F',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 99, background: '#D9821B' }} />
              {overdueCnt} overdue
            </span>
          )}
        </div>
      )}

      {/* Action cards */}
      {allDone ? (
        <div
          style={{
            background: '#fff',
            border: '1px solid #EDEBE6',
            borderRadius: 18,
            padding: '38px 24px',
            boxShadow: '0 1px 2px rgba(19,35,58,.04)',
            textAlign: 'center',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 99,
              background: '#E6F4EC',
              color: '#1F9D55',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
            }}
          >
            <Check size={30} strokeWidth={2} />
          </div>
          <div style={{ fontSize: 16.5, fontWeight: 600, letterSpacing: '-0.01em', color: '#13233A' }}>
            No pending steps
          </div>
          <div
            style={{
              fontSize: 13.5,
              color: '#5A6B80',
              lineHeight: 1.5,
              marginTop: 7,
              maxWidth: 240,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            You're all caught up. We'll let you know when Dr. Mehra adds something new.
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              marginTop: 18,
              padding: '8px 14px',
              borderRadius: 999,
              background: '#E6F4EC',
              color: '#167A41',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <PartyPopper size={16} strokeWidth={1.75} />
            All caught up
          </div>
        </div>
      ) : (
        sortedActions.map((action) => (
          <ActionCard key={action.id} action={action} onOpen={() => openAction(action.id)} />
        ))
      )}

      {/* Chat promo */}
      <div
        onClick={() => navigate({ to: '/patient/chat' })}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: '#13233A',
          borderRadius: 18,
          padding: '16px 18px',
          marginTop: 4,
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'rgba(255,255,255,.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <MessagesSquare size={21} strokeWidth={1.75} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: '#fff' }}>
            Questions? Chat with your care team
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>
            Usually replies within an hour
          </div>
        </div>
        <ChevronRight size={19} strokeWidth={1.75} color="rgba(255,255,255,.5)" />
      </div>

      <div style={{ height: 22 }} />
    </div>
  )
}
