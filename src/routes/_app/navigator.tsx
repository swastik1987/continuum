import { createFileRoute, Outlet } from '@tanstack/react-router'
import { WebShell } from '@/features/web/WebShell'

export const Route = createFileRoute('/_app/navigator')({
  component: NavigatorLayout,
})

function NavigatorLayout() {
  return (
    <WebShell role="navigator">
      <Outlet />
    </WebShell>
  )
}
