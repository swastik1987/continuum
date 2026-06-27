import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/patient/')({
  component: PatientHome,
})

function PatientHome() {
  return (
    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--c-meta)', marginTop: '3rem' }}>
      <p style={{ fontSize: '0.875rem' }}>Patient Home — care plan actions coming in M1</p>
    </div>
  )
}
