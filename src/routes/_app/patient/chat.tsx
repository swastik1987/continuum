import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/patient/chat')({
  component: PatientChat,
})

function PatientChat() {
  return (
    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--c-meta)', marginTop: '3rem' }}>
      <p style={{ fontSize: '0.875rem' }}>Chat — conversation thread coming in M3</p>
    </div>
  )
}
