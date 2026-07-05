-- =====================================================
-- LOCK full_name TO GOOGLE-PROVIDED VALUE
-- The profile settings UI no longer sends full_name, but the existing
-- RLS policy ("Users can update own profile") lets an authenticated
-- user PATCH any column of their own row via the Supabase REST API
-- directly, bypassing the UI. This trigger enforces the rule at the
-- database level: any UPDATE to user_profiles that is not performed by
-- the service role has its full_name silently reset to the prior value.
-- Google sign-in (auth callback / handle_new_user trigger) still sets
-- full_name on profile creation as before; only edits from a normal
-- user session are blocked.
-- =====================================================

CREATE OR REPLACE FUNCTION lock_full_name_for_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    NEW.full_name := OLD.full_name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS lock_full_name_trigger ON user_profiles;

CREATE TRIGGER lock_full_name_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION lock_full_name_for_owner();
