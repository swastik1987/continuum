import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: '/login', replace: true })
    }
  }, [loading, session, navigate])

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--background)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '9999px',
              border: '2px solid var(--border)',
              borderTopColor: 'var(--primary)',
              animation: 'spin 0.75s linear infinite',
            }}
          />
          <p style={{ fontSize: '0.875rem', color: 'var(--c-meta)' }}>Loading…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!session) return null

  return <Outlet />
}
