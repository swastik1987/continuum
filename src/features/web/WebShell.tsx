import { type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  LayoutList,
  Users,
  CheckSquare,
  Search,
  ClipboardList,
  BarChart2,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/context'
import type { Enums } from '@/lib/database.types'

type WebRole = Extract<Enums<'user_role'>, 'navigator' | 'clinician' | 'employer_admin'>

type NavItem = {
  label: string
  to?: string
  icon: React.FC<{ size?: number; strokeWidth?: number }>
}

const NAV_ITEMS: Record<WebRole, NavItem[]> = {
  navigator: [
    { label: 'Worklist', to: '/navigator', icon: LayoutList },
    { label: 'My Patients', icon: Users },
    { label: 'Tasks', icon: CheckSquare },
    { label: 'Search', icon: Search },
  ],
  clinician: [
    { label: 'Care Plans', to: '/clinician', icon: ClipboardList },
  ],
  employer_admin: [
    { label: 'Dashboard', to: '/employer', icon: BarChart2 },
  ],
}

const ROLE_SUBTITLE: Record<WebRole, string> = {
  navigator: 'NAVIGATOR CONSOLE',
  clinician: 'CLINICIAN CONSOLE',
  employer_admin: 'EMPLOYER CONSOLE',
}

const ROLE_LABEL: Record<WebRole, string> = {
  navigator: 'Care Navigator',
  clinician: 'Clinician',
  employer_admin: 'Employer Admin',
}

export function WebShell({
  role,
  children,
  navBadges,
}: {
  role: WebRole
  children: ReactNode
  navBadges?: Record<string, number>
}) {
  const { profile, signOut } = useAuth()
  const items = NAV_ITEMS[role]
  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '236px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
          borderRight: '1px solid #ECEAE5',
        }}
      >
        {/* Brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '11px',
            padding: '24px 22px 22px',
          }}
        >
          <svg width="30" height="30" viewBox="0 0 44 44" fill="none" aria-hidden>
            <circle cx="22" cy="22" r="17" stroke="#E2EFEC" strokeWidth="5" />
            <circle
              cx="22"
              cy="22"
              r="17"
              stroke="#0E8C7F"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="80 107"
              transform="rotate(-90 22 22)"
            />
          </svg>
          <div>
            <div
              style={{
                fontSize: '17px',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                color: '#13233A',
              }}
            >
              Continuum
            </div>
            <div
              style={{
                fontSize: '10.5px',
                color: '#8794A5',
                marginTop: '3px',
                fontWeight: 500,
                letterSpacing: '0.02em',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {ROLE_SUBTITLE[role]}
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav
          style={{
            padding: '8px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          {items.map(({ label, to, icon: Icon }) => {
            const badge = navBadges?.[label]

            if (!to) {
              return (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '11px 10px 11px 13px',
                    borderRadius: '11px',
                    borderLeft: '3px solid transparent',
                    color: '#8794A5',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'default',
                    opacity: 0.6,
                  }}
                >
                  <Icon size={19} strokeWidth={1.75} />
                  {label}
                </div>
              )
            }

            return (
              <Link
                key={to}
                to={to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 10px 11px 13px',
                  borderRadius: '11px',
                  borderLeft: '3px solid transparent',
                  color: '#5A6B80',
                  fontSize: '14px',
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
                activeProps={{
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '11px 10px 11px 13px',
                    borderRadius: '11px',
                    borderLeft: '3px solid #0E8C7F',
                    background: '#EDF4F3',
                    color: '#0B6F64',
                    fontSize: '14px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  },
                }}
              >
                <Icon size={19} strokeWidth={1.75} />
                <span style={{ flex: 1 }}>{label}</span>
                {badge !== undefined && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      background: '#0E8C7F',
                      color: '#fff',
                      borderRadius: '999px',
                      padding: '1px 8px',
                    }}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div
          style={{
            marginTop: 'auto',
            padding: '16px 14px',
            borderTop: '1px solid #F0EEEA',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '11px',
              padding: '8px 10px',
              borderRadius: '11px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '99px',
                background: '#13233A',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: '#13233A',
                }}
              >
                {profile?.full_name ?? 'User'}
              </div>
              <div style={{ fontSize: '11.5px', color: '#8794A5' }}>
                {ROLE_LABEL[role]}
              </div>
            </div>
            <button
              onClick={() => void signOut()}
              title="Sign out"
              style={{
                fontFamily: 'inherit', background: 'none', border: 'none',
                padding: '4px', borderRadius: '6px', cursor: 'pointer',
                color: '#A2AAB4', display: 'flex', alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <LogOut size={17} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
}
