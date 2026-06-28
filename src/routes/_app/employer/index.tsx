import { createFileRoute } from '@tanstack/react-router'
import { EmployerDashboard } from '@/features/employer/EmployerDashboard'

export const Route = createFileRoute('/_app/employer/')({
  component: EmployerDashboard,
})
