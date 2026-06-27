import { createFileRoute } from '@tanstack/react-router'
import { WorklistPage } from '@/features/navigator/WorklistPage'

export const Route = createFileRoute('/_app/navigator/')({
  component: WorklistPage,
})
