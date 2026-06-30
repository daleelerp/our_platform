-- =============================================================================
-- Grant a plan to a test account AND fast-forward it to certification-exam
-- readiness: every video watched, every checkpoint quiz passed, and the
-- path-level final exam passed, for every learning path included in the plan.
-- =============================================================================
-- Run in Supabase Dashboard -> SQL Editor (postgres / service role).
--
-- Eligibility for the certification exam is gated purely on completion, not
-- payment (see api/certification/exam/[examId]/route.ts -> checkPathCompletion):
--   - every active video in every active milestone has user_video_progress.is_completed = true
--   - every active checkpoint quiz (quiz_type='checkpoint') has a passed user_quiz_attempts row
-- This script also passes the path's own final exam (quiz_type='final', path_id
-- set) since /paths/[slug]/final-quiz is the natural step before the cert exam
-- and is itself gated on the same checkpoints + videos.
--
-- It also creates a path_enrollments row for each plan path if missing --
-- both the final-quiz page and the cert exam route 403 without one.
--
-- Idempotent: safe to re-run. Existing passed attempts/completed videos are
-- left as-is; only what's missing gets filled in.
-- =============================================================================

DO $$
DECLARE
  target_email TEXT := 'daleel.erp.site@gmail.com';
  target_plan_name TEXT := 'Dynamics 365 Technical Consultant Path (Complete)';
  uid UUID;
  pid UUID;
  rec_path RECORD;
  rec_video RECORD;
  rec_quiz RECORD;
  next_attempt INT;
  v_milestone_ids UUID[];
BEGIN
  -- Resolve user
  SELECT id INTO uid FROM auth.users WHERE email = target_email;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No user found with email %', target_email;
  END IF;

  -- Resolve plan
  SELECT id INTO pid FROM subscription_plans WHERE display_name_en = target_plan_name;
  IF pid IS NULL THEN
    SELECT id INTO pid FROM subscription_plans WHERE display_name_en ILIKE '%' || target_plan_name || '%';
  END IF;
  IF pid IS NULL THEN
    RAISE EXCEPTION 'No plan found matching %', target_plan_name;
  END IF;

  -- Grant the subscription if not already active
  IF EXISTS (
    SELECT 1 FROM user_subscriptions
    WHERE user_id = uid AND plan_id = pid AND status IN ('active','trial','paused')
  ) THEN
    RAISE NOTICE 'User % already has this plan active — skipping subscription insert.', target_email;
  ELSE
    INSERT INTO user_subscriptions (
      user_id, plan_id, status, billing_cycle,
      started_at, current_period_start, current_period_end,
      payment_method, payment_provider
    ) VALUES (
      uid, pid, 'active', 'monthly',
      NOW(), NOW(), NULL,
      'manual', 'manual'
    );
    RAISE NOTICE 'Subscription created for % on plan %', target_email, pid;
  END IF;

  -- Walk every learning path included in this plan
  FOR rec_path IN
    SELECT lp.id, lp.title
    FROM plan_paths pp
    JOIN learning_paths lp ON lp.id = pp.learning_path_id
    WHERE pp.plan_id = pid
  LOOP
    RAISE NOTICE 'Processing path: % (%)', rec_path.title, rec_path.id;

    -- Ensure enrollment exists (required by both the final-quiz page and the cert exam route)
    INSERT INTO path_enrollments (user_id, learning_path_id, status, started_at, last_accessed_at)
    VALUES (uid, rec_path.id, 'active', NOW(), NOW())
    ON CONFLICT (user_id, learning_path_id) DO NOTHING;

    SELECT array_agg(id) INTO v_milestone_ids
    FROM path_milestones
    WHERE learning_path_id = rec_path.id AND is_active = true;

    IF v_milestone_ids IS NULL THEN
      RAISE NOTICE '  No active milestones — skipping.';
      CONTINUE;
    END IF;

    -- Mark every active video in this path as fully watched
    FOR rec_video IN
      SELECT id FROM video_content
      WHERE milestone_id = ANY(v_milestone_ids) AND COALESCE(is_active, true) != false
    LOOP
      INSERT INTO user_video_progress (
        user_id, video_id, completion_percentage, is_completed,
        first_watched_at, last_watched_at, completed_at
      ) VALUES (
        uid, rec_video.id, 100, true, NOW(), NOW(), NOW()
      )
      ON CONFLICT (user_id, video_id) DO UPDATE SET
        completion_percentage = 100,
        is_completed = true,
        last_watched_at = NOW(),
        completed_at = COALESCE(user_video_progress.completed_at, NOW());
    END LOOP;

    -- Pass every checkpoint quiz (per milestone) not already passed
    FOR rec_quiz IN
      SELECT id, total_points FROM quizzes
      WHERE milestone_id = ANY(v_milestone_ids) AND quiz_type = 'checkpoint' AND is_active = true
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM user_quiz_attempts WHERE user_id = uid AND quiz_id = rec_quiz.id AND is_passed = true
      ) THEN
        SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO next_attempt
        FROM user_quiz_attempts WHERE user_id = uid AND quiz_id = rec_quiz.id;

        INSERT INTO user_quiz_attempts (
          user_id, quiz_id, attempt_number, score, points_earned, points_possible,
          is_passed, is_completed, started_at, completed_at, answers
        ) VALUES (
          uid, rec_quiz.id, next_attempt, 100, COALESCE(rec_quiz.total_points, 0), COALESCE(rec_quiz.total_points, 0),
          true, true, NOW(), NOW(), '[]'::jsonb
        );
      END IF;
    END LOOP;

    -- Pass the path-level final exam the same way
    FOR rec_quiz IN
      SELECT id, total_points FROM quizzes
      WHERE path_id = rec_path.id AND quiz_type = 'final' AND is_active = true
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM user_quiz_attempts WHERE user_id = uid AND quiz_id = rec_quiz.id AND is_passed = true
      ) THEN
        SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO next_attempt
        FROM user_quiz_attempts WHERE user_id = uid AND quiz_id = rec_quiz.id;

        INSERT INTO user_quiz_attempts (
          user_id, quiz_id, attempt_number, score, points_earned, points_possible,
          is_passed, is_completed, started_at, completed_at, answers
        ) VALUES (
          uid, rec_quiz.id, next_attempt, 100, COALESCE(rec_quiz.total_points, 0), COALESCE(rec_quiz.total_points, 0),
          true, true, NOW(), NOW(), '[]'::jsonb
        );
      END IF;
    END LOOP;

    -- Mark every milestone completed for UI consistency (progress bars / dashboard)
    UPDATE user_milestone_progress ump
    SET status = 'completed', progress_percentage = 100, checkpoint_passed = true,
        completed_at = NOW(), started_at = COALESCE(ump.started_at, NOW())
    WHERE ump.user_id = uid AND ump.milestone_id = ANY(v_milestone_ids);

    INSERT INTO user_milestone_progress (user_id, milestone_id, status, progress_percentage, checkpoint_passed, started_at, completed_at)
    SELECT uid, m_id, 'completed', 100, true, NOW(), NOW()
    FROM unnest(v_milestone_ids) AS m_id
    WHERE NOT EXISTS (
      SELECT 1 FROM user_milestone_progress WHERE user_id = uid AND milestone_id = m_id
    );

    -- Bring the enrollment's cached progress fields up to date
    UPDATE path_enrollments
    SET progress_percentage = 100, last_accessed_at = NOW()
    WHERE user_id = uid AND learning_path_id = rec_path.id;

  END LOOP;

  RAISE NOTICE 'Done. % is now eligible for the certification exam on plan %.', target_email, pid;
END $$;
