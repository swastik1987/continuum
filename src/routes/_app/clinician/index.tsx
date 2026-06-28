import { createFileRoute } from '@tanstack/react-router'
import { CarePlanBuilder } from '@/features/clinician/CarePlanBuilder'

export const Route = createFileRoute('/_app/clinician/')({
  component: ClinicianCarePlans,
})

function ClinicianCarePlans() {
  return <CarePlanBuilder />
}
