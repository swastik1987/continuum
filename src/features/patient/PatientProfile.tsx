import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Calendar, Phone, Globe, Building2, LogOut, Stethoscope, CreditCard, User,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useMember } from '@/lib/hooks/useMember'
import { useAuth } from '@/lib/auth/context'
import { getActivePlanForMember } from '@/lib/api/care-plans'

function computeAge(dob: string): number {
  const b = new Date(dob)
  const today = new Date()
  let a = today.getFullYear() - b.getFullYear()
  if (
    today.getMonth() < b.getMonth() ||
    (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())
  ) a--
  return a
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11.5, fontWeight: 600, letterSpacing: '0.08em',
      textTransform: 'uppercase' as const, color: '#8794A5',
      marginBottom: 10, paddingLeft: 4,
    }}>
      {children}
    </div>
  )
}

function DetailRow({
  icon, label, value, divider = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  divider?: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 18px',
      borderTop: divider ? '1px solid #F2F0EC' : 'none',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: '#F4F2EE', color: '#5A6B80',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11.5, color: '#8794A5', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#13233A', marginTop: 2 }}>{value}</div>
      </div>
    </div>
  )
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 18, border: '1px solid #EDEBE6',
      boxShadow: '0 1px 2px rgba(19,35,58,.04), 0 10px 26px -20px rgba(19,35,58,.12)',
      marginBottom: 24, overflow: 'hidden',
    }}>
      {children}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function PatientProfile() {
  const { data: member, isLoading: loadingMember } = useMember()
  const { session, signOut } = useAuth()

  const { data: org } = useQuery({
    queryKey: ['org', member?.org_id],
    queryFn: async () => {
      const r = await supabase
        .from('organizations')
        .select('name')
        .eq('id', member!.org_id!)
        .single()
      return r.data as { name: string } | null
    },

    enabled: !!member?.org_id,
  })

  const { data: planResult } = useQuery({
    queryKey: ['active-plan-profile', member?.id],
    queryFn: () => getActivePlanForMember(member!.id),
    enabled: !!member,
  })

  if (loadingMember) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center', color: '#8794A5', fontSize: 14 }}>
        Loading profile…
      </div>
    )
  }

  if (!member) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center', color: '#8794A5', fontSize: 14 }}>
        No member profile linked to this account.
      </div>
    )
  }

  const nameInitials = member.full_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const email = session?.user?.email ?? '—'
  const memberSince = member.created_at
    ? format(new Date(member.created_at), 'MMM yyyy')
    : null

  const dobFormatted = member.dob ? format(new Date(member.dob), 'd MMM yyyy') : null
  const memberAge = member.dob ? computeAge(member.dob) : null
  const walletBalance = member.wallet_balance ?? 0
  const orgName = org?.name ?? 'Your employer'
  const providerName = planResult?.providerName

  // Personal detail rows — only show rows where data exists
  const personalRows: { icon: React.ReactNode; label: string; value: string }[] = []
  if (dobFormatted) {
    personalRows.push({
      icon: <Calendar size={17} strokeWidth={1.75} />,
      label: 'Date of birth',
      value: `${dobFormatted}${memberAge !== null ? ` · ${memberAge} years` : ''}`,
    })
  }
  if (member.gender) {
    personalRows.push({
      icon: <User size={17} strokeWidth={1.75} />,
      label: 'Biological sex',
      value: member.gender.charAt(0).toUpperCase() + member.gender.slice(1),
    })
  }
  if (member.phone) {
    personalRows.push({
      icon: <Phone size={17} strokeWidth={1.75} />,
      label: 'Mobile number',
      value: member.phone,
    })
  }
  personalRows.push({
    icon: <Globe size={17} strokeWidth={1.75} />,
    label: 'Preferred language',
    value: member.preferred_language
      ? member.preferred_language.charAt(0).toUpperCase() + member.preferred_language.slice(1)
      : 'English',
  })

  return (
    <div style={{ background: '#F7F6F3', minHeight: '100%', paddingBottom: 40 }}>

      {/* ── Profile header ── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #ECEAE5',
        padding: '36px 20px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 68, height: 68, borderRadius: 99,
            background: '#13233A', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 600, flexShrink: 0, letterSpacing: '-0.01em',
          }}>
            {nameInitials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 21, fontWeight: 600, letterSpacing: '-0.02em', color: '#13233A',
            }}>
              {member.full_name}
            </div>
            <div style={{ fontSize: 13, color: '#8794A5', marginTop: 3 }}>{email}</div>
            {memberSince && (
              <div style={{ fontSize: 12, color: '#A2AAB4', marginTop: 3 }}>
                Member since {memberSince}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '22px 20px 0' }}>

        {/* ── Health wallet ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0E8C7F 0%, #0B6F64 100%)',
          borderRadius: 20, padding: '20px 22px', marginBottom: 28,
          boxShadow: '0 8px 28px -12px rgba(14,140,127,.5)',
          color: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{
                fontSize: 11.5, fontWeight: 600, letterSpacing: '0.08em',
                textTransform: 'uppercase' as const, opacity: 0.75,
              }}>
                Health Wallet
              </div>
              <div style={{
                fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em',
                marginTop: 8, fontVariantNumeric: 'tabular-nums' as const,
                lineHeight: 1,
              }}>
                ₹{walletBalance.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>
                {orgName} · ₹0 out of pocket
              </div>
            </div>
            <div style={{
              width: 52, height: 52, borderRadius: 15,
              background: 'rgba(255,255,255,.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CreditCard size={26} strokeWidth={1.75} />
            </div>
          </div>
        </div>

        {/* ── Personal details ── */}
        <SectionLabel>Personal details</SectionLabel>
        <InfoCard>
          {personalRows.map((row, i) => (
            <DetailRow
              key={row.label}
              icon={row.icon}
              label={row.label}
              value={row.value}
              divider={i > 0}
            />
          ))}
        </InfoCard>

        {/* ── Care team ── */}
        {providerName && (
          <>
            <SectionLabel>My care team</SectionLabel>
            <InfoCard>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 13,
                  background: '#EDF4F3',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Stethoscope size={22} strokeWidth={1.75} color="#0B6F64" />
                </div>
                <div>
                  <div style={{
                    fontSize: 14.5, fontWeight: 600, color: '#13233A', letterSpacing: '-0.01em',
                  }}>
                    {providerName}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#8794A5', marginTop: 3 }}>
                    Treating clinician
                  </div>
                </div>
              </div>
            </InfoCard>
          </>
        )}

        {/* ── About ── */}
        <SectionLabel>About</SectionLabel>
        <InfoCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#F4F2EE', color: '#5A6B80',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Building2 size={17} strokeWidth={1.75} />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: '#8794A5', fontWeight: 500 }}>Powered by</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#13233A', marginTop: 2 }}>
                Connect &amp; Heal · Continuum
              </div>
            </div>
          </div>
        </InfoCard>

        {/* ── Sign out ── */}
        <button
          onClick={() => void signOut()}
          style={{
            width: '100%', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            background: '#fff', border: '1px solid #F1CFCD', borderRadius: 16,
            padding: '15px 20px', fontSize: 14, fontWeight: 600,
            color: '#A8332F', cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(19,35,58,.04)',
          }}
        >
          <LogOut size={17} strokeWidth={1.75} />
          Sign out
        </button>

        <div style={{
          textAlign: 'center', fontSize: 11.5, color: '#C4C9D1', marginTop: 22,
        }}>
          Continuum v1.0 · Demo prototype
        </div>

      </div>
    </div>
  )
}
