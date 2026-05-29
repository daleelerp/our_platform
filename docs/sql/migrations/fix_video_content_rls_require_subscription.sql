-- SECURITY FIX: Restrict video_content reads to subscribed users only.
-- Previously, any authenticated user could dump all video IDs in one query.
-- Now, a user can only read a video if they have an active/trial subscription
-- to a plan that includes the path the video belongs to.
--
-- Join chain:
--   video_content.milestone_id
--     → path_milestones.id (get the learning_path_id)
--     → plan_paths.learning_path_id (get which plans include this path)
--     → user_subscriptions.plan_id WHERE user_id = auth.uid() AND status IN ('active','trial')

-- Drop the old open-access policy
DROP POLICY IF EXISTS "Public read active videos" ON video_content;

-- New policy: only users with a valid subscription to a plan that contains this video's path
CREATE POLICY "video_content_subscribed_read" ON video_content
  FOR SELECT
  USING (
    (is_active IS DISTINCT FROM false)
    AND EXISTS (
      SELECT 1
      FROM path_milestones pm
      JOIN plan_paths       pp ON pp.learning_path_id = pm.learning_path_id
      JOIN user_subscriptions us ON us.plan_id = pp.plan_id
      WHERE pm.id          = video_content.milestone_id
        AND us.user_id     = auth.uid()
        AND us.status      IN ('active', 'trial')
    )
  );
