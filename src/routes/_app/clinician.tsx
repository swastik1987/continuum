import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/clinician')({
  component: ClinicianLayout,
})

function ClinicianLayout() {
  return <Outlet />
}
