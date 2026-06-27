import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PatientShell } from '@/features/patient/PatientShell'

export const Route = createFileRoute('/_app/patient')({
  component: PatientLayout,
})

function PatientLayout() {
  return (
    <PatientShell>
      <Outlet />
    </PatientShell>
  )
}
