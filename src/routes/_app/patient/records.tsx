import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/patient/records')({
  component: PatientRecords,
})

function PatientRecords() {
  return (
    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--c-meta)', marginTop: '3rem' }}>
      <p style={{ fontSize: '0.875rem' }}>Records — health history coming in M5</p>
    </div>
  )
}
