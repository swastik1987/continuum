import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/employer/')({
  component: EmployerDashboard,
})

function EmployerDashboard() {
  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--foreground)', margin: '0 0 0.5rem' }}>
        Employer Dashboard
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--c-meta)' }}>
        Engagement KPIs and claims-cost avoidance — coming in M7
      </p>
    </div>
  )
}
