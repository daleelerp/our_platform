-- Homepage ERP card for Microsoft Dynamics (matches erp_providers slug: microsoft-dynamics)
-- Run in Supabase SQL editor if the tile is missing on https://www.daleel.site/

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
  'Dynamics 365 Finance, Supply Chain, and Business Central — technical and functional career paths.',
  'داينمكس 365 — المالية وسلسلة التوريد وBusiness Central، مسارات تقنية ووظيفية.',
  false,
  5,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM erp_systems
  WHERE lower(name) LIKE '%dynamics%'
     OR lower(vendor) LIKE '%microsoft%'
);
