-- =====================================================
-- ADD CAREER_FOCUS COLUMN TO LEARNING_PATHS
-- =====================================================

-- Add career_focus column to learning_paths table
ALTER TABLE learning_paths 
ADD COLUMN IF NOT EXISTS career_focus VARCHAR(50);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_learning_paths_career_focus 
ON learning_paths(career_focus);

-- Add comment
COMMENT ON COLUMN learning_paths.career_focus IS 'Career focus: technical, business_functional, or null (both). Determines if path is for technical developers/integrators or business functional consultants.';

-- Update existing paths based on their titles/descriptions
-- Technical paths (development, integration, technical implementation)
UPDATE learning_paths 
SET career_focus = 'technical' 
WHERE (
  title ILIKE '%technical%' OR
  title ILIKE '%development%' OR
  title ILIKE '%integration%' OR
  title ILIKE '%developer%' OR
  title ILIKE '%programming%' OR
  title ILIKE '%api%' OR
  title ILIKE '%integration cloud%' OR
  title ILIKE '%apex%' OR
  description ILIKE '%technical%' OR
  description ILIKE '%development%' OR
  description ILIKE '%integration%' OR
  target_audience ILIKE '%technical%'
) AND career_focus IS NULL;

-- Business functional paths (finance, business process, functional consultant)
UPDATE learning_paths 
SET career_focus = 'business_functional' 
WHERE (
  title ILIKE '%financial%' OR
  title ILIKE '%finance%' OR
  title ILIKE '%business%' OR
  title ILIKE '%functional%' OR
  title ILIKE '%professional%' OR
  title ILIKE '%consultant%' OR
  description ILIKE '%business professional%' OR
  description ILIKE '%finance professional%' OR
  description ILIKE '%functional consultant%' OR
  target_audience ILIKE '%business%' OR
  target_audience ILIKE '%professional%'
) AND career_focus IS NULL;

-- Note: Paths that don't match either can remain NULL (available for both)








