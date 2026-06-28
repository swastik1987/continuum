import { createFileRoute } from '@tanstack/react-router'
import { PatientProfile } from '@/features/patient/PatientProfile'

export const Route = createFileRoute('/_app/patient/profile')({
  component: PatientProfile,
})
