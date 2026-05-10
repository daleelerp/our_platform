-- Student feedback request + review schema
-- Run in Supabase SQL editor for MVP rollout.

CREATE TABLE IF NOT EXISTS student_feedback_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    purchase_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    shown_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    snoozed_until TIMESTAMPTZ,
    prompt_attempts INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
      CHECK (status IN ('scheduled', 'shown', 'submitted', 'dismissed', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (purchase_id)
);

CREATE TABLE IF NOT EXISTS student_feedback_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES student_feedback_requests(id) ON DELETE CASCADE,
    purchase_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    rating_plan SMALLINT CHECK (rating_plan IS NULL OR rating_plan BETWEEN 1 AND 5),
    rating_content SMALLINT CHECK (rating_content IS NULL OR rating_content BETWEEN 1 AND 5),
    opinion TEXT,
    suggestion TEXT,
    category VARCHAR(20)
      CHECK (category IS NULL OR category IN ('content', 'pricing', 'ux', 'support', 'other')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (purchase_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_requests_user_status
  ON student_feedback_requests(user_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_feedback_reviews_plan
  ON student_feedback_reviews(plan_id, rating);

ALTER TABLE student_feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_feedback_reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'student_feedback_requests'
      AND policyname = 'Users can view own feedback requests'
  ) THEN
    CREATE POLICY "Users can view own feedback requests"
      ON student_feedback_requests
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'student_feedback_requests'
      AND policyname = 'Users can update own feedback requests'
  ) THEN
    CREATE POLICY "Users can update own feedback requests"
      ON student_feedback_requests
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'student_feedback_reviews'
      AND policyname = 'Users can view own feedback reviews'
  ) THEN
    CREATE POLICY "Users can view own feedback reviews"
      ON student_feedback_reviews
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'student_feedback_reviews'
      AND policyname = 'Users can insert own feedback reviews'
  ) THEN
    CREATE POLICY "Users can insert own feedback reviews"
      ON student_feedback_reviews
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
