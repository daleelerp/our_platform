-- =============================================================================
-- SAP S/4HANA plan: attach "Problem Solving Fundamentals" and "Database Language"
-- as LP2/LP3, then split "Modern ABAP Core Skills for SAP S/4HANA" (LP4)'s 2
-- milestones (200 videos) into 5 named milestones (177 videos) by title match.
-- =============================================================================
-- Run in Supabase Dashboard → SQL Editor (postgres / service role), STEP 1 then STEP 2.
--
-- Paths/plan are resolved by ILIKE match with a guard that raises an exception if a
-- pattern matches zero or more than one row — if that happens, inspect the table named
-- in the error and hardcode the id instead of the ILIKE lookup.
--
-- LP4's two existing milestones are targeted by milestone_number (1 and 2) rather than
-- exact title text, since that's a stable ordinal regardless of any special characters
-- in the stored title (the Oracle APEX restructure hit exactly this with a non-ASCII
-- dash in "APEX Hands‑on").
--
-- 200 existing videos vs. 177 listed below — at least 23 will legitimately remain on
-- the old (now renumbered) milestones after STEP 2. That's expected. Run STEP 3 after,
-- and paste the "leftover" query's output back into chat (same as we did for Oracle
-- APEX) so the 3 "Galal Academy AR video" categories can be handled precisely instead
-- of guessed at — no exact titles or target milestones were given for those yet.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 0 (preview, optional): sanity-check the plan/paths exist before running STEP 1
-- -----------------------------------------------------------------------------
/*
SELECT id, display_name_en FROM subscription_plans WHERE display_name_en ILIKE '%SAP S/4HANA%';
SELECT id, title FROM learning_paths WHERE title ILIKE '%SAP Overview%' OR title ILIKE '%Problem Solving Fundamentals%' OR title ILIKE '%Database Language%' OR title ILIKE '%Modern ABAP Core Skills%';
*/

-- -----------------------------------------------------------------------------
-- STEP 1: attach LP2 (Problem Solving Fundamentals) and LP3 (Database Language) to
-- the plan, and fix sort_order so the final order is Overview(1), Problem Solving(2),
-- Database Language(3), Modern ABAP Core Skills(4).
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_plan_id uuid;
  v_lp_overview_id uuid;
  v_lp_problem_solving_id uuid;
  v_lp_database_lang_id uuid;
  v_lp_abap_id uuid;
BEGIN
  SELECT id INTO v_plan_id FROM subscription_plans WHERE display_name_en ILIKE '%SAP S/4HANA%';
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'No subscription_plans row matched display_name_en ILIKE %%SAP S/4HANA%% — check the table and hardcode the plan id.';
  END IF;

  SELECT id INTO v_lp_overview_id FROM learning_paths WHERE title ILIKE '%SAP Overview%';
  SELECT id INTO v_lp_problem_solving_id FROM learning_paths WHERE title ILIKE '%Problem Solving Fundamentals%';
  SELECT id INTO v_lp_database_lang_id FROM learning_paths WHERE title ILIKE '%Database Language%';
  SELECT id INTO v_lp_abap_id FROM learning_paths WHERE title ILIKE '%Modern ABAP Core Skills%';

  IF v_lp_overview_id IS NULL THEN RAISE EXCEPTION 'No learning_paths row matched "%%SAP Overview%%".'; END IF;
  IF v_lp_problem_solving_id IS NULL THEN RAISE EXCEPTION 'No learning_paths row matched "%%Problem Solving Fundamentals%%".'; END IF;
  IF v_lp_database_lang_id IS NULL THEN RAISE EXCEPTION 'No learning_paths row matched "%%Database Language%%".'; END IF;
  IF v_lp_abap_id IS NULL THEN RAISE EXCEPTION 'No learning_paths row matched "%%Modern ABAP Core Skills%%".'; END IF;

  UPDATE plan_paths SET sort_order = 1 WHERE plan_id = v_plan_id AND learning_path_id = v_lp_overview_id;
  UPDATE plan_paths SET sort_order = 4 WHERE plan_id = v_plan_id AND learning_path_id = v_lp_abap_id;

  INSERT INTO plan_paths (plan_id, learning_path_id, sort_order)
  VALUES (v_plan_id, v_lp_problem_solving_id, 2)
  ON CONFLICT (plan_id, learning_path_id) DO UPDATE SET sort_order = 2;

  INSERT INTO plan_paths (plan_id, learning_path_id, sort_order)
  VALUES (v_plan_id, v_lp_database_lang_id, 3)
  ON CONFLICT (plan_id, learning_path_id) DO UPDATE SET sort_order = 3;

  RAISE NOTICE 'Plan % paths set — Overview=%(1), ProblemSolving=%(2), DatabaseLanguage=%(3), ABAP=%(4)',
    v_plan_id, v_lp_overview_id, v_lp_problem_solving_id, v_lp_database_lang_id, v_lp_abap_id;
