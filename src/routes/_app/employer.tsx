import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/employer')({
  component: EmployerLayout,
})

function EmployerLayout() {
  return <Outlet />
}
