-- =====================================================
-- Make article URL optional in learning_resources
-- =====================================================

-- This migration makes the URL field optional for articles
-- Note: We keep NOT NULL constraint but allow empty strings
-- For articles without URLs, we'll use empty string ""

-- If you want to make URL truly nullable, uncomment below:
-- ALTER TABLE learning_resources ALTER COLUMN url DROP NOT NULL;

-- However, to maintain compatibility, we'll keep NOT NULL
-- and use empty string "" for articles without URLs

-- Update existing articles with empty URLs if needed
-- UPDATE learning_resources 
-- SET url = '' 
-- WHERE url IS NULL AND resource_type = 'article';

