-- Add interest fields to waitlist signups
ALTER TABLE waitlist
ADD COLUMN IF NOT EXISTS interest_track VARCHAR(30),
ADD COLUMN IF NOT EXISTS custom_interest VARCHAR(255);

-- Optional index for easier filtering in admin/reporting
CREATE INDEX IF NOT EXISTS idx_waitlist_interest_track ON waitlist(interest_track);
