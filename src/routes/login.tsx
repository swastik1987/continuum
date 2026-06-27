import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { useAuth } from '@/lib/auth/context'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

const DEMO_USERS = [
  { label: 'Patient', email: 'patient@demo.continuum.health' },
  { label: 'Navigator', email: 'navigator@demo.continuum.health' },
  { label: 'Clinician', email: 'clinician@demo.continuum.health' },
  { label: 'Employer', email: 'employer@demo.continuum.health' },
  { label: 'Admin', email: 'admin@demo.continuum.health' },
] as const

const DEMO_PASSWORD = 'Continuum2024!'

function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: authError } = await signIn(email, password)
    setLoading(false)
    if (authError) {
      setError(authError.message)
    } else {
      navigate({ to: '/' })
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail)
    setPassword(DEMO_PASSWORD)
    setError(null)
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
              disabled={loading}
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

        {/* Demo credential chips */}
        <div style={{ marginTop: '1.5rem' }}>
          <p
            style={{
              textAlign: 'center',
              fontSize: '0.75rem',
              color: 'var(--c-meta)',
              marginBottom: '0.625rem',
            }}
          >
            Demo accounts — click to fill
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
            {DEMO_USERS.map(({ label, email: demoEmail }) => (
              <button
                key={demoEmail}
                type="button"
                onClick={() => fillDemo(demoEmail)}
                style={{
                  padding: '0.3125rem 0.75rem',
                  borderRadius: '9999px',
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--c-secondary-text)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
