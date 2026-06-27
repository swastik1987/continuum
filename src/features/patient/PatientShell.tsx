import { type ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Home, MessageCircle, FileText, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const TAB_ITEMS: { label: string; to: string; icon: LucideIcon; exact: boolean }[] = [
  { label: 'Home', to: '/patient', icon: Home, exact: true },
  { label: 'Chat', to: '/patient/chat', icon: MessageCircle, exact: false },
  { label: 'Records', to: '/patient/records', icon: FileText, exact: false },
  { label: 'Profile', to: '/patient/profile', icon: User, exact: false },
]

export function PatientShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '390px',
        margin: '0 auto',
        background: 'var(--background)',
        position: 'relative',
      }}
    >
      {/* Page content — pb clears the tab bar */}
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: '4.5rem' }}>
        {children}
      </main>

      {/* Bottom tab bar */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '390px',
          height: '4.25rem',
          background: '#fff',
          borderTop: '1px solid #ECEAE5',
          display: 'flex',
          alignItems: 'stretch',
        }}
      >
        {TAB_ITEMS.map(({ label, to, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname.startsWith(to)
          const color = active ? 'var(--primary)' : '#A2AAB4'
          return (
            <Link
              key={to}
              to={to}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                textDecoration: 'none',
                color,
              }}
            >
              <Icon size={23} strokeWidth={1.75} />
              <span style={{ fontSize: '0.6875rem', fontWeight: active ? 600 : 500 }}>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
