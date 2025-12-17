-- =====================================================
-- ADD ERP PROVIDER AND TOOL FIELDS TO USER_PROFILES
-- =====================================================

-- Add erp_provider_id column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS erp_provider_id UUID REFERENCES erp_providers(id);

-- Add erp_tool_id column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS erp_tool_id UUID REFERENCES erp_provider_tools(id);

-- Add erp_explore flag (for "I explore" option)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS erp_explore BOOLEAN DEFAULT false;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_erp_provider ON user_profiles(erp_provider_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_erp_tool ON user_profiles(erp_tool_id);

-- Add comments
COMMENT ON COLUMN user_profiles.erp_provider_id IS 'Selected ERP provider (Oracle, SAP, etc.)';
COMMENT ON COLUMN user_profiles.erp_tool_id IS 'Selected ERP tool/product (OIC, APEX, etc.) or NULL if exploring';
COMMENT ON COLUMN user_profiles.erp_explore IS 'True if user selected "I explore / I don\'t know yet" option';

