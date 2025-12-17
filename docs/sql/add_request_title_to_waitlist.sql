-- =====================================================
-- ADD REQUEST_TITLE TO WAITLIST TABLE
-- For contact form submissions
-- =====================================================

-- Add request_title column to waitlist table
ALTER TABLE waitlist 
ADD COLUMN IF NOT EXISTS request_title VARCHAR(255);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_waitlist_request_title ON waitlist(request_title);

-- Add comment to document the column
COMMENT ON COLUMN waitlist.request_title IS 'Title/subject of the contact request (for contact form submissions)';

