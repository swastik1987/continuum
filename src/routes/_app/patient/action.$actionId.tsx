import { createFileRoute } from '@tanstack/react-router'
import { ActionDetail } from '@/features/patient/ActionDetail'

export const Route = createFileRoute('/_app/patient/action/$actionId')({
  component: ActionDetailPage,
})

function ActionDetailPage() {
  const { actionId } = Route.useParams()
  return <ActionDetail actionId={actionId} />
}
