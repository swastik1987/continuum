import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/context'
import { getMemberByProfileId, getMemberForDemoRole } from '@/lib/api/members'
import type { MemberRow } from '@/lib/api/members'

/**
 * Returns the member record for the current user.
 * When an admin is `viewAs='patient'` and their profile has no member_id,
 * falls back to the demo patient member so the admin can preview the patient UX.
 */
export function useMember() {
  const { profile, viewAs } = useAuth()

  return useQuery<MemberRow | null>({
    queryKey: ['member', profile?.id, viewAs],
    queryFn: async () => {
      if (!profile) return null
      const own = await getMemberByProfileId(profile.id)
      if (own) return own
      // Admin (or any unlinked profile) viewing as patient → demo fallback
      if (viewAs === 'patient') return getMemberForDemoRole('patient')
      return null
    },
    enabled: !!profile,
  })
}
