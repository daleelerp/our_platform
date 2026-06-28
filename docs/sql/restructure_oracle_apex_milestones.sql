-- =============================================================================
-- Restructure the Oracle APEX path: split its current 2 milestones into 5,
-- and reassign each existing video to its new milestone by exact title match.
-- =============================================================================
-- Run in Supabase Dashboard → SQL Editor (postgres / service role).
--
-- The two old milestones currently hold 101 + 4 = 105 videos; only 99 are listed below
-- (43 EN + 56 AR), so at least 6 will legitimately remain unmatched on the old milestones
-- after this runs — that's expected, not a bug. Review them in STEP 2 and decide per-video.
--
-- This script does NOT delete the old milestones, and does NOT touch the
-- 4 existing milestone resources (no title list was given for those — move
-- them manually via the admin UI). After running:
--   1. Run STEP 2 below to see the new video counts per milestone, and any
--      videos that were NOT matched (titles differ slightly from the DB).
--   2. Fix any unmatched titles (either rename the video, or add a row to
--      the _video_ms_map list below and re-run just the UPDATE block).
--   3. Once an old milestone has 0 videos left and its resources are moved,
--      delete it from the admin UI ("Delete Milestone" now cascades videos
--      + exclusive resources + quizzes — make sure nothing is left on it
--      that you still want, since the delete is permanent).
--
-- Targets the two existing milestones by their confirmed ids (from STEP 0's output) instead
-- of matching the path/milestone title text — both titles use non-ASCII dash characters
-- ("APEX Hands‑on" uses U+2011), so an exact-string match would be fragile.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 0 (preview, already run): confirmed the two existing milestones
-- -----------------------------------------------------------------------------
/*
SELECT id, title FROM learning_paths WHERE title ILIKE '%apex%';

SELECT pm.id, pm.title, pm.milestone_number,
       (SELECT count(*) FROM video_content vc WHERE vc.milestone_id = pm.id) AS video_count
FROM path_milestones pm
WHERE pm.learning_path_id = (SELECT id FROM learning_paths WHERE title ILIKE '%apex%' LIMIT 1)
ORDER BY pm.milestone_number;

-- Result:
--   f2e62f42-3dfe-46b8-928c-682791e30d59  "Learn Oracle APEX from Scratch"  #1  101 videos
--   428910f3-39c5-4049-89df-cab6e74ce07c  "APEX Hands‑on"                   #2    4 videos
*/

-- -----------------------------------------------------------------------------
-- STEP 1: run as a single statement
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_path_id uuid;
  v_old_ms1 uuid := 'f2e62f42-3dfe-46b8-928c-682791e30d59'; -- "Learn Oracle APEX from Scratch"
  v_old_ms2 uuid := '428910f3-39c5-4049-89df-cab6e74ce07c'; -- "APEX Hands‑on"
  v_old_ms_ids uuid[] := ARRAY[v_old_ms1, v_old_ms2];
  v_ms1 uuid; v_ms2 uuid; v_ms3 uuid; v_ms4 uuid; v_ms5 uuid;
  v_unmatched int;
  v_total int;
BEGIN
  SELECT learning_path_id INTO v_path_id FROM path_milestones WHERE id = v_old_ms1;
  IF v_path_id IS NULL THEN
    RAISE EXCEPTION 'Milestone % not found — re-run STEP 0 and update the ids above.', v_old_ms1;
  END IF;

  -- Free up milestone_number 1..5 (UNIQUE(learning_path_id, milestone_number)) by moving the
  -- old milestones out of the way instead of deleting them.
  UPDATE path_milestones SET milestone_number = milestone_number + 1000 WHERE learning_path_id = v_path_id;

  INSERT INTO path_milestones (learning_path_id, title, milestone_number, is_active)
    VALUES (v_path_id, 'MS1 — APEX Foundations & Environment', 1, true) RETURNING id INTO v_ms1;
  INSERT INTO path_milestones (learning_path_id, title, milestone_number, is_active)
    VALUES (v_path_id, 'MS2 — Pages, Forms & Reports', 2, true) RETURNING id INTO v_ms2;
  INSERT INTO path_milestones (learning_path_id, title, milestone_number, is_active)
    VALUES (v_path_id, 'MS3 — Navigation, UI & Themes', 3, true) RETURNING id INTO v_ms3;
  INSERT INTO path_milestones (learning_path_id, title, milestone_number, is_active)
    VALUES (v_path_id, 'MS4 — Security, APIs & Dynamic Actions', 4, true) RETURNING id INTO v_ms4;
  INSERT INTO path_milestones (learning_path_id, title, milestone_number, is_active)
    VALUES (v_path_id, 'MS5 — Advanced Features, AI & Real Projects', 5, true) RETURNING id INTO v_ms5;

  CREATE TEMP TABLE _video_ms_map (title text, ms_id uuid) ON COMMIT DROP;

  INSERT INTO _video_ms_map (title, ms_id) VALUES
    -- MS1 — EN (Ora Trainings)
    ('Oracle APEX Introduction', v_ms1),
    ('Oracle APEX Architecture', v_ms1),
    ('Oracle APEX - SQL Workshop', v_ms1),
    ('Oracle APEX - Create Workspace in Autonomous DB', v_ms1),
    -- MS1 — AR (Ali Saleh)
    ('oracle Apex course intro', v_ms1),
    ('oracle apex course session 1 part 1', v_ms1),
    ('oracle apex course session 1 part 2', v_ms1),
    ('oracle apex course session 2 part 1', v_ms1),
    ('oracle apex course session 2 part 2', v_ms1),

    -- MS2 — EN
    ('Oracle APEX Report - Report Types and Classic Report Demo', v_ms2),
    ('Oracle APEX - Interactive Report Creation and Customizations', v_ms2),
    ('Oracle APEX Report - Interactive Grid - Live Demo', v_ms2),
    ('Oracle APEX- Form and Form Types - APEX Custom Form with PLSQL Demo', v_ms2),
    ('Oracle APEX - Master Detail Page Styles and Demo', v_ms2),
    ('Oracle APEX- Modal and Non Modal Page Modes', v_ms2),
    ('Oracle APEX - Tree Sample - for OEHR Employees Table', v_ms2),
    ('Oracle APEX - Tree - Hierarchical Query', v_ms2),
    -- MS2 — AR
    ('oracle apex course session 3 part 1', v_ms2),
    ('oracle apex course session 3 part 2', v_ms2),
    ('oracle apex course session 4 part 1', v_ms2),
    ('oracle apex course session 4 part 2', v_ms2),
    ('oracle apex course session 5 part 1', v_ms2),
    ('oracle apex course session 5 part 2', v_ms2),
    ('oracle apex course session 6 part 1', v_ms2),
    ('oracle apex course session 6 part 2', v_ms2),

    -- MS3 — EN
    ('Oracle APEX - Application Items and Page Items', v_ms3),
    ('Oracle APEX - BreadCrumb', v_ms3),
    ('Oracle APEX - Navigation List, Navigation Bar', v_ms3),
    ('Oracle APEX - Themes and Templates', v_ms3),
    ('Oracle APEX - Pass Parameters From Dept Page to Emp Page', v_ms3),
    ('Oracle APEX - Feedback Feature Page', v_ms3),
    ('Oracle APEX - Facet Search Creation - Add New Facet Manually', v_ms3),
    ('Oracle APEX - Faceted Search Page - Chars - Dashboard', v_ms3),
    ('Oracle APEX - Calendar Sample App Using Table & SQL Query', v_ms3),
    -- MS3 — AR
    ('oracle apex course session 7 part 1', v_ms3),
    ('oracle apex course session 7 part 2', v_ms3),
    ('oracle apex course session 8 part 1', v_ms3),
    ('oracle apex course session 8 part 2', v_ms3),
    ('oracle apex course session 9 part 1', v_ms3),
    ('oracle apex course session 9 part 2', v_ms3),
    ('oracle apex course session 10 part 1', v_ms3),
    ('oracle apex course session 10 part 2', v_ms3),
    ('oracle apex course session 11 part 1', v_ms3),
    ('oracle apex course session 11 part 2', v_ms3),

    -- MS4 — EN
    ('Oracle APEX - REST/RESTful DataSource - Auto and Manual REST API', v_ms4),
    ('Oracle APEX - Install Dynamic Action Sample and Code Walkthrough', v_ms4),
    ('Oracle APEX - Authentication Scheme', v_ms4),
    ('Oracle APEX- Authorization Scheme - Page/Item Control', v_ms4),
    ('Oracle APEX - Collections - Sample Demo & Collection API''s', v_ms4),
    ('Oracle APEX - Table API - For CRUD Operations', v_ms4),
    ('Oracle APEX - File Download , View Image and File Upload - Sample', v_ms4),
    ('Oracle APEX - Data Loader - CSV File', v_ms4),
    ('Oracle APEX - Data Parsing Using - APEX_DATA_PARSER API', v_ms4),
    ('Oracle APEX - Validate User Name, Get Current User Details', v_ms4),
    ('Oracle APEX MetadataViews - apex_dictionary', v_ms4),
    -- MS4 — AR
    ('oracle apex course session 12 part 1', v_ms4),
    ('oracle apex course session 12 part 2', v_ms4),
    ('oracle apex course session 13 part 1', v_ms4),
    ('oracle apex course session 13 part 2', v_ms4),
    ('oracle apex course session 13 part 3', v_ms4),
    ('oracle apex course session 14 part 1', v_ms4),
    ('oracle apex course session 14 part 2', v_ms4),
    ('oracle apex course session 15 part 1', v_ms4),
    ('oracle apex course session 15 part 2', v_ms4),
    ('oracle apex course session 16 part 1', v_ms4),
    ('oracle apex course session 16 part 2', v_ms4),
    ('oracle apex course session 17 part 1', v_ms4),
    ('oracle apex course session 17 part 2', v_ms4),

    -- MS5 — EN
    ('Oracle APEX - Globalization and Translation', v_ms5),
    ('Oracle APEX - Email Using APEX_MAIL.SEND', v_ms5),
    ('Oracle APEX Email Functionality - Using Send-Email Process', v_ms5),
    ('SYS.HTP.P - Dynamic HTML Generation in Oracle APEX', v_ms5),
    ('Oracle APEX PrintReport - 24.1 Latest Feature', v_ms5),
    ('APEX Wizard Page - How to create Wizard Page', v_ms5),
    ('Working Copy - Main - Application - In - Oracle APEX', v_ms5),
    ('CSV/Zip File Creation Using SQL Query', v_ms5),
    ('Execution Chain - Run In Background', v_ms5),
    ('Using Generative AI In Oracle APEX - Using Cohere LLM', v_ms5),
    ('Show AI Assistant - Generate Text With AI', v_ms5),
    -- MS5 — AR
    ('oracle apex course session 18 part 1', v_ms5),
    ('oracle apex course session 18 part 2', v_ms5),
    ('oracle apex course session 19 part 1', v_ms5),
    ('oracle apex course session 19 part 2', v_ms5),
    ('oracle apex course session 20 part 1', v_ms5),
    ('oracle apex course session 20 part 2', v_ms5),
    ('oracle apex course session 21 part 1', v_ms5),
    ('oracle apex course session 21 part 2', v_ms5),
    ('oracle apex course session 22 part 1', v_ms5),
    ('oracle apex course session 22 part 2', v_ms5),
    ('oracle apex course session 23 part 1', v_ms5),
    ('oracle apex course session 23 part 2', v_ms5),
    ('oracle apex course session 24 part 1', v_ms5),
    ('oracle apex course session 24 part 2', v_ms5),
    ('oracle apex course session 25 part 1', v_ms5),
    ('oracle apex course session 25 part 2', v_ms5),
    ('oracle apex course session 26 part 1', v_ms5),
    ('oracle apex course session 26 part 2', v_ms5),
    ('oracle apex course session 27 (last) part 1', v_ms5),
    ('oracle apex course session 27 (last) part 2', v_ms5);

  SELECT count(*) INTO v_total FROM _video_ms_map;

  -- Reassign — scoped to videos currently under THIS path's old milestones only, so a
  -- coincidentally identical title elsewhere in the DB is never touched.
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
  RAISE NOTICE '% of % listed titles did NOT match an existing video (run STEP 2 to see which, then fix title or re-run).', v_unmatched, v_total;
END $$;

-- -----------------------------------------------------------------------------
-- STEP 2: verify results after STEP 1
-- -----------------------------------------------------------------------------
/*
-- Video counts per milestone (old ones now sit at milestone_number > 100):
SELECT pm.milestone_number, pm.title, count(vc.id) AS video_count
FROM path_milestones pm
LEFT JOIN video_content vc ON vc.milestone_id = pm.id
WHERE pm.learning_path_id = (
  SELECT learning_path_id FROM path_milestones WHERE id = 'f2e62f42-3dfe-46b8-928c-682791e30d59'
)
GROUP BY pm.id, pm.milestone_number, pm.title
ORDER BY pm.milestone_number;

-- Videos still stuck on an OLD milestone (title didn't match anything in the map):
SELECT vc.id, vc.title, pm.title AS still_under_milestone
FROM video_content vc
JOIN path_milestones pm ON pm.id = vc.milestone_id
WHERE pm.id IN ('f2e62f42-3dfe-46b8-928c-682791e30d59', '428910f3-39c5-4049-89df-cab6e74ce07c');
*/

-- -----------------------------------------------------------------------------
-- STEP 3: fix the 9 confirmed near-title-mismatches found in STEP 2
-- -----------------------------------------------------------------------------
-- These 9 are exact-id matches for MS5 videos that exist with slightly different
-- text than what was listed (missing space before a dash, or an extra trailing
-- clause) — titles are quoted verbatim from the actual STEP 2 output, so this
-- targets them by id, not by another fuzzy title match.
DO $$
DECLARE
  v_ms5 uuid;
BEGIN
  SELECT id INTO v_ms5 FROM path_milestones
  WHERE title = 'MS5 — Advanced Features, AI & Real Projects'
    AND learning_path_id = (SELECT learning_path_id FROM path_milestones WHERE id = 'f2e62f42-3dfe-46b8-928c-682791e30d59');

  IF v_ms5 IS NULL THEN
    RAISE EXCEPTION 'MS5 not found — did STEP 1 run successfully?';
  END IF;

  UPDATE video_content SET milestone_id = v_ms5
  WHERE id IN (
    'df24731f-4dcc-4bd4-ac2b-8397ba9c1a8f', -- Oracle APEX - Email Using : APEX_MAIL.SEND and Send EMail Standard Process
    '3ec06ff6-b9b9-487e-b863-ab866c0457bf', -- Oracle APEX PrintReport - 24.1 Latest Feature - Generic Template and RTF Template
    '582c5747-747b-4d06-93d2-7afdfc2a058c', -- Oracle APEX Email Functionality - Using Send-Email Process and PLSQL API -  apex_mail.send()
    '243fbd5a-998a-4810-8d34-832f37829cea', -- APEX Wizard Page - How to create Wizard Page in Oracle APEX
    'b2e89218-ad7f-4090-bd83-5885453a3999', -- SYS.HTP.P- Dynamic HTML Generation in Oracle APEX
    'a1c65a29-989f-42fa-acba-b9251eb3f3dc', -- Working Copy- Main- Application - In - Oracle APEX
    'a276e2d0-8ee7-4513-afb2-816f5792aeda', -- CSV/ Zip File Creation Using SQL Query - Oracle APEX
    'a96579a3-ecfb-4efb-a0ce-3005d962d42b', -- Execution Chain - Run In Background - Oracle APEX
    '0e1fd996-4d1e-483f-91e8-6bbddfd8dfaa'  -- Show AI Assistant - Generate Text With AI - In Oracle APEX
  );

  RAISE NOTICE 'Moved 9 rows into MS5 (id %).', v_ms5;
END $$;

-- The remaining 6 leftovers were NOT in the original 99-title list, and were deliberately
-- left in place (decided 2026-06-28) rather than auto-moved or deleted:
--   028d1b7a-1f31-4deb-b861-3424688894aa  "List Buckets/Objects ... ( OCI)"        — stays on "Learn Oracle APEX from Scratch"
--   0bc5f7ea-9d85-4fe6-a5ff-67d2cdbaccf7  "Oracle APEX - Advisor"                  — stays on "Learn Oracle APEX from Scratch"
--   1ff8104e-fe6e-4f5f-b920-c58aedf047fa  "Oracle APEX All-in-One"                 — stays on "APEX Hands‑on"
--   a7705e46-478a-483f-92bc-8da28cb0424c  "MCQ Practice"                           — stays on "APEX Hands‑on"
--   fcbd5106-bd31-4886-b6df-176e64705fda  "Creating a demo"                        — stays on "APEX Hands‑on"
--   0852f00d-8373-427a-873a-9e48ce20f618  "Oracle APEX Practice Test 2026 ..."     — stays on "APEX Hands‑on"
--
-- IMPORTANT: because these 6 are still attached, do NOT delete "Learn Oracle APEX from
-- Scratch" or "APEX Hands‑on" via the admin UI yet — that delete is permanent and would
-- take these 6 videos with it. Revisit once you've decided what to do with them.

-- -----------------------------------------------------------------------------
-- STEP 4: clean up MS1-MS5 titles, add descriptions/objectives, fix numbering
-- -----------------------------------------------------------------------------
-- - Strips the "MSx — " prefix from titles (the admin UI already shows "Milestone N"
--   next to the title, so the prefix was redundant).
-- - Fills in description + learning_objectives (EN + AR) for each, grounded in the
--   actual videos assigned to that milestone.
-- - Renumbers the old milestones from the temporary 1001/1002 (used in STEP 1 only to
--   dodge the UNIQUE(learning_path_id, milestone_number) constraint during the
--   transition) to a clean 6/7 — this is almost certainly what looked like "wrong
--   order" in the admin UI; the relative sequence was already correct.
DO $$
DECLARE
  v_path_id uuid;
BEGIN
  SELECT learning_path_id INTO v_path_id FROM path_milestones WHERE id = 'f2e62f42-3dfe-46b8-928c-682791e30d59';

  UPDATE path_milestones SET
    title = 'APEX Foundations & Environment',
    title_ar = 'أساسيات Oracle APEX والبيئة',
    description = 'Get oriented with Oracle APEX: what it is, how its architecture fits together, and how to set up your first workspace and database objects using the SQL Workshop. By the end of this milestone you''ll have a working APEX workspace on Autonomous Database ready for building applications.',
    description_ar = 'تعرّف على Oracle APEX: ماهيته، وكيفية تكامل بنيته المعمارية، وكيفية إنشاء أول مساحة عمل (Workspace) وإدارة عناصر قاعدة البيانات باستخدام SQL Workshop. بنهاية هذه المرحلة ستكون لديك مساحة عمل جاهزة على قاعدة بيانات Autonomous لبناء التطبيقات.',
    learning_objectives = '["Explain what Oracle APEX is and its low-code architecture", "Create and configure a workspace on Oracle Autonomous Database", "Use the SQL Workshop to create and manage database objects", "Navigate the APEX development environment confidently"]'::jsonb,
    learning_objectives_ar = '["شرح ماهية Oracle APEX وبنيته منخفضة الكود (Low-Code)", "إنشاء وتهيئة مساحة عمل على Oracle Autonomous Database", "استخدام SQL Workshop لإنشاء وإدارة عناصر قاعدة البيانات", "التنقل بثقة داخل بيئة تطوير APEX"]'::jsonb
  WHERE learning_path_id = v_path_id AND milestone_number = 1;

  UPDATE path_milestones SET
    title = 'Pages, Forms & Reports',
    title_ar = 'الصفحات والنماذج والتقارير',
    description = 'Build the core pages every APEX app needs: classic and interactive reports, interactive grids, forms (including custom PL/SQL forms), master-detail layouts, modal vs. non-modal pages, and hierarchical tree pages.',
    description_ar = 'بناء الصفحات الأساسية التي يحتاجها أي تطبيق APEX: التقارير الكلاسيكية والتفاعلية، الشبكات التفاعلية (Interactive Grid)، النماذج (بما فيها النماذج المخصصة بلغة PL/SQL)، تخطيطات الصفحات الرئيسية والتفصيلية (Master-Detail)، الصفحات المنبثقة وغير المنبثقة، وصفحات الشجرة الهرمية.',
    learning_objectives = '["Create and customize Classic Reports, Interactive Reports, and Interactive Grids", "Build forms, including custom forms backed by PL/SQL", "Design master-detail page layouts", "Choose between modal and non-modal page modes appropriately", "Build hierarchical Tree pages from SQL queries"]'::jsonb,
    learning_objectives_ar = '["إنشاء وتخصيص التقارير الكلاسيكية والتفاعلية والشبكات التفاعلية", "بناء النماذج، بما في ذلك النماذج المخصصة المعتمدة على PL/SQL", "تصميم تخطيطات الصفحات الرئيسية والتفصيلية (Master-Detail)", "التمييز بين أنماط الصفحات المنبثقة وغير المنبثقة واستخدامها بشكل مناسب", "بناء صفحات الشجرة الهرمية من استعلامات SQL"]'::jsonb
  WHERE learning_path_id = v_path_id AND milestone_number = 2;

  UPDATE path_milestones SET
    title = 'Navigation, UI & Themes',
    title_ar = 'التنقل وواجهة المستخدم والثيمات',
    description = 'Shape how users move through and experience your application: application and page items, breadcrumbs, navigation lists and bars, themes and templates, passing parameters between pages, the Feedback feature, faceted search, and calendar-based apps.',
    description_ar = 'صياغة طريقة تنقل المستخدم وتجربته داخل التطبيق: عناصر التطبيق والصفحة، مسارات التنقل (Breadcrumb)، قوائم وأشرطة التنقل، الثيمات والقوالب، تمرير المعاملات بين الصفحات، ميزة التغذية الراجعة، البحث متعدد الأوجه، وتطبيقات التقويم.',
    learning_objectives = '["Use application items and page items to manage state", "Build breadcrumb and navigation list/bar navigation", "Apply and customize APEX themes and templates", "Pass parameters between pages", "Add faceted search and the built-in Feedback feature", "Build a calendar application from a SQL query"]'::jsonb,
    learning_objectives_ar = '["استخدام عناصر التطبيق وعناصر الصفحة لإدارة الحالة", "بناء التنقل عبر Breadcrumb وقوائم/أشرطة التنقل", "تطبيق وتخصيص ثيمات وقوالب APEX", "تمرير المعاملات بين الصفحات", "إضافة البحث متعدد الأوجه وميزة التغذية الراجعة المدمجة", "بناء تطبيق تقويم من استعلام SQL"]'::jsonb
  WHERE learning_path_id = v_path_id AND milestone_number = 3;

  UPDATE path_milestones SET
    title = 'Security, APIs & Dynamic Actions',
    title_ar = 'الأمان وواجهات البرمجة والإجراءات الديناميكية',
    description = 'Secure your application and connect it to data and behavior beyond static pages: authentication and authorization schemes, Dynamic Actions, REST data sources, Collections, the Table API for CRUD, file upload/download, the Data Loader, APEX_DATA_PARSER, and APEX''s metadata dictionary views.',
    description_ar = 'تأمين التطبيق وربطه بالبيانات والسلوكيات بما يتجاوز الصفحات الثابتة: أنظمة المصادقة والتفويض، الإجراءات الديناميكية، مصادر بيانات REST، المجموعات (Collections)، واجهة Table API لعمليات CRUD، تحميل ورفع الملفات، أداة Data Loader، APEX_DATA_PARSER، وقوائم البيانات الوصفية.',
    learning_objectives = '["Configure Authentication and Authorization schemes", "Build Dynamic Actions to add client-side interactivity", "Consume REST/RESTful data sources (auto and manual)", "Use Collections and the Collection APIs", "Perform CRUD operations with the Table API", "Handle file upload/download and bulk CSV loading with the Data Loader", "Parse external data with APEX_DATA_PARSER and query apex_dictionary metadata"]'::jsonb,
    learning_objectives_ar = '["تهيئة أنظمة المصادقة والتفويض", "بناء الإجراءات الديناميكية لإضافة تفاعل من جانب العميل", "استهلاك مصادر بيانات REST (تلقائيًا ويدويًا)", "استخدام المجموعات وواجهات برمجتها", "تنفيذ عمليات CRUD باستخدام Table API", "التعامل مع رفع/تحميل الملفات والتحميل الجماعي لملفات CSV عبر Data Loader", "تحليل البيانات الخارجية باستخدام APEX_DATA_PARSER والاستعلام عن apex_dictionary"]'::jsonb
  WHERE learning_path_id = v_path_id AND milestone_number = 4;

  UPDATE path_milestones SET
    title = 'Advanced Features, AI & Real Projects',
    title_ar = 'الميزات المتقدمة والذكاء الاصطناعي والمشاريع العملية',
    description = 'Go beyond the basics with globalization and translation, transactional email, dynamic HTML generation, advanced printing, page wizards, working copies, background execution chains, and Oracle APEX''s built-in Generative AI features.',
    description_ar = 'تجاوز الأساسيات مع التعريب والترجمة، البريد الإلكتروني التبادلي، توليد HTML الديناميكي، الطباعة المتقدمة، معالجات الصفحات، النسخ العاملة، سلاسل التنفيذ في الخلفية، وميزات الذكاء الاصطناعي التوليدي المدمجة في Oracle APEX.',
    learning_objectives = '["Globalize and translate an APEX application", "Send transactional email with APEX_MAIL.SEND and the Send Email process", "Generate dynamic HTML with SYS.HTP.P", "Use PrintReport, Wizard pages, and Working Copies", "Run background processing with Execution Chains", "Use Oracle APEX''s built-in Generative AI (Cohere LLM) and AI Assistant features"]'::jsonb,
    learning_objectives_ar = '["تعريب وترجمة تطبيق APEX", "إرسال بريد إلكتروني تبادلي باستخدام APEX_MAIL.SEND وإجراء Send Email", "توليد HTML ديناميكي باستخدام SYS.HTP.P", "استخدام PrintReport ومعالجات الصفحات والنسخ العاملة", "تنفيذ معالجة في الخلفية باستخدام سلاسل التنفيذ", "استخدام ميزات الذكاء الاصطناعي التوليدي المدمجة في Oracle APEX ومساعد الذكاء الاصطناعي"]'::jsonb
  WHERE learning_path_id = v_path_id AND milestone_number = 5;

  -- No longer need the +1000 gap now that 1..5 are permanently occupied by the new milestones.
  UPDATE path_milestones SET milestone_number = 6 WHERE id = 'f2e62f42-3dfe-46b8-928c-682791e30d59'; -- "Learn Oracle APEX from Scratch"
  UPDATE path_milestones SET milestone_number = 7 WHERE id = '428910f3-39c5-4049-89df-cab6e74ce07c'; -- "APEX Hands‑on"

  RAISE NOTICE 'MS1-MS5 titles/content updated; old milestones renumbered to 6 and 7.';
END $$;
