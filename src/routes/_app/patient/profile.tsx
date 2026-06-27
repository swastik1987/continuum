import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/patient/profile')({
  component: PatientProfile,
})

function PatientProfile() {
  return (
    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--c-meta)', marginTop: '3rem' }}>
      <p style={{ fontSize: '0.875rem' }}>Profile — member details coming in M5</p>
    </div>
  )
}
