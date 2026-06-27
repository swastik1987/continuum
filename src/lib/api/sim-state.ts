import { supabase } from '@/integrations/supabase/client'
import type { Tables } from '@/lib/database.types'

export type SimStateRow = Tables<'sim_state'>

export async function getSimState(): Promise<SimStateRow | null> {
  const { data } = await supabase
    .from('sim_state')
    .select('*')
    .eq('id', 1)
    .single()

  return data ?? null
}

// Returns current_day as a JS Date, or today's date if sim_state is unavailable
export async function getSimDay(): Promise<Date> {
  const state = await getSimState()
  if (state?.current_day) return new Date(state.current_day)
  return new Date()
}
