-- Add split ratings for plan vs content (run on existing DBs that already have student_feedback_reviews).

ALTER TABLE student_feedback_reviews
  ADD COLUMN IF NOT EXISTS rating_plan SMALLINT
    CHECK (rating_plan IS NULL OR (rating_plan BETWEEN 1 AND 5)),
  ADD COLUMN IF NOT EXISTS rating_content SMALLINT
    CHECK (rating_content IS NULL OR (rating_content BETWEEN 1 AND 5));

-- Backfill from legacy single rating when present
UPDATE student_feedback_reviews
SET
  rating_plan = COALESCE(rating_plan, rating),
  rating_content = COALESCE(rating_content, rating)
WHERE rating IS NOT NULL
  AND (rating_plan IS NULL OR rating_content IS NULL);

-- Opinion no longer required when using split ratings
ALTER TABLE student_feedback_reviews
  ALTER COLUMN opinion DROP NOT NULL;
