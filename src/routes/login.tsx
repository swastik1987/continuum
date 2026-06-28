import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { useAuth } from '@/lib/auth/context'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

const DEMO_USERS = [
  {
    label: 'Patient',
    email: 'patient@demo.continuum.health',
    hint: 'Ananya's care plan · tap actions, book or decline',
  },
  {
    label: 'Navigator',
    email: 'navigator@demo.continuum.health',
    hint: 'Worklist · pick up escalated cases, resolve tasks',
  },
  {
    label: 'Clinician',
    email: 'clinician@demo.continuum.health',
    hint: 'Care-plan builder · author and publish a plan',
  },
  {
    label: 'Employer',
    email: 'employer@demo.continuum.health',
    hint: 'KPI dashboard · completion rates and cost avoidance',
  },
  {
    label: 'Admin',
    email: 'admin@demo.continuum.health',
    hint: 'Sim controls · advance time, switch any role',
  },
]

const DEMO_PASSWORD = 'Continuum2024!'

function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    if (typeof window !== 'undefined') localStorage.removeItem('continuum.viewAs')

    const controller = { cancelled: false }
    const timeoutId = setTimeout(() => {
      controller.cancelled = true
      setLoading(false)
      setError('Connection timed out. Make sure your Supabase project is active and try again.')
    }, 12_000)

    try {
      const { error: authError } = await signIn(email, password)
      if (controller.cancelled) return
      clearTimeout(timeoutId)
      if (authError) {
        setError(authError.message)
      } else {
        navigate({ to: '/' })
      }
    } catch (err) {
      if (controller.cancelled) return
      clearTimeout(timeoutId)
      setError(err instanceof Error ? err.message : 'Sign in failed — please try again.')
    } finally {
      if (!controller.cancelled) setLoading(false)
    }
  }

  async function handleDemoLogin(demoEmail: string) {
    setError(null)
    setDemoLoading(demoEmail)
    if (typeof window !== 'undefined') localStorage.removeItem('continuum.viewAs')

    const controller = { cancelled: false }
    const timeoutId = setTimeout(() => {
      controller.cancelled = true
      setDemoLoading(null)
      setEmail(demoEmail)
      setPassword(DEMO_PASSWORD)
      setError('Connection timed out. Make sure your Supabase project is active and try again.')
    }, 12_000)

    try {
      const { error: authError } = await signIn(demoEmail, DEMO_PASSWORD)
      if (controller.cancelled) return
      clearTimeout(timeoutId)
      if (authError) {
        setEmail(demoEmail)
        setPassword(DEMO_PASSWORD)
        setError(authError.message)
      } else {
        navigate({ to: '/' })
      }
    } catch (err) {
      if (controller.cancelled) return
      clearTimeout(timeoutId)
      setEmail(demoEmail)
      setPassword(DEMO_PASSWORD)
      setError(err instanceof Error ? err.message : 'Sign in failed — please try again.')
    } finally {
      if (!controller.cancelled) setDemoLoading(null)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)',
        padding: '1.5rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '24rem' }}>
        {/* Logo / brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '0.625rem',
              background: 'var(--primary)',
              marginBottom: '0.875rem',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="2" />
              <path d="M9 5v4l2.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
            Continuum
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--c-secondary-text)', marginTop: '0.25rem' }}>
            Care continuity, closed loop
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '0.75rem',
            padding: '1.75rem',
            boxShadow: '0 1px 4px rgba(19,35,58,0.06)',
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label
                htmlFor="email"
                style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--foreground)', marginBottom: '0.375rem' }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: '0.5rem',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--foreground)', marginBottom: '0.375rem' }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: '0.5rem',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--c-declined-text)', margin: 0 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || demoLoading !== null}
              style={{
                width: '100%',
                padding: '0.625rem',
                background: 'var(--primary)',
                color: 'var(--primary-foreground)',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                marginTop: '0.25rem',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Demo section */}
        <div
          style={{
            marginTop: '1.25rem',
            background: 'var(--c-teal-light)',
            border: '1px solid var(--c-teal-bd)',
            borderRadius: '12px',
            padding: '14px 16px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* small sparkle */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--c-teal-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v3M12 18v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M3 12h3M18 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
              </svg>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--c-teal-text)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Demo
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--c-secondary-text)' }}>
              one click to log in
            </span>
          </div>

          {/* Role pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '14px' }}>
            {DEMO_USERS.map(({ label, email: demoEmail }) => {
              const isActive = demoLoading === demoEmail
              return (
                <button
                  key={demoEmail}
                  type="button"
                  onClick={() => void handleDemoLogin(demoEmail)}
                  disabled={demoLoading !== null || loading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '0.3rem 0.7rem',
                    borderRadius: '9999px',
                    border: `1px solid ${isActive ? 'var(--c-teal-text)' : 'var(--c-teal-bd)'}`,
                    background: isActive ? 'var(--c-teal-text)' : '#fff',
                    color: isActive ? '#fff' : 'var(--c-teal-text)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: demoLoading !== null ? 'not-allowed' : 'pointer',
                    opacity: demoLoading !== null && !isActive ? 0.5 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  {isActive && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.22-8.56"/>
                    </svg>
                  )}
                  {label}
                </button>
              )
            })}
          </div>

          {/* Role descriptions */}
          <div
            style={{
              borderTop: '1px solid var(--c-teal-bd)',
              paddingTop: '11px',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
            }}
          >
            {DEMO_USERS.map(({ label, hint }) => (
              <div key={label} style={{ display: 'flex', gap: '8px', fontSize: '11.5px', lineHeight: 1.4 }}>
                <span style={{ fontWeight: 600, color: 'var(--c-subtle)', minWidth: '62px', flexShrink: 0 }}>{label}</span>
                <span style={{ color: 'var(--c-secondary-text)' }}>{hint}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
