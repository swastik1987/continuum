import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { WebShell } from '@/features/web/WebShell'
import { listNavigatorTasks } from '@/lib/api/navigator-tasks'

export const Route = createFileRoute('/_app/navigator')({
  component: NavigatorLayout,
})

function NavigatorLayout() {
  const [openCount, setOpenCount] = useState<number | undefined>(undefined)

  useEffect(() => {
    listNavigatorTasks({ status: 'open' }).then((tasks) => {
      setOpenCount(tasks.length)
    })
  }, [])

  return (
    <WebShell
      role="navigator"
      navBadges={openCount !== undefined ? { Worklist: openCount } : undefined}
    >
      <Outlet />
    </WebShell>
  )
}
