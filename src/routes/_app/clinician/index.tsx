import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/clinician/')({
  component: ClinicianCarePlans,
})

function ClinicianCarePlans() {
  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--foreground)', margin: '0 0 0.5rem' }}>
        Care Plan Builder
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--c-meta)' }}>
        Consult-driven care plan authoring — coming in M4
      </p>
    </div>
  )
}
