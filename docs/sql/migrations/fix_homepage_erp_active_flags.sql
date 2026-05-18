-- Reset homepage ERP tiles: only turn ON systems you want as "Active now" in Admin.
-- Odoo / NetSuite were auto-activated by old code when any plan listed those providers.

UPDATE erp_systems
SET is_active = false
WHERE lower(name) LIKE '%odoo%'
   OR lower(vendor) LIKE '%odoo%'
   OR lower(name) LIKE '%netsuite%'
   OR lower(vendor) LIKE '%netsuite%';

-- Keep Microsoft Dynamics active (adjust if you prefer coming soon)
UPDATE erp_systems
SET is_active = true
WHERE lower(name) LIKE '%dynamics%'
   OR lower(vendor) LIKE '%microsoft%';
