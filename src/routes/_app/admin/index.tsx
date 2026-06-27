import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/lib/auth/context'
import type { Enums } from '@/lib/database.types'
import { ROLE_HOME } from '@/features/admin/RoleSwitcher'

export const Route = createFileRoute('/_app/admin/')({
  component: AdminPanel,
})

const ROLES: { role: Enums<'user_role'>; label: string; description: string }[] = [
  { role: 'patient', label: 'Patient', description: 'Mobile care plan & chat' },
  { role: 'navigator', label: 'Navigator', description: 'Risk worklist & tasks' },
  { role: 'clinician', label: 'Clinician', description: 'Care plan builder' },
  { role: 'employer_admin', label: 'Employer', description: 'Engagement dashboard' },
  { role: 'admin', label: 'Admin', description: 'Demo control panel' },
]

function AdminPanel() {
  const { effectiveRole, setViewAs } = useAuth()
  const navigate = useNavigate()

  function switchTo(role: Enums<'user_role'>) {
    setViewAs(role === 'admin' ? null : role)
    navigate({ to: ROLE_HOME[role] })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--background)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '28rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: '2rem',
                height: '2rem',
                borderRadius: '0.5rem',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <circle cx="7" cy="7" r="5.5" stroke="white" strokeWidth="1.5" />
                <path d="M7 4.5v2.5l1.75 1.75" stroke="white" strokeWidth="1.25" strokeLinecap="round" />
              </svg>
            </div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
              Demo Control Panel
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--c-secondary-text)', margin: 0 }}>
            Continuum — Connect &amp; Heal prototype
          </p>
        </div>

        {/* Role switcher card */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            marginBottom: '1.25rem',
          }}
        >
          <p
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--c-meta)',
              margin: '0 0 0.875rem',
            }}
          >
            View as role
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {ROLES.map(({ role, label, description }) => {
              const isActive = (effectiveRole ?? 'admin') === role
              return (
                <button
                  key={role}
                  onClick={() => switchTo(role)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.625rem 0.875rem',
                    borderRadius: '0.5rem',
                    border: isActive ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                    background: isActive ? 'var(--accent)' : 'var(--background)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? 'var(--accent-foreground)' : 'var(--foreground)',
                        margin: 0,
                      }}
                    >
                      {label}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--c-meta)', margin: 0 }}>{description}</p>
                  </div>
                  {isActive && (
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        color: 'var(--primary)',
                        background: 'transparent',
                        flexShrink: 0,
                      }}
                    >
                      Active
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Simulation card — placeholder for M8 */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
          }}
        >
          <p
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--c-meta)',
              margin: '0 0 0.5rem',
            }}
          >
            Simulation
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--c-secondary-text)', margin: 0 }}>
            Advance simulated days, run nudge engine, and watch the closed loop in real-time — coming in M8.
          </p>
        </div>
      </div>
    </div>
  )
}