END $$;

-- -----------------------------------------------------------------------------
-- STEP 2: restructure LP4's milestones and reassign the 177 listed videos
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_path_id uuid;
  v_old_ms1 uuid; -- milestone_number 1, "ABAP Fundamentals and System Basics"
  v_old_ms2 uuid; -- milestone_number 2, "ABAP Dictionary and Modern ABAP Syntax"
  v_old_ms_ids uuid[];
  v_ms1 uuid; v_ms2 uuid; v_ms3 uuid; v_ms4 uuid; v_ms5 uuid;
  v_unmatched int;
  v_total int;
BEGIN
  SELECT id INTO v_path_id FROM learning_paths WHERE title ILIKE '%Modern ABAP Core Skills%';
  IF v_path_id IS NULL THEN
    RAISE EXCEPTION 'No learning_paths row matched "%%Modern ABAP Core Skills%%".';
  END IF;

  SELECT id INTO v_old_ms1 FROM path_milestones WHERE learning_path_id = v_path_id AND milestone_number = 1;
  SELECT id INTO v_old_ms2 FROM path_milestones WHERE learning_path_id = v_path_id AND milestone_number = 2;
  IF v_old_ms1 IS NULL OR v_old_ms2 IS NULL THEN
    RAISE EXCEPTION 'Expected milestone_number 1 and 2 under path % — found ms1=%, ms2=%. Check path_milestones manually.', v_path_id, v_old_ms1, v_old_ms2;
  END IF;
  v_old_ms_ids := ARRAY[v_old_ms1, v_old_ms2];

  -- Free up milestone_number 1..5 (UNIQUE(learning_path_id, milestone_number)).
  UPDATE path_milestones SET milestone_number = milestone_number + 1000 WHERE learning_path_id = v_path_id;

  INSERT INTO path_milestones (learning_path_id, title, title_ar, milestone_number, is_active, description, description_ar, learning_objectives, learning_objectives_ar)
  VALUES (
    v_path_id, 'SAP System & ABAP Environment', 'نظام SAP وبيئة ABAP', 1, true,
    'Get oriented with the SAP ecosystem and ABAP development environment: SAP system landscape and architecture, installing and configuring SAP GUI, navigating SAP Easy Access, the ABAP Workbench, transport requests, and the RICEFW classification used in real implementation projects.',
    'تعرّف على منظومة SAP وبيئة تطوير ABAP: بنية نظام SAP ومشهد الأنظمة، تثبيت وتهيئة SAP GUI، التنقل في SAP Easy Access، أداة ABAP Workbench، طلبات النقل (Transport Requests)، وتصنيف RICEFW المستخدم في مشاريع التنفيذ الحقيقية.',
    '["Explain SAP''s application server architecture and system landscape", "Install and configure SAP GUI and log on to an SAP system", "Navigate SAP Easy Access and the ABAP Workbench using transaction codes", "Distinguish SAP-specific vs. customer-specific objects, and use Object Navigator, packages, and transport requests", "Classify implementation work using the RICEFW framework"]'::jsonb,
    '["شرح بنية خادم التطبيقات في SAP ومشهد الأنظمة", "تثبيت وتهيئة SAP GUI وتسجيل الدخول إلى نظام SAP", "التنقل في SAP Easy Access وABAP Workbench باستخدام رموز المعاملات", "التمييز بين الكائنات الخاصة بـ SAP والكائنات الخاصة بالعميل، واستخدام Object Navigator والحزم وطلبات النقل", "تصنيف أعمال التنفيذ باستخدام إطار عمل RICEFW"]'::jsonb
  ) RETURNING id INTO v_ms1;

  INSERT INTO path_milestones (learning_path_id, title, title_ar, milestone_number, is_active, description, description_ar, learning_objectives, learning_objectives_ar)
  VALUES (
    v_path_id, 'ABAP Programming Fundamentals', 'أساسيات برمجة ABAP', 2, true,
    'Learn core ABAP programming: working in the ABAP Editor, declaring data types and data objects, writing your first programs, conditional logic (IF, CASE), loops (DO, WHILE), and string operations.',
    'تعلّم أساسيات برمجة ABAP: العمل في محرر ABAP، تعريف أنواع البيانات وكائنات البيانات، كتابة أول برامجك، المنطق الشرطي (IF، CASE)، الحلقات التكرارية (DO، WHILE)، وعمليات النصوص.',
    '["Write and run programs in the ABAP Editor", "Declare and use ABAP data types and data objects", "Write conditional logic with IF and CASE", "Build loops with DO and WHILE, including CONTINUE and CHECK", "Manipulate strings with CONCATENATE, SPLIT, CONDENSE, FIND, TRANSLATE, and SHIFT"]'::jsonb,
    '["كتابة وتشغيل البرامج في محرر ABAP", "تعريف واستخدام أنواع وكائنات البيانات في ABAP", "كتابة منطق شرطي باستخدام IF و CASE", "بناء حلقات تكرارية باستخدام DO و WHILE، بما في ذلك CONTINUE و CHECK", "معالجة النصوص باستخدام CONCATENATE و SPLIT و CONDENSE و FIND و TRANSLATE و SHIFT"]'::jsonb
  ) RETURNING id INTO v_ms2;

  INSERT INTO path_milestones (learning_path_id, title, title_ar, milestone_number, is_active, description, description_ar, learning_objectives, learning_objectives_ar)
  VALUES (
    v_path_id, 'String Comparison Operators & Internal Tables', 'مؤثرات مقارنة النصوص والجداول الداخلية', 3, true,
    'Master ABAP''s string comparison operators (CO, CN, CA, NA, CS, NS, CP, NP) and internal tables: work areas, core operations (APPEND, LOOP, DELETE, MODIFY, READ TABLE, SORT, COLLECT), and the differences between Standard, Sorted, and Hashed table types.',
    'إتقان مؤثرات مقارنة النصوص في ABAP (CO، CN، CA، NA، CS، NS، CP، NP) والجداول الداخلية: منطقة العمل، العمليات الأساسية (APPEND، LOOP، DELETE، MODIFY، READ TABLE، SORT، COLLECT)، والفروق بين أنواع الجداول Standard و Sorted و Hashed.',
    '["Apply ABAP''s string comparison operators (CO, CN, CA, NA, CS, NS, CP, NP) correctly", "Declare and use internal tables with a work area", "Perform core internal table operations: APPEND, LOOP, DELETE, MODIFY, READ TABLE, SORT, COLLECT", "Compare Standard, Sorted, and Hashed internal table types and when to use each", "Work with internal tables with and without a header line"]'::jsonb,
    '["تطبيق مؤثرات مقارنة النصوص في ABAP (CO، CN، CA، NA، CS، NS، CP، NP) بشكل صحيح", "تعريف واستخدام الجداول الداخلية مع منطقة عمل", "تنفيذ العمليات الأساسية على الجداول الداخلية: APPEND، LOOP، DELETE، MODIFY، READ TABLE، SORT، COLLECT", "المقارنة بين أنواع الجداول الداخلية Standard و Sorted و Hashed ومتى يُستخدم كل نوع", "العمل مع الجداول الداخلية مع وبدون سطر رأس"]'::jsonb
  ) RETURNING id INTO v_ms3;

  INSERT INTO path_milestones (learning_path_id, title, title_ar, milestone_number, is_active, description, description_ar, learning_objectives, learning_objectives_ar)
  VALUES (
    v_path_id, 'ABAP Dictionary', 'قاموس ABAP', 4, true,
    'Build database objects in the ABAP Dictionary: domains and data elements, transparent tables with the Table Maintenance Generator, primary/foreign key relationships, structures (Include/Append), views (Database, Projection, Maintenance, Help), indexes, and lock objects.',
    'بناء كائنات قاعدة البيانات في قاموس ABAP: المجالات وعناصر البيانات، الجداول الشفافة باستخدام Table Maintenance Generator، علاقات المفتاح الأساسي والخارجي، الهياكل (Include/Append)، طرق العرض (Database، Projection، Maintenance، Help)، الفهارس، وكائنات القفل.',
    '["Create domains and data elements, then build transparent tables", "Configure the Table Maintenance Generator and assign primary/foreign key relationships", "Build structures using Include and Append", "Create Database, Projection, Maintenance, and Help views", "Create indexes and lock objects to manage concurrent data access"]'::jsonb,
    '["إنشاء المجالات وعناصر البيانات، ثم بناء الجداول الشفافة", "تهيئة Table Maintenance Generator وتعيين علاقات المفتاح الأساسي والخارجي", "بناء الهياكل باستخدام Include و Append", "إنشاء طرق عرض Database و Projection و Maintenance و Help", "إنشاء الفهارس وكائنات القفل لإدارة الوصول المتزامن للبيانات"]'::jsonb
  ) RETURNING id INTO v_ms4;

  INSERT INTO path_milestones (learning_path_id, title, title_ar, milestone_number, is_active, description, description_ar, learning_objectives, learning_objectives_ar)
  VALUES (
    v_path_id, 'Modularization Techniques', 'تقنيات التجزيء البرمجي', 5, true,
    'Structure ABAP code with modularization: include programs, function modules (parameters, exceptions, testing), subroutines, and macros — including when to choose each technique over the others.',
    'هيكلة كود ABAP باستخدام تقنيات التجزيء: برامج Include، الوحدات الوظيفية بمعاملاتها واستثناءاتها واختبارها، الإجراءات الفرعية، والماكروز — بما في ذلك متى تختار كل تقنية عن الأخرى.',
    '["Modularize code using include programs", "Build and call function modules, including parameters and saved test data", "Write and call subroutines", "Define and use macros, including with placeholders and in data declarations", "Compare includes, function modules, subroutines, and macros to choose the right technique"]'::jsonb,
    '["تجزيء الكود باستخدام برامج Include", "بناء واستدعاء الوحدات الوظيفية، بما في ذلك المعاملات وبيانات الاختبار المحفوظة", "كتابة واستدعاء الإجراءات الفرعية", "تعريف واستخدام الماكروز، بما في ذلك مع العناصر النائبة وفي تعريف البيانات", "المقارنة بين Includes والوحدات الوظيفية والإجراءات الفرعية والماكروز لاختيار التقنية المناسبة"]'::jsonb
  ) RETURNING id INTO v_ms5;

  CREATE TEMP TABLE _video_ms_map (title text, ms_id uuid) ON COMMIT DROP;

  INSERT INTO _video_ms_map (title, ms_id) VALUES
    -- MS1 — SAP System & ABAP Environment (28)
    ('1 - Basics of SAP and ABAP - Introduction Part1', v_ms1),
    ('2 - Basics of SAP and ABAP - Introduction Part2', v_ms1),
    ('3 - Basics of SAP and ABAP - Application Server Architecture', v_ms1),
    ('4 - Basics of SAP and ABAP - SAP System Landscape', v_ms1),
    ('5 - Basics of SAP and ABAP - Introduction and Types of SAP GUI', v_ms1),
    ('6 - Basics of SAP and ABAP - Installation of SAP GUI', v_ms1),
    ('7 - Basics of SAP and ABAP - SAP Log on Pad Configuration', v_ms1),
    ('8 - Basics of SAP and ABAP - Points Related to SAP GUI Installation', v_ms1),
    ('9 - Basics of SAP and ABAP - Features of SAP GUI', v_ms1),
    ('10 - Basics of SAP and ABAP - Elements of SAP GUI Part1', v_ms1),
    ('11 - Basics of SAP and ABAP - Elements of SAP GUI Part2', v_ms1),
    ('12 - Basics of SAP and ABAP - SAP Easy Access', v_ms1),
    ('13 - Basics of SAP and ABAP - ABAP Workbench and Transaction Code', v_ms1),
    ('14 - Basics of SAP and ABAP - Log Off From SAP System', v_ms1),
    ('15 - Basics of SAP and ABAP - SAP GUI Theme Settings', v_ms1),
    ('16 - Basics of SAP and ABAP - F4 and F1 Help in SAP', v_ms1),
    ('17 - Basics of SAP and ABAP - SAP Specific and Customer Specific Objects', v_ms1),
    ('18 - Basics of SAP and ABAP - Object Navigator, Package and Transport Request Part1', v_ms1),
    ('19 - Basics of SAP and ABAP - Object Navigator, Package and Transport Request Part2', v_ms1),
    ('20 - Basics of SAP and ABAP - Header and Item Tables Part1', v_ms1),
    ('21 - Basics of SAP and ABAP - Header and Item Tables Part2', v_ms1),
    ('22 - Basics of SAP and ABAP - Header and Item Tables Part3', v_ms1),
    ('23 - Basics of SAP and ABAP - Types of Projects in SAP', v_ms1),
    ('24 - Basics of SAP and ABAP - RICEFW Part1', v_ms1),
    ('25 - Basics of SAP and ABAP - RICEFW Part2', v_ms1),
    ('26 - Basics of SAP and ABAP - RICEFW Part3', v_ms1),
    ('27 - Basics of SAP and ABAP - Comparison of ECC, SOH and S4H Part1', v_ms1),
    ('28 - Basics of SAP and ABAP - Comparison of ECC, SOH and S4H Part2', v_ms1),

    -- MS2 — ABAP Programming Fundamentals (30)
    ('1 - ABAP Programming - ABAP Editor Part1', v_ms2),
    ('2 - ABAP Programming - ABAP Editor Part2', v_ms2),
    ('3 - ABAP Programming - ABAP Editor Part3', v_ms2),
    ('4 - ABAP Programming - ABAP Editor - Important Points', v_ms2),
    ('5 - ABAP Programming - Data Types and Data Objects Part1', v_ms2),
    ('6 - ABAP Programming - Data Types and Data Objects Part2', v_ms2),
    ('7 - ABAP Programming - Data Types and Data Objects Part3', v_ms2),
    ('8 - ABAP Programming - Character and Numeric Data Types', v_ms2),
    ('9 - ABAP Programming - First Basic Program Part1', v_ms2),
    ('10 - ABAP Programming - First Basic Program Part2', v_ms2),
    ('11 - ABAP Programming - First Basic Program Part3', v_ms2),
    ('12 - ABAP Programming - Conditional Statements - IF Part1', v_ms2),
    ('13 - ABAP Programming - Conditional Statements - IF Part2', v_ms2),
    ('14 - ABAP Programming - Conditional Statements - CASE', v_ms2),
    ('15 - ABAP Programming - Loop - DO Loop Part1', v_ms2),
    ('16 - ABAP Programming - Loop - DO Loop Part2', v_ms2),
    ('17 - ABAP Programming - Loop - WHILE Loop', v_ms2),
    ('18 - ABAP Programming - Loop Statements - CONTINUE', v_ms2),
    ('19 - ABAP Programming - Loop Statements - CHECK', v_ms2),
    ('20 - ABAP Programming - System Variables Part1', v_ms2),
    ('21 - ABAP Programming - System Variables Part2', v_ms2),
    ('22 - ABAP Programming - String Operations - CONCATENATE', v_ms2),
    ('23 - ABAP Programming - String Operations - SPLIT', v_ms2),
    ('24 - ABAP Programming - String Operations - CONDENSE and STRLEN', v_ms2),
    ('25 - ABAP Programming - String Operations - FIND', v_ms2),
    ('26 - ABAP Programming - String Operations - TRANSLATE', v_ms2),
    ('27 - ABAP Programming - String Operations - SHIFT Part1', v_ms2),
    ('28 - ABAP Programming - String Operations - SHIFT Part2', v_ms2),
    ('29 - ABAP Programming - String Operations - Substring Processing', v_ms2),
    ('30 - ABAP Programming - String Operations - Important Points', v_ms2),

    -- MS3 — String Comparison Operators & Internal Tables (42)
    ('31 - ABAP Programming - String Comparison Operators - Introduction', v_ms3),
    ('32 - ABAP Programming - String Comparison Operators - CO Part1', v_ms3),
    ('33 - ABAP Programming - String Comparison Operators - CO Part2', v_ms3),
    ('34 - ABAP Programming - String Comparison Operators - CN', v_ms3),
    ('35 - ABAP Programming - String Comparison Operators - CA', v_ms3),
    ('36 - ABAP Programming - String Comparison Operators - NA', v_ms3),
    ('37 - ABAP Programming - String Comparison Operators - CS', v_ms3),
    ('38 - ABAP Programming - String Comparison Operators - Comparison CO and CS', v_ms3),
    ('39 - ABAP Programming - String Comparison Operators - NS', v_ms3),
    ('40 - ABAP Programming - String Comparison Operators - CP Using *', v_ms3),
    ('41 - ABAP Programming - String Comparison Operators - CP Using #', v_ms3),
    ('42 - ABAP Programming - String Comparison Operators - CP Using +', v_ms3),
    ('43 - ABAP Programming - String Comparison Operators - NP Using * and #', v_ms3),
    ('44 - ABAP Programming - String Comparison Operators - NP Using # and +', v_ms3),
    ('45 - ABAP Programming - Internal Table and Work Area Part1', v_ms3),
    ('46 - ABAP Programming - Internal Table and Work Area Part2', v_ms3),
    ('47 - ABAP Programming - Internal Table and Work Area Part3', v_ms3),
    ('48 - ABAP Programming - Internal Table and Work Area Part4', v_ms3),
    ('49 - ABAP Programming - Internal Table Operations - APPEND', v_ms3),
    ('50 - ABAP Programming - Internal Table Operations - LOOP', v_ms3),
    ('51 - ABAP Programming - Internal Table Operations - DELETE', v_ms3),
    ('52 - ABAP Programming - Internal Table Operations - MODIFY', v_ms3),
    ('53 - ABAP Programming - Internal Table Operations - READ TABLE', v_ms3),
    ('54 - ABAP Programming - Internal Table Operations - CLEAR, REFRESH and DESCRIBE', v_ms3),
    ('55 - ABAP Programming - Internal Table Operations - SORT', v_ms3),
    ('56 - ABAP Programming - Internal Table Operations - COLLECT Part1', v_ms3),
    ('57 - ABAP Programming - Internal Table Operations - COLLECT Part2', v_ms3),
    ('58 - ABAP Programming - Internal Table Operations - COLLECT Part3', v_ms3),
    ('59 - ABAP Programming - Types of Internal Tables - Standard Part1', v_ms3),
    ('60 - ABAP Programming - Types of Internal Tables - Standard Part2', v_ms3),
    ('61 - ABAP Programming - Types of Internal Tables - Standard Part3', v_ms3),
    ('62 - ABAP Programming - Types of Internal Tables - Standard Part4', v_ms3),
    ('63 - ABAP Programming - Types of Internal Tables - Sorted Part1', v_ms3),
    ('64 - ABAP Programming - Types of Internal Tables - Sorted Part2', v_ms3),
    ('65 - ABAP Programming - Types of Internal Tables - Sorted Part3', v_ms3),
    ('66 - ABAP Programming - Types of Internal Tables - Sorted Part4', v_ms3),
    ('67 - ABAP Programming - Types of Internal Tables - Hashed Part1', v_ms3),
    ('68 - ABAP Programming - Types of Internal Tables - Hashed Part2', v_ms3),
    ('69 - ABAP Programming - Types of Internal Tables - Hashed Part3', v_ms3),
    ('70 - ABAP Programming - Types of Internal Tables - Comparison Standard, Sorted and Hashed', v_ms3),
    ('71 - ABAP Programming - Internal Tables - With and Without Header Line Part1', v_ms3),
    ('72 - ABAP Programming - Internal Tables - With and Without Header Line Part2', v_ms3),

    -- MS4 — ABAP Dictionary (32)
    ('1 - ABAP Dictionary - Introduction to Domain and Data Element', v_ms4),
    ('2 - ABAP Dictionary - Domain Creation', v_ms4),
    ('3 - ABAP Dictionary - Data Element Creation', v_ms4),
    ('4 - ABAP Dictionary - Header Table Creation Part1', v_ms4),
    ('5 - ABAP Dictionary - Header Table Creation Part2', v_ms4),
    ('6 - ABAP Dictionary - Header Table Creation Part3', v_ms4),
    ('7 - ABAP Dictionary - Table Maintenance Generator Part1', v_ms4),
    ('8 - ABAP Dictionary - Table Maintenance Generator Part2', v_ms4),
    ('9 - ABAP Dictionary - Table Maintenance Generator Part3', v_ms4),
    ('10 - ABAP Dictionary - Table Maintenance Generator Part4', v_ms4),
    ('11 - ABAP Dictionary - Importance of MANDT Field and Size Category', v_ms4),
    ('12 - ABAP Dictionary - Types of SAP Data and Data Class', v_ms4),
    ('13 - ABAP Dictionary - Delivery Class and Data Browser Options', v_ms4),
    ('14 - ABAP Dictionary - Item Table Creation Part1', v_ms4),
    ('15 - ABAP Dictionary - Item Table Creation Part2', v_ms4),
    ('16 - ABAP Dictionary - Assigning Primary-Foreign Key Relationship', v_ms4),
    ('17 - ABAP Dictionary - Item Table Creation Part3', v_ms4),
    ('18 - ABAP Dictionary - Types of SAP Database Tables', v_ms4),
    ('19 - ABAP Dictionary - Structures - Include and Append Part1', v_ms4),
    ('20 - ABAP Dictionary - Structures - Include and Append Part2', v_ms4),
    ('21 - ABAP Dictionary - Structures - Include and Append Part3', v_ms4),
    ('22 - ABAP Dictionary - Structures - Include and Append Part4', v_ms4),
    ('23 - ABAP Dictionary - Views - Introduction', v_ms4),
    ('24 - ABAP Dictionary - Views - Database View and Projection View', v_ms4),
    ('25 - ABAP Dictionary - Views - Maintenance View Part1', v_ms4),
    ('26 - ABAP Dictionary - Views - Maintenance View Part2', v_ms4),
    ('27 - ABAP Dictionary - Views - Maintenance View Part3', v_ms4),
    ('28 - ABAP Dictionary - Views - Help View', v_ms4),
    ('29 - ABAP Dictionary - Indexes Part1', v_ms4),
    ('30 - ABAP Dictionary - Indexes Part2', v_ms4),
    ('51 - ABAP Dictionary - Lock Objects - Lock Modes Part2', v_ms4),
    ('52 - ABAP Dictionary - Lock Objects - Creation', v_ms4),

    -- MS5 — Modularization Techniques (45)
    ('1 - Modularization Techniques - Introduction', v_ms5),
    ('2 - Modularization Techniques - Include Programs Part1', v_ms5),
    ('3 - Modularization Techniques - Include Programs Part2', v_ms5),
    ('4 - Modularization Techniques - Function Modules Part1', v_ms5),
    ('5 - Modularization Techniques - Function Modules Part2', v_ms5),
    ('6 - Modularization Techniques - Function Modules Part3', v_ms5),
    ('7 - Modularization Techniques - Function Modules Part4', v_ms5),
    ('8 - Modularization Techniques - Function Modules Part5', v_ms5),
    ('9 - Modularization Techniques - Function Modules Part6', v_ms5),
    ('10 - Modularization Techniques - Function Modules Part7', v_ms5),
    ('11 - Modularization Techniques - Function Modules Part8', v_ms5),
    ('12 - Modularization Techniques - Function Modules Part9', v_ms5),
    ('13 - Modularization Techniques - Function Modules Part10', v_ms5),
    ('14 - Modularization Techniques - Function Modules Part11', v_ms5),
    ('15 - Modularization Techniques - Function Modules Part12', v_ms5),
    ('16 - Modularization Techniques - Function Modules Part13', v_ms5),
    ('17 - Modularization Techniques - Function Modules Part14', v_ms5),
    ('18 - Modularization Techniques - Function Modules Part15', v_ms5),
    ('19 - Modularization Techniques - Function Modules Part16', v_ms5),
    ('20 - Modularization Techniques - Function Modules Part17', v_ms5),
    ('21 - Modularization Techniques - Function Modules - Operations', v_ms5),
    ('22 - Modularization Techniques - Function Modules - Save Parameters as Test Data', v_ms5),
    ('23 - Modularization Techniques - Subroutines Part1', v_ms5),
    ('24 - Modularization Techniques - Subroutines Part2', v_ms5),
    ('25 - Modularization Techniques - Subroutines Part3', v_ms5),
    ('26 - Modularization Techniques - Subroutines Part4', v_ms5),
    ('27 - Modularization Techniques - Subroutines Part5', v_ms5),
    ('28 - Modularization Techniques - Subroutines Part6', v_ms5),
    ('29 - Modularization Techniques - Subroutines Part7', v_ms5),
    ('30 - Modularization Techniques - Subroutines Part8', v_ms5),
    ('31 - Modularization Techniques - Subroutines Part9', v_ms5),
    ('32 - Modularization Techniques - Subroutines Part10', v_ms5),
    ('33 - Modularization Techniques - Subroutines Part11', v_ms5),
    ('34 - Modularization Techniques - Subroutines Part12', v_ms5),
    ('35 - Modularization Techniques - Subroutines Part13', v_ms5),
    ('36 - Modularization Techniques - Subroutines Part14', v_ms5),
    ('37 - Modularization Techniques - Subroutines Part15', v_ms5),
    ('38 - Modularization Techniques - Comparison of Includes, FM and Subroutines', v_ms5),
    ('39 - Modularization Techniques - Macros - Introduction and Creation Steps', v_ms5),
    ('40 - Modularization Techniques - Macros - Definition and Calling of a Basic Macro', v_ms5),
    ('41 - Modularization Techniques - Macros - Definition and Calling with Placeholders', v_ms5),
    ('42 - Modularization Techniques - Macros - Use in Calling Function Modules', v_ms5),
    ('43 - Modularization Techniques - Macros - Use in Data Declaration', v_ms5),
    ('44 - Modularization Techniques - Macros - Limitations', v_ms5),
    ('45 - Modularization Techniques - Macros - Comparison with FM and Subroutines', v_ms5);

  SELECT count(*) INTO v_total FROM _video_ms_map;

  -- Reassign — scoped to videos currently under THIS path's old milestones only.
  UPDATE video_content vc
  SET milestone_id = m.ms_id
  FROM _video_ms_map m
  WHERE vc.milestone_id = ANY(v_old_ms_ids)
    AND lower(trim(vc.title)) = lower(trim(m.title));

  SELECT count(*) INTO v_unmatched
  FROM _video_ms_map m
  WHERE NOT EXISTS (
    SELECT 1 FROM video_content vc
    WHERE vc.milestone_id IN (v_ms1, v_ms2, v_ms3, v_ms4, v_ms5)
      AND lower(trim(vc.title)) = lower(trim(m.title))
  );

  RAISE NOTICE 'Done. New milestones — ms1=%, ms2=%, ms3=%, ms4=%, ms5=%', v_ms1, v_ms2, v_ms3, v_ms4, v_ms5;
  RAISE NOTICE '% of % listed titles did NOT match an existing video (run STEP 3 to see which).', v_unmatched, v_total;
