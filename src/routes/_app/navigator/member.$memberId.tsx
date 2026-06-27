import { createFileRoute } from '@tanstack/react-router'
import { MemberDetailPage } from '@/features/navigator/MemberDetailPage'

export const Route = createFileRoute('/_app/navigator/member/$memberId')({
  component: MemberDetailRoute,
})

function MemberDetailRoute() {
  const { memberId } = Route.useParams()
  return <MemberDetailPage memberId={memberId} />
}
