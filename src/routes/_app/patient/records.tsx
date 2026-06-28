import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { CircleCheckBig, Stethoscope, Droplet, Pill, Syringe, HeartPulse, Scan, FlaskConical } from 'lucide-react'
import { getActivePlanForMember, listConsultationsForMember } from '@/lib/api'
import { useMember } from '@/lib/hooks/useMember'

export const Route = createFileRoute('/_app/patient/records')({
  component: PatientRecords,
})

const ACTION_ICON: Record<string, React.ComponentType<{ size: number; strokeWidth: number; color: string }>> = {
  lab_test: Droplet,
  follow_up_consult: Stethoscope,
  medication: Pill,
  vaccination: Syringe,
  lifestyle: HeartPulse,
  imaging: Scan,
}

function PatientRecords() {
  const { data: member, isLoading: loadingMember } = useMember()

  const { data: planResult, isLoading: loadingPlan } = useQuery({
    queryKey: ['active-plan', member?.id],
    queryFn: () => getActivePlanForMember(member!.id),
    enabled: !!member,
  })

  const { data: pastConsults, isLoading: loadingConsults } = useQuery({
    queryKey: ['past-consults', member?.id],
    queryFn: () => listConsultationsForMember(member!.id),
    enabled: !!member,
  })

  const loading = loadingMember || loadingPlan || loadingConsults

  if (loading) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center', color: '#8794A5', fontSize: 14 }}>
        Loading records…
      </div>
    )
  }

  const completedActions = (planResult?.actions ?? []).filter(
    (a) => a.status === 'completed',
  )

  return (
    <div style={{ padding: '16px 20px 100px' }}>
      {/* Completed care steps */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: '#13233A',
            marginBottom: 14,
          }}
        >
          Completed steps
        </div>
        {completedActions.length === 0 ? (
          <div
            style={{
              background: '#fff',
              border: '1px solid #EDEBE6',
              borderRadius: 16,
              padding: '28px 20px',
              textAlign: 'center',
              color: '#8794A5',
              fontSize: 14,
            }}
          >
            No completed steps yet.
          </div>
        ) : (
          completedActions.map((action) => {
            const Icon = ACTION_ICON[action.action_type] ?? FlaskConical
            return (
              <div
                key={action.id}
                style={{
                  background: '#fff',
                  border: '1px solid #EDEBE6',
                  borderRadius: 16,
                  padding: '16px 18px',
                  boxShadow: '0 1px 2px rgba(19,35,58,.04), 0 10px 26px -20px rgba(19,35,58,.16)',
                  marginBottom: 12,
                  display: 'flex',
                  gap: 14,
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 13,
                    background: '#E6F4EC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={22} strokeWidth={1.75} color="#167A41" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14.5,
                      fontWeight: 600,
                      color: '#13233A',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {action.title}
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: '#167A41',
                      marginTop: 4,
                    }}
                  >
                    <CircleCheckBig size={14} strokeWidth={1.75} />
                    Completed
                    {action.due_date
                      ? ` · ${format(new Date(action.due_date), 'd MMM yyyy')}`
                      : ''}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Past consultations */}
      <div>
        <div
          style={{
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: '#13233A',
            marginBottom: 14,
          }}
        >
          Past consultations
        </div>
        {!pastConsults || pastConsults.length === 0 ? (
          <div
            style={{
              background: '#fff',
              border: '1px solid #EDEBE6',
              borderRadius: 16,
              padding: '28px 20px',
              textAlign: 'center',
              color: '#8794A5',
              fontSize: 14,
            }}
          >
            No past consultations on record.
          </div>
        ) : (
          pastConsults.map((consult) => (
            <div
              key={consult.id}
              style={{
                background: '#fff',
                border: '1px solid #EDEBE6',
                borderRadius: 16,
                padding: '16px 18px',
                boxShadow: '0 1px 2px rgba(19,35,58,.04), 0 10px 26px -20px rgba(19,35,58,.16)',
                marginBottom: 12,
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 13,
                  background: '#EDF4F3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Stethoscope size={22} strokeWidth={1.75} color="#0B6F64" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14.5,
                    fontWeight: 600,
                    color: '#13233A',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {consult.provider?.full_name ?? 'Consultation'}
                </div>
                {consult.provider?.specialty && (
                  <div style={{ fontSize: 12.5, color: '#8794A5', marginTop: 2 }}>
                    {consult.provider.specialty}
                  </div>
                )}
                {consult.chief_complaint && (
                  <div
                    style={{
                      fontSize: 13,
                      color: '#5A6B80',
                      marginTop: 8,
                      lineHeight: 1.45,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical' as const,
                      overflow: 'hidden',
                    }}
                  >
                    {consult.chief_complaint}
                  </div>
                )}
                {consult.consulted_at && (
                  <div style={{ fontSize: 12, color: '#A2AAB4', marginTop: 6 }}>
                    {format(new Date(consult.consulted_at), 'd MMM yyyy')} ·{' '}
                    {consult.mode === 'tele' ? 'Telemedicine' : 'In person'}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
