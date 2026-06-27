import { createFileRoute, Outlet } from '@tanstack/react-router'
import { WebShell } from '@/features/web/WebShell'

export const Route = createFileRoute('/_app/clinician')({
  component: ClinicianLayout,
})

function ClinicianLayout() {
  return (
    <WebShell role="clinician">
      <Outlet />
    </WebShell>
  )
}
