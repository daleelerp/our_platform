-- =====================================================
-- UPDATE EXISTING LEARNING PATHS WITH ARABIC TRANSLATIONS
-- Run this if paths exist but Arabic translations are missing
-- =====================================================

-- Update Path 1: Foundation for Business
UPDATE learning_paths
SET 
    title_ar = 'أساسيات أوراكل المالية لمحترفي الأعمال',
    description_ar = 'ابدأ رحلتك في أوراكل المالية السحابية. هذا المسار مصمم لمحترفي المالية الذين يريدون فهم كيفية عمل نظام أوراكل السحابي والاستعداد لأدوار أوراكل المالية المبتدئة. لا يتطلب خبرة سابقة في أوراكل.'
WHERE slug = 'oracle-financials-foundation-business'
   OR title ILIKE '%Foundation%Business%';

-- Update Path 2: Functional Consultant
UPDATE learning_paths
SET 
    title_ar = 'مسار استشاري أوراكل المالية الوظيفي',
    description_ar = 'كن استشاري تطبيق أوراكل المالية السحابية. يغطي هذا المسار الشامل كل ما تحتاجه لتكوين أوراكل المالية، وجمع المتطلبات، وتصميم الحلول، وقيادة التطبيقات. مثالي لمحترفي المالية ذوي الخبرة الذين ينتقلون إلى الاستشارات.'
WHERE slug = 'oracle-financials-functional-consultant'
   OR title ILIKE '%Functional Consultant%';

-- Update Path 3: Technical Foundations
UPDATE learning_paths
SET 
    title_ar = 'أساسيات أوراكل السحابية التقنية',
    description_ar = 'ابنِ أساسك التقني في أوراكل السحابية. تعلم الهندسة المعمارية، ونموذج الأمان، وأدوات التقارير، وأساسيات التكامل. مثالي لمحترفي تكنولوجيا المعلومات أو المطورين الراغبين في التخصص في أوراكل السحابية.'
WHERE slug = 'oracle-cloud-technical-foundations'
   OR title ILIKE '%Technical Foundations%';

-- Update Path 4: Integration & Development
UPDATE learning_paths
SET 
    title_ar = 'أخصائي تكامل وتطوير أوراكل',
    description_ar = 'أتقن تكاملات أوراكل السحابية والتطوير التقني. تعمق في OIC وواجهات REST وFBDI وتقارير BIP والإضافات المخصصة. للمحترفين التقنيين الذين يريدون أن يصبحوا خبراء تكامل أوراكل السحابية.'
WHERE slug = 'oracle-integration-development'
   OR title ILIKE '%Integration%Development%';

-- Update any Oracle Financials paths from the old schema
UPDATE learning_paths
SET 
    title_ar = 'أساسيات أوراكل المالية للمبتدئين',
    description_ar = 'مسار شامل للمبتدئين لفهم أساسيات أوراكل المالية السحابية والاستعداد لوظائف المستوى المبتدئ.'
WHERE slug = 'oracle-financials-foundation'
   OR title = 'Oracle Financials Foundation for Beginners';

UPDATE learning_paths
SET 
    title_ar = 'مسار استشاري أوراكل المالية',
    description_ar = 'مسار متقدم للمحترفين الطامحين لأن يصبحوا استشاريين في أوراكل المالية.'
WHERE slug = 'oracle-financials-consultant'
   OR title = 'Oracle Financials Consultant Track';

-- Verify the updates
SELECT 
    id,
    title,
    title_ar,
    LEFT(description, 50) as description_preview,
    LEFT(description_ar, 50) as description_ar_preview,
    is_published
FROM learning_paths
ORDER BY created_at DESC;

