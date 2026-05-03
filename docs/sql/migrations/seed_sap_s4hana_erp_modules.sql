-- =====================================================
-- Seed SAP S/4HANA rows in erp_modules
-- Run in Supabase SQL editor (or psql) once.
--
-- Resolves empty "ERP Module" dropdown on Admin → Job Roles when SAP is selected:
-- modules are loaded from erp_modules WHERE erp_system_id = <SAP>, not from role type.
-- Technical vs Functional only classifies the job role — both use the same module list.
-- =====================================================

DO $$
DECLARE
  sap_system_id UUID;
BEGIN
  SELECT id INTO sap_system_id
  FROM erp_systems
  WHERE name ILIKE '%S/4HANA%'
     OR name ILIKE '%SAP S%'
     OR (name ILIKE '%SAP%' AND name NOT ILIKE '%oracle%')
  ORDER BY
    CASE WHEN name ILIKE '%S/4HANA%' THEN 0 ELSE 1 END,
    name
  LIMIT 1;

  IF sap_system_id IS NULL THEN
    RAISE NOTICE 'No SAP row found in erp_systems. Create SAP S/4HANA in Admin → ERP Systems first, then re-run this script.';
    RETURN;
  END IF;

  -- Functional / cross-cutting application areas
  INSERT INTO erp_modules (erp_system_id, name, name_ar, code, description, description_ar, is_core_module, typical_roles)
  SELECT sap_system_id, 'SAP FI – Financial Accounting', 'ساب FI – المحاسبة المالية', 'FI',
    'GL, AP, AR, Asset Accounting, banking', 'الأستاذ العام والذمم والأصول والبنوك', TRUE,
    '["SAP FI Consultant", "Functional Consultant", "Accountant"]'
  WHERE NOT EXISTS (SELECT 1 FROM erp_modules m WHERE m.erp_system_id = sap_system_id AND m.code = 'FI');

  INSERT INTO erp_modules (erp_system_id, name, name_ar, code, description, description_ar, is_core_module, typical_roles)
  SELECT sap_system_id, 'SAP CO – Controlling', 'ساب CO – الإدارة المالية', 'CO',
    'Cost centers, profitability analysis, internal orders', 'مراكز التكلفة وتحليل الربحية', TRUE,
    '["SAP CO Consultant", "Management Accountant"]'
  WHERE NOT EXISTS (SELECT 1 FROM erp_modules m WHERE m.erp_system_id = sap_system_id AND m.code = 'CO');

  INSERT INTO erp_modules (erp_system_id, name, name_ar, code, description, description_ar, is_core_module, typical_roles)
  SELECT sap_system_id, 'SAP MM – Materials Management', 'ساب MM – إدارة المواد', 'MM',
    'Procurement, inventory, invoice verification', 'المشتريات والمخزون', TRUE,
    '["SAP MM Consultant", "Procurement Analyst"]'
  WHERE NOT EXISTS (SELECT 1 FROM erp_modules m WHERE m.erp_system_id = sap_system_id AND m.code = 'MM');

  INSERT INTO erp_modules (erp_system_id, name, name_ar, code, description, description_ar, is_core_module, typical_roles)
  SELECT sap_system_id, 'SAP SD – Sales & Distribution', 'ساب SD – المبيعات والتوزيع', 'SD',
    'Sales orders, pricing, shipping, billing', 'أوامر البيع والتسعير والشحن', TRUE,
    '["SAP SD Consultant", "Sales Operations"]'
  WHERE NOT EXISTS (SELECT 1 FROM erp_modules m WHERE m.erp_system_id = sap_system_id AND m.code = 'SD');

  INSERT INTO erp_modules (erp_system_id, name, name_ar, code, description, description_ar, is_core_module, typical_roles)
  SELECT sap_system_id, 'SAP PP – Production Planning', 'ساب PP – تخطيط الإنتاج', 'PP',
    'MRP, manufacturing orders, capacity planning', 'تخطيط الاحتياجات والتصنيع', FALSE,
    '["SAP PP Consultant", "Production Planner"]'
  WHERE NOT EXISTS (SELECT 1 FROM erp_modules m WHERE m.erp_system_id = sap_system_id AND m.code = 'PP');

  INSERT INTO erp_modules (erp_system_id, name, name_ar, code, description, description_ar, is_core_module, typical_roles)
  SELECT sap_system_id, 'SAP QM – Quality Management', 'ساب QM – إدارة الجودة', 'QM',
    'Inspection plans, quality notifications', 'خطط الفحص وإشعارات الجودة', FALSE,
    '["SAP QM Consultant", "Quality Engineer"]'
  WHERE NOT EXISTS (SELECT 1 FROM erp_modules m WHERE m.erp_system_id = sap_system_id AND m.code = 'QM');

  INSERT INTO erp_modules (erp_system_id, name, name_ar, code, description, description_ar, is_core_module, typical_roles)
  SELECT sap_system_id, 'SAP WM – Warehouse Management', 'ساب WM – إدارة المستودعات', 'WM',
    'Warehouse tasks, storage bins, RF', 'مهام المستودع والمواقع', FALSE,
    '["SAP WM Consultant", "Warehouse Lead"]'
  WHERE NOT EXISTS (SELECT 1 FROM erp_modules m WHERE m.erp_system_id = sap_system_id AND m.code = 'WM');

  INSERT INTO erp_modules (erp_system_id, name, name_ar, code, description, description_ar, is_core_module, typical_roles)
  SELECT sap_system_id, 'SAP PM – Plant Maintenance', 'ساب PM – صيانة المصنع', 'PM',
    'Work orders, preventive maintenance', 'أوامر العمل والصيانة الوقائية', FALSE,
    '["SAP PM Consultant", "Maintenance Planner"]'
  WHERE NOT EXISTS (SELECT 1 FROM erp_modules m WHERE m.erp_system_id = sap_system_id AND m.code = 'PM');

  INSERT INTO erp_modules (erp_system_id, name, name_ar, code, description, description_ar, is_core_module, typical_roles)
  SELECT sap_system_id, 'SAP PS – Project System', 'ساب PS – نظام المشاريع', 'PS',
    'Project structures, networks, resource planning', 'هياكل المشاريع والشبكات', FALSE,
    '["SAP PS Consultant", "Project Controller"]'
  WHERE NOT EXISTS (SELECT 1 FROM erp_modules m WHERE m.erp_system_id = sap_system_id AND m.code = 'PS');

  INSERT INTO erp_modules (erp_system_id, name, name_ar, code, description, description_ar, is_core_module, typical_roles)
  SELECT sap_system_id, 'SAP HCM – Human Capital Management', 'ساب HCM – الموارد البشرية', 'HCM',
    'HR master data, payroll, time, talent', 'البيانات الرئيسية والرواتب والوقت', TRUE,
    '["SAP HCM Consultant", "HR Business Partner"]'
  WHERE NOT EXISTS (SELECT 1 FROM erp_modules m WHERE m.erp_system_id = sap_system_id AND m.code = 'HCM');

  -- Technical / platform
  INSERT INTO erp_modules (erp_system_id, name, name_ar, code, description, description_ar, is_core_module, typical_roles)
  SELECT sap_system_id, 'SAP ABAP Development', 'ساب ABAP – التطوير', 'ABAP',
    'Custom programs, enhancements, interfaces (technical)', 'برامج مخصصة وتطوير وتكامل تقني', TRUE,
    '["SAP ABAP Developer", "Technical Consultant"]'
  WHERE NOT EXISTS (SELECT 1 FROM erp_modules m WHERE m.erp_system_id = sap_system_id AND m.code = 'ABAP');

  INSERT INTO erp_modules (erp_system_id, name, name_ar, code, description, description_ar, is_core_module, typical_roles)
  SELECT sap_system_id, 'SAP Basis / NetWeaver Administration', 'ساب Basis – الإدارة التقنية', 'BASIS',
    'System administration, transports, performance, security', 'إدارة النظام والأداء والأمان', TRUE,
    '["SAP Basis Administrator", "Technical Consultant"]'
  WHERE NOT EXISTS (SELECT 1 FROM erp_modules m WHERE m.erp_system_id = sap_system_id AND m.code = 'BASIS');

  INSERT INTO erp_modules (erp_system_id, name, name_ar, code, description, description_ar, is_core_module, typical_roles)
  SELECT sap_system_id, 'SAP BTP / Cloud Integration', 'ساب BTP والتكامل السحابي', 'BTP',
    'Integration Suite, APIs, extensions on SAP BTP', 'التكامل والـ APIs والامتدادات السحابية', FALSE,
    '["SAP Integration Developer", "Technical Consultant"]'
  WHERE NOT EXISTS (SELECT 1 FROM erp_modules m WHERE m.erp_system_id = sap_system_id AND m.code = 'BTP');

  RAISE NOTICE 'SAP modules seeded for erp_system_id = %', sap_system_id;
END $$;
