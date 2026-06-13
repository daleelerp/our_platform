-- Add help_requested_at to user_certification_purchases
-- Run in Supabase SQL Editor before deploying request-help route
ALTER TABLE user_certification_purchases
  ADD COLUMN IF NOT EXISTS help_requested_at TIMESTAMPTZ;
