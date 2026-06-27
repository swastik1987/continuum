import { createFileRoute, Outlet } from '@tanstack/react-router'
import { WebShell } from '@/features/web/WebShell'

export const Route = createFileRoute('/_app/employer')({
  component: EmployerLayout,
})

function EmployerLayout() {
  return (
    <WebShell role="employer_admin">
      <Outlet />
    </WebShell>
  )
}
