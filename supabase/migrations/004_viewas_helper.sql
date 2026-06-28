-- ============================================================================
-- 004_viewas_helper.sql
-- Enables admin "viewAs=patient" to resolve the demo patient member ID
-- without being blocked by the profiles RLS policy (USING auth.uid() = id).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_demo_patient_member_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT member_id
  FROM profiles
  WHERE role = 'patient'
    AND member_id IS NOT NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_demo_patient_member_id() TO authenticated;
