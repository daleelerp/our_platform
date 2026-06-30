-- =============================================================================
-- Fix: waitlist.custom_interest is VARCHAR(255), but the "Other" field in the
-- waitlist form now accepts up to 1000 characters client-side, causing
-- "value too long for type character varying(255)" on submit.
-- =============================================================================
ALTER TABLE waitlist
ALTER COLUMN custom_interest TYPE VARCHAR(1000);
