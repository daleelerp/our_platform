-- =============================================================================
-- Enforce "one free consultation booking per subscriber" at the database level
-- (previously only enforced by a check-then-insert in app code, which has a
-- race window if the same user opens two tabs/requests at once).
-- Safe to run multiple times. Run this in Supabase Dashboard -> SQL Editor.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS user_activity_logs_consultation_once_idx
  ON public.user_activity_logs (user_id, resource_name)
  WHERE action = 'consultation_link_used';
