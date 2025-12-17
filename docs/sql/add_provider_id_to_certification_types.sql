-- =====================================================
-- ADD PROVIDER_ID COLUMN TO CERTIFICATION_TYPES
-- =====================================================

-- Add provider_id column to certification_types table
ALTER TABLE certification_types 
ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES erp_providers(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_certification_types_provider_id 
ON certification_types(provider_id);

-- Add comment
COMMENT ON COLUMN certification_types.provider_id IS 'ERP provider this certification belongs to (Oracle, SAP, etc.)';

-- Update existing certifications to link them to providers based on their value/name
-- Oracle certifications
UPDATE certification_types 
SET provider_id = (SELECT id FROM erp_providers WHERE slug = 'oracle' LIMIT 1)
WHERE value LIKE 'oracle_%' 
  AND provider_id IS NULL;

-- SAP certifications
UPDATE certification_types 
SET provider_id = (SELECT id FROM erp_providers WHERE slug = 'sap' LIMIT 1)
WHERE value LIKE 'sap_%' 
  AND provider_id IS NULL;

-- Dynamics certifications
UPDATE certification_types 
SET provider_id = (SELECT id FROM erp_providers WHERE slug = 'dynamics' LIMIT 1)
WHERE value LIKE 'dynamics_%' 
  AND provider_id IS NULL;

-- Note: 'not_interested' can remain NULL as it's not provider-specific








