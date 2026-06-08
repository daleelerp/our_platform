-- FIX: Allow enrolled users to see videos, not just subscribed users.
--
-- The previous policy "video_content_subscribed_read" only allowed access when
-- the user had an active/trial subscription linked via plan_paths. This blocked
-- enrolled users who aren't on a paid plan from seeing any videos.
--
-- New policy: allow SELECT if the user is EITHER enrolled in the path OR has a
-- valid subscription to a plan that covers the path.

DROP POLICY IF EXISTS "video_content_subscribed_read" ON video_content;
DROP POLICY IF EXISTS "Public read active videos" ON video_content;

CREATE POLICY "video_content_enrolled_or_subscribed_read" ON video_content
  FOR SELECT
  USING (
    (is_active IS DISTINCT FROM false)
    AND (
      -- Enrolled users can see videos for paths they are enrolled in
      EXISTS (
        SELECT 1
        FROM path_milestones pm
        JOIN path_enrollments pe ON pe.learning_path_id = pm.learning_path_id
        WHERE pm.id        = video_content.milestone_id
          AND pe.user_id   = auth.uid()
          AND pe.status    = 'active'
      )
      OR
      -- Subscribed users can see videos for paths covered by their plan
      EXISTS (
        SELECT 1
        FROM path_milestones pm
        JOIN plan_paths       pp ON pp.learning_path_id = pm.learning_path_id
        JOIN user_subscriptions us ON us.plan_id = pp.plan_id
        WHERE pm.id      = video_content.milestone_id
          AND us.user_id = auth.uid()
          AND us.status  IN ('active', 'trial')
      )
    )
  );
