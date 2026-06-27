import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/lib/auth/context'
import type { Enums } from '@/lib/database.types'

const ROLE_LABELS: Record<Enums<'user_role'>, string> = {
  patient: 'Patient',
  navigator: 'Navigator',
  clinician: 'Clinician',
  employer_admin: 'Employer',
  admin: 'Admin',
}

export const ROLE_HOME: Record<Enums<'user_role'>, string> = {
  patient: '/patient',
  navigator: '/navigator',
  clinician: '/clinician',
  employer_admin: '/employer',
  admin: '/admin',
}

const ALL_ROLES = Object.keys(ROLE_LABELS) as Enums<'user_role'>[]

export function RoleSwitcher() {
  const { profile, effectiveRole, setViewAs } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  // Only render for admin users
  if (!profile || profile.role !== 'admin') return null

  function switchTo(role: Enums<'user_role'>) {
    setViewAs(role === 'admin' ? null : role)
    navigate({ to: ROLE_HOME[role] })
    setOpen(false)
  }

  return (
    <div
      style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999 }}
    >
      {open ? (
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 24px rgba(19,35,58,0.12)',
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.375rem',
            minWidth: '160px',
          }}
        >
          <p
            style={{
              fontSize: '0.625rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--c-meta)',
              padding: '0 0.25rem 0.25rem',
            }}
          >
            View as
          </p>
          {ALL_ROLES.map((role) => {
            const isActive = (effectiveRole ?? 'admin') === role
            return (
              <button
                key={role}
                onClick={() => switchTo(role)}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.8125rem',
                  fontWeight: isActive ? 600 : 400,
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: 'none',
                  background: isActive ? 'var(--accent)' : 'transparent',
                  color: isActive ? 'var(--accent-foreground)' : 'var(--foreground)',
                  transition: 'background 0.1s',
                }}
              >
                {ROLE_LABELS[role]}
              </button>
            )
          })}
          <button
            onClick={() => setOpen(false)}
            style={{
              marginTop: '0.25rem',
              padding: '0.25rem',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              color: 'var(--c-meta)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            Close
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          style={{
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
            border: 'none',
            borderRadius: '9999px',
            padding: '0.5rem 1rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(14,140,127,0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <span style={{ opacity: 0.75 }}>View as:</span>
          {ROLE_LABELS[effectiveRole ?? 'admin']}
        </button>
      )}
    </div>
  )
}
