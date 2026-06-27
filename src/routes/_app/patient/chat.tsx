import { createFileRoute } from '@tanstack/react-router'
import { ChatScreen } from '@/features/patient/ChatScreen'

export const Route = createFileRoute('/_app/patient/chat')({
  component: ChatScreen,
})
