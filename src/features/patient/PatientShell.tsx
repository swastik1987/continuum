import { type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Home, MessageCircle, FileText, User } from 'lucide-react'
import { useAuth } from '@/lib/auth/context'

const TAB_ITEMS = [
  { label: 'Home', to: '/patient', icon: Home, exact: true },
  { label: 'Chat', to: '/patient/chat', icon: MessageCircle, exact: false },
  { label: 'Records', to: '/patient/records', icon: FileText, exact: false },
  { label: 'Profile', to: '/patient/profile', icon: User, exact: false },
] as const

export function PatientShell({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

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
      {/* Top bar */}
      <header
        style={{
          height: '3.5rem',
          padding: '0 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--card)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '1.625rem',
              height: '1.625rem',
              borderRadius: '0.375rem',
              background: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <circle cx="6" cy="6" r="4.5" stroke="white" strokeWidth="1.5" />
              <path d="M6 3.5v2.5l1.5 1.5" stroke="white" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </div>
          <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--foreground)' }}>
            Continuum
          </span>
        </div>
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
          }}
        >
          {initials}
        </div>
      </header>

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
          background: 'var(--card)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'stretch',
        }}
      >
        {TAB_ITEMS.map(({ label, to, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', textDecoration: 'none' }}
            activeProps={{
              style: {
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
                textDecoration: 'none',
                color: 'var(--primary)',
              },
            }}
            inactiveProps={{
              style: {
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
                textDecoration: 'none',
                color: 'var(--c-icon)',
              },
            }}
          >
            <Icon size={20} strokeWidth={1.75} />
            <span style={{ fontSize: '0.625rem', fontWeight: 500 }}>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
