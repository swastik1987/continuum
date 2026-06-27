import { createFileRoute } from '@tanstack/react-router'
import { CarePlanHome } from '@/features/patient/CarePlanHome'

export const Route = createFileRoute('/_app/patient/')({
  component: CarePlanHome,
})