END $$;

-- -----------------------------------------------------------------------------
-- STEP 3: verify results after STEP 2
-- -----------------------------------------------------------------------------
/*
-- Video counts per milestone (old ones now sit at milestone_number > 100):
SELECT pm.milestone_number, pm.title, count(vc.id) AS video_count
FROM path_milestones pm
LEFT JOIN video_content vc ON vc.milestone_id = pm.id
WHERE pm.learning_path_id = (SELECT id FROM learning_paths WHERE title ILIKE '%Modern ABAP Core Skills%')
GROUP BY pm.id, pm.milestone_number, pm.title
ORDER BY pm.milestone_number;

-- Videos still stuck on an OLD milestone (didn't match any of the 177 listed titles) —
-- paste this output back into chat so the 3 "Galal Academy AR video" categories
-- (business-process videos, SAP consultant career videos, certification process video)
-- can be matched to exact rows and moved precisely instead of guessed at:
SELECT vc.id, vc.title, pm.title AS still_under_milestone
FROM video_content vc
JOIN path_milestones pm ON pm.id = vc.milestone_id
WHERE pm.learning_path_id = (SELECT id FROM learning_paths WHERE title ILIKE '%Modern ABAP Core Skills%')
  AND pm.milestone_number > 100
ORDER BY pm.milestone_number, vc.title;
*/
