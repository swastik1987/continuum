import { createFileRoute } from '@tanstack/react-router'
import { DemoSimulation } from '@/features/admin/DemoSimulation'

export const Route = createFileRoute('/_app/admin/')({
  component: DemoSimulation,
})
