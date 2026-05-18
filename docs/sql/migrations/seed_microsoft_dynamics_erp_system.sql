-- Microsoft Dynamics on homepage: Active now (matches technical plans on /plans)
-- Run in Supabase SQL editor, then hard-refresh https://www.daleel.site/

INSERT INTO erp_systems (
  name,
  vendor,
  description,
  description_ar,
  is_active,
  priority_order,
  certification_available
)
SELECT
  'Microsoft Dynamics 365',
  'Microsoft',
  'Cloud-based ERP and CRM platform with deep Office integration',
  'منصة ERP وCRM سحابية مع تكامل عميق مع Office',
  true,
  5,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM erp_systems
  WHERE lower(name) LIKE '%dynamics%'
     OR lower(vendor) LIKE '%microsoft%'
);

UPDATE erp_systems
SET is_active = true
WHERE lower(name) LIKE '%dynamics%'
   OR lower(vendor) LIKE '%microsoft%';
