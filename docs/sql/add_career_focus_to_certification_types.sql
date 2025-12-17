-- =====================================================
-- ADD CAREER_FOCUS COLUMN TO CERTIFICATION_TYPES
-- =====================================================

-- Add career_focus column to certification_types table
ALTER TABLE certification_types 
ADD COLUMN IF NOT EXISTS career_focus VARCHAR(50);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_certification_types_career_focus 
ON certification_types(career_focus);

-- Add comment
COMMENT ON COLUMN certification_types.career_focus IS 'Career focus: technical, business_functional, or both (null means both)';

-- Update existing certifications with career_focus
-- Technical certifications (development, integration, technical implementation)
UPDATE certification_types 
SET career_focus = 'technical' 
WHERE value IN (
  'oracle_financials',  -- Technical implementation
  'oracle_scm',         -- Technical implementation
  'sap_fico',           -- Technical configuration
  'sap_mm',             -- Technical configuration
  'sap_sd'              -- Technical configuration
);

-- Business functional certifications (functional consultant, business analyst)
UPDATE certification_types 
SET career_focus = 'business_functional' 
WHERE value IN (
  'oracle_hcm',         -- Functional consultant
  'oracle_epm',         -- Functional consultant
  'sap_hcm',            -- Functional consultant
  'dynamics_finance'    -- Functional consultant
);

-- Both (can be either technical or functional)
UPDATE certification_types 
SET career_focus = NULL 
WHERE value = 'not_interested';

-- Note: NULL means available for both technical and business_functional

