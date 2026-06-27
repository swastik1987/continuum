import { type ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { LayoutList, CheckSquare, ClipboardList, BarChart2, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth/context'
import type { Enums } from '@/lib/database.types'

type WebRole = Extract<Enums<'user_role'>, 'navigator' | 'clinician' | 'employer_admin'>

type NavItem = {
  label: string
  to: string
  icon: React.FC<{ size?: number; strokeWidth?: number }>
}

const NAV_ITEMS: Record<WebRole, NavItem[]> = {
  navigator: [
    { label: 'Worklist', to: '/navigator', icon: LayoutList },
    { label: 'Tasks', to: '/navigator/tasks', icon: CheckSquare },
  ],
  clinician: [
    { label: 'Care Plans', to: '/clinician', icon: ClipboardList },
  ],
  employer_admin: [
    { label: 'Dashboard', to: '/employer', icon: BarChart2 },
  ],
}

const ROLE_DISPLAY: Record<WebRole, string> = {
  navigator: 'Navigator',
  clinician: 'Clinician',
  employer_admin: 'Employer',
}

export function WebShell({ role, children }: { role: WebRole; children: ReactNode }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const items = NAV_ITEMS[role]
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  async function handleSignOut() {
    await signOut()
    navigate({ to: '/login' })
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '15rem',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--card)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Brand */}
        <div
          style={{
            padding: '1.25rem 1rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <div
            style={{
              width: '1.75rem',
              height: '1.75rem',
              borderRadius: '0.375rem',
              background: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <circle cx="7" cy="7" r="5.5" stroke="white" strokeWidth="1.5" />
              <path d="M7 4.5v2.5l1.75 1.75" stroke="white" strokeWidth="1.25" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
              Continuum
            </p>
            <p style={{ fontSize: '0.6875rem', color: 'var(--c-meta)', margin: 0 }}>
              {ROLE_DISPLAY[role]}
            </p>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '0.75rem 0.5rem' }}>
          {items.map(({ label, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: true }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontSize: '0.875rem',
                marginBottom: '0.125rem',
                color: 'var(--c-secondary-text)',
              }}
              activeProps={{
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  marginBottom: '0.125rem',
                  background: 'var(--accent)',
                  color: 'var(--accent-foreground)',
                  fontWeight: 500,
                },
              }}
            >
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </Link>
          ))}
        </nav>

        {/* User footer */}
        <div
          style={{
            padding: '0.875rem 1rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
          }}
        >
          <div
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '9999px',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: 'var(--accent-foreground)',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <p
            style={{
              flex: 1,
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: 'var(--foreground)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {profile?.full_name ?? 'User'}
          </p>
          <button
            onClick={handleSignOut}
            title="Sign out"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--c-icon)',
              padding: '0.25rem',
              borderRadius: '0.375rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <LogOut size={15} strokeWidth={1.75} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
}
