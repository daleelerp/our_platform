-- =====================================================
-- ERP PROVIDERS AND TOOLS SCHEMA
-- Schema for ERP providers (vendors) and their tools/modules
-- =====================================================

-- Table: erp_providers
-- Purpose: Store ERP vendors/providers (Oracle, SAP, ERPNext, Odoo, etc.)
CREATE TABLE IF NOT EXISTS erp_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    name_ar VARCHAR(100),
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    description_ar TEXT,
    logo_url TEXT,
    website_url TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: erp_provider_tools
-- Purpose: Store tools/modules/products offered by each ERP provider
CREATE TABLE IF NOT EXISTS erp_provider_tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES erp_providers(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    slug VARCHAR(200) NOT NULL,
    description TEXT,
    description_ar TEXT,
    category VARCHAR(100), -- e.g., 'integration', 'development', 'analytics', 'finance', etc.
    category_ar VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider_id, slug)
);

-- Insert major ERP providers
INSERT INTO erp_providers (name, name_ar, slug, description, description_ar, display_order) VALUES
('Oracle', 'أوراكل', 'oracle', 'Oracle Corporation - Enterprise software and cloud solutions', 'أوراكل - حلول البرمجيات المؤسسية والسحابية', 1),
('SAP', 'ساب', 'sap', 'SAP SE - Enterprise application software', 'ساب - برمجيات التطبيقات المؤسسية', 2),
('ERPNext', 'ERPNext', 'erpnext', 'ERPNext - Open source ERP system', 'ERPNext - نظام ERP مفتوح المصدر', 3),
('Odoo', 'أودو', 'odoo', 'Odoo - Open source business management software', 'أودو - برمجيات إدارة الأعمال مفتوحة المصدر', 4),
('Microsoft Dynamics', 'مايكروسوفت داينمكس', 'microsoft-dynamics', 'Microsoft Dynamics - Business applications', 'مايكروسوفت داينمكس - تطبيقات الأعمال', 5),
('NetSuite', 'نت سويت', 'netsuite', 'NetSuite - Cloud business management suite', 'نت سويت - مجموعة إدارة الأعمال السحابية', 6)
ON CONFLICT (slug) DO NOTHING;

-- Insert Oracle tools (examples - will be populated via web scraping)
INSERT INTO erp_provider_tools (provider_id, name, name_ar, slug, category, category_ar, display_order) 
SELECT 
    id,
    'Oracle Integration Cloud (OIC)',
    'أوراكل تكامل السحابة',
    'oracle-integration-cloud',
    'Integration',
    'التكامل',
    1
FROM erp_providers WHERE slug = 'oracle'
ON CONFLICT (provider_id, slug) DO NOTHING;

INSERT INTO erp_provider_tools (provider_id, name, name_ar, slug, category, category_ar, display_order) 
SELECT 
    id,
    'Oracle APEX',
    'أوراكل APEX',
    'oracle-apex',
    'Development',
    'التطوير',
    2
FROM erp_providers WHERE slug = 'oracle'
ON CONFLICT (provider_id, slug) DO NOTHING;

INSERT INTO erp_provider_tools (provider_id, name, name_ar, slug, category, category_ar, display_order) 
SELECT 
    id,
    'Oracle Cloud ERP',
    'أوراكل ERP السحابي',
    'oracle-cloud-erp',
    'ERP Core',
    'نواة ERP',
    3
FROM erp_providers WHERE slug = 'oracle'
ON CONFLICT (provider_id, slug) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_erp_providers_slug ON erp_providers(slug);
CREATE INDEX IF NOT EXISTS idx_erp_providers_is_active ON erp_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_erp_provider_tools_provider_id ON erp_provider_tools(provider_id);
CREATE INDEX IF NOT EXISTS idx_erp_provider_tools_category ON erp_provider_tools(category);
CREATE INDEX IF NOT EXISTS idx_erp_provider_tools_is_active ON erp_provider_tools(is_active);

-- Enable RLS
ALTER TABLE erp_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_provider_tools ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can read active providers and tools
CREATE POLICY "Anyone can read active erp_providers"
    ON erp_providers
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "Anyone can read active erp_provider_tools"
    ON erp_provider_tools
    FOR SELECT
    USING (is_active = true);

-- Grant permissions
GRANT SELECT ON erp_providers TO authenticated;
GRANT SELECT ON erp_providers TO anon;
GRANT SELECT ON erp_provider_tools TO authenticated;
GRANT SELECT ON erp_provider_tools TO anon;

