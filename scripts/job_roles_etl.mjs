import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

/** Load `.env.local` then `.env` so `npm run etl:job-roles` works without exporting vars manually. */
function loadEnvFiles() {
  const root = process.cwd();
  for (const file of [".env.local", ".env"]) {
    const filepath = resolve(root, file);
    if (!existsSync(filepath)) continue;
    const content = readFileSync(filepath, "utf8");
    for (const rawLine of content.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

loadEnvFiles();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REMOTIVE_API = "https://remotive.com/api/remote-jobs?search=erp";
const PIPELINE_NAME = "job_roles_market_etl";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ROLE_RULES = [
  {
    slug: "erp-functional-consultant",
    name_en: "ERP Functional Consultant",
    vendor: "General",
    role_category: "functional",
    keywords: ["functional", "consultant", "business analyst"],
    description_en:
      "An ERP Functional Consultant is the bridge between how the business really works and what the ERP can do out of the box. They work with finance, supply chain, HR, or operations to run discovery workshops, map current and target processes, and turn policies into system setup: org structures, ledgers, workflows, approvals, tax and pricing rules, and clean master data. They align business rules with standard ERP capabilities, document gaps, and work with technical specialists when you need interfaces, custom fields, or deeper changes. Through the project they own test plans, support user acceptance testing, track defects, build training and job aids, and stay close to go-live and hypercare so people actually use the system and management can trust the numbers.",
    description_ar:
      "مستشار وظيفي في الـ ERP هو حلقة الوصل بين «كيف تدير شركتك أعمالك فعلياً» وبين «ماذا يستطيع النظام تقديمه بشكل قياسي». يعمل مع المالية أو المشتريات أو المخزون أو الموارد البشرية لعقد ورش اكتشاف، ورسم العمليات الحالية والمستهدفة، وترجمة السياسات إلى إعداد داخل النظام: الهياكل التنظيمية، الدفاتر، سير العمل، الموافقات، الضرائب والتسعير، والبيانات الأساسية بشكل منضبط. يوائم قواعد العمل مع قدرات النظام القياسية، ويوثق الفجوات، وينسق مع الفريق التقني عند الحاجة للواجهات أو التوسعات. طوال المشروع يضع خطط اختبار، ويدعم اختبار القبول (UAT)، ويتابع الأعطال، ويعد التدريب ودليل المستخدم، ويظل قريباً من الإقلاع وما بعده لضمان تبنٍ حقيقي للنظام وثقة في التقارير.",
    daily_en: [
      "Run workshops and interviews with process owners; document as-is / to-be and sign off scope",
      "Configure modules, org data, workflows, approvals, and master data to match agreed design",
      "Build test cases, support UAT, log and retest defects with technical and business teams",
      "Prepare user training, SOPs, and handover; support go-live and first weeks of production",
    ],
    daily_ar: [
      "عقد ورش ومقابلات مع أصحاب العمليات؛ توثيق الحالة الحالية/المستهدفة واعتماد النطاق",
      "إعداد الوحدات والهياكل وسير العمل والموافقات والبيانات الأساسية وفق التصميم",
      "بناء سيناريوهات الاختبار ودعم UAT وتسجيل وإعادة اختبار الأعطال",
      "إعداد التدريب وإجراءات التشغيل والتسليم؛ دعم الإقلاع وأسابيع التشغيل الأولى",
    ],
  },
  {
    slug: "erp-technical-consultant",
    name_en: "ERP Technical Consultant",
    vendor: "General",
    role_category: "technical",
    keywords: ["technical", "developer", "integration", "api"],
    description_en:
      "An ERP Technical Consultant builds and maintains the technical layer around the ERP: integrations with banks, e-commerce, CRM, HR, or legacy systems; scheduled jobs and automation; extensions or light customizations where the product allows; reports and performance tuning; and safe promotion of changes across dev / test / production. They translate functional requirements into technical designs, estimate effort and risk, implement APIs or file-based feeds, debug batch failures, and keep environments healthy (releases, backups, monitoring). They partner with functional consultants on feasibility and with infrastructure or security on identity, secrets, and compliance so the platform stays reliable under real load.",
    description_ar:
      "المستشار التقني في الـ ERP يبني ويصون الطبقة التقنية حول النظام: التكامل مع البنوك أو المتاجر أو CRM أو الأنظمة القديمة؛ المهام المجدولة والأتمتة؛ التوسعات أو التخصيصات الخفيفة حسب ما يسمح به المنتج؛ التقارير وتحسين الأداء؛ ونقل التغييرات بأمان بين بيئات التطوير والاختبار والإنتاج. يترجم المتطلبات الوظيفية إلى تصاميم تقنية، ويقدّر الجهد والمخاطر، وينفّذ واجهات برمجية أو تبادل ملفات، ويعالج فشل الدُفعات، ويحافظ على صحة البيئات (إصدارات، نسخ احتياطي، مراقبة). يتعاون مع الوظيفيين حول الجدوى ومع البنية التحتية أو الأمن حول الهويات والأسرار والامتثال ليبقى النظام موثوقاً تحت الحمل الفعلي.",
    daily_en: [
      "Design and implement integrations (REST/SOAP, iPaaS, SFTP, message queues) with logging and retries",
      "Troubleshoot jobs, workflows, custom code, and environment-specific errors",
      "Support deployments, data fixes (when controlled), and performance analysis",
      "Review security (roles, keys, PII) with functional and infra peers before production",
    ],
    daily_ar: [
      "تصميم وتنفيذ التكاملات (واجهات، منصات تكامل، ملفات) مع تسجيل وإعادة محاولة",
      "معالجة أعطال المهام والأتمتة والكود والبيئات",
      "دعم النشر والإصلاحات المضبوطة وتحليل الأداء",
      "مراجعة الصلاحيات والمفاتيح والبيانات الحساسة قبل الإنتاج",
    ],
  },
  {
    slug: "sap-fico-consultant",
    name_en: "SAP FICO Consultant",
    vendor: "SAP",
    role_category: "functional",
    keywords: ["sap", "fico"],
    description_en:
      "A SAP FICO Consultant focuses on SAP Finance (FI) and Controlling (CO): chart of accounts and company codes, general ledger and sub-ledgers, accounts payable/receivable, asset accounting, tax, bank, and integration points to logistics. On the controlling side they configure cost centers, internal orders, product costing, profitability analysis (e.g. CO-PA), and management reporting that matches how leadership reads the P&L. They align SAP with local accounting standards and audit expectations, support month-end and year-end close, fix reconciliation breaks, and train finance users on transactions, authorizations, and controls so statutory and management reporting stay consistent.",
    description_ar:
      "مستشار SAP FICO يركز على المالية (FI) والمحاسبة الإدارية (CO): دليل الحسابات والشركات، الأستاذ العام والحسابات المساعدة، المدينون والدائنون، أصول ثابتة، ضرائب، بنوك، ونقاط التكامل مع اللوجستيات. في CO يضبط مراكز التكلفة والأوامر الداخلية وتكلفة المنتج وتحليل الربحية حسب ما يقرأه الإدارة في قائمة الدخل. يوائم SAP مع المعايير المحلية وتوقعات المراجعة، ويدعم الإقفال الشهري والسنوي، ويعالج انكسارات التسوية، ويدرب مستخدمي المالية على العمليات والصلاحيات والضوابط لتبقى التقارير النظامية والإدارية متسقة.",
    daily_en: [
      "Configure FI/CO structures, posting rules, integrations to MM/SD/PS, and reporting variants",
      "Support period-end close: reconciliations, GR/IR, asset runs, CO allocations, and audit queries",
      "Tune profitability and costing (e.g. COPA, product costing) for accurate margins",
      "Coach accountants on transactions, workflows, and segregation of duties",
    ],
    daily_ar: [
      "إعداد هياكل FI/CO وقواعد القيد والتكامل مع المشتريات/المبيعات/المشاريع",
      "دعم الإقفال: تسويات، GR/IR، أصول، توزيعات CO، استعلامات المراجعة",
      "ضبط الربحية والتكلفة بدقة هوامش",
      "تدريب المحاسبين على العمليات وسير العمل وفصل المهام",
    ],
  },
  {
    slug: "oracle-erp-consultant",
    name_en: "Oracle ERP Consultant",
    vendor: "Oracle",
    role_category: "functional",
    keywords: ["oracle", "ebs", "fusion"],
    description_en:
      "An Oracle ERP Consultant implements Oracle’s finance and operations footprint—whether E-Business Suite (EBS) or Oracle Fusion Cloud—in areas like GL, AP/AR, procurement, inventory, manufacturing, or projects. They lead or contribute to blueprinting: mapping business processes to Oracle modules, deciding setup versus customization, and planning integrations and extensions. They configure the application, coordinate technical teams for interfaces and reports, drive testing from unit to UAT, manage cutover plans, and support stabilization after go-live. They often specialize in one pillar (e.g. Financials or SCM) but understand cross-module impacts so orders, inventory, and costing stay aligned.",
    description_ar:
      "مستشار Oracle ERP ينفّذ حزمة المالية والعمليات من Oracle—سواء E-Business Suite أو Oracle Fusion Cloud—في مجالات مثل الأستاذ العام، المدينون/الدائنون، المشتريات، المخزون، التصنيع، أو المشاريع. يشارك في التخطيط الزراعي: ربط العمليات بوحدات Oracle، واختيار الإعداد مقابل التخصيص، وتخطيط التكامل والتوسعات. يضبط التطبيق، وينسق الفريق التقني للواجهات والتقارير، ويقود الاختبار حتى قبول المستخدم، ويدير خطط الإقلاع، ويدعم الاستقرار بعد الإطلاق. غالباً يتخصص في محور (مالية أو سلسلة توريد) مع فهم التأثيرات بين الوحدات لتبقى الطلبات والمخزون والتكلفة متوافقة.",
    daily_en: [
      "Blueprint and configure Oracle modules; document setups and integration contracts",
      "Plan and execute testing cycles; prioritize defects with technical owners",
      "Prepare migration/cutover steps and support hypercare after go-live",
      "Work with SMEs on adoption, reporting, and period-close routines",
    ],
    daily_ar: [
      "التخطيط وإعداد وحدات Oracle وتوثيق الإعدادات وعقود التكامل",
      "تنفيذ دورات الاختبار وترتيب الأولويات مع التقنيين",
      "إعداد خطوات الترحيل/الإقلاع والدعم المكثف بعد الإطلاق",
      "التعاون مع الخبراء للتبني والتقارير والإقفال",
    ],
  },
  {
    slug: "microsoft-dynamics-consultant",
    name_en: "Microsoft Dynamics Consultant",
    vendor: "Dynamics",
    role_category: "consulting",
    keywords: ["dynamics", "d365", "ax"],
    description_en:
      "A Microsoft Dynamics Consultant delivers Dynamics 365 solutions—often Finance & Operations (F&O) for ERP or Customer Engagement for CRM—covering discovery, fit-gap workshops, solution architecture, configuration of entities, workflows, dimensions, and security roles, data migration and validation, and rollout from pilot to multi-country deployments. They balance standard Dynamics patterns with necessary extensions (via approved channels), integrate with Microsoft 365, Power Platform, and third-party apps, and stay through go-live and optimization: fixing process friction, tuning batch jobs, and refining reports so leadership gets operational truth from one stack.",
    description_ar:
      "مستشار Microsoft Dynamics ينفّذ حلول Dynamics 365—غالباً Finance & Operations للـ ERP أو Customer Engagement للـ CRM—يشمل الاكتشاف، ورش الفجوات، وهندسة الحل، وإعداد الكيانات وسير العمل والأبعاد وأدوار الأمان، وترحيل البيانات والتحقق منها، والإطلاق من تجريبي إلى نشر متعدد الدول. يوازن بين أنماط Dynamics القياسية والتوسعات المسموحة، ويتكامل مع Microsoft 365 وPower Platform وتطبيقات خارجية، ويظل بعد الإقلاع للتحسين: تخفيف احتكاك العمليات، وضبط المهام الدفعية، وتنقيح التقارير حتى تحصل الإدارة على صورة تشغيلية موحدة.",
    daily_en: [
      "Lead fit/gap and design workshops; produce backlog and configuration specs",
      "Configure D365 modules, workflows, number sequences, dimensions, and security",
      "Own data migration templates, reconciliation, and integration/UAT sign-off",
      "Hypercare: incident triage, minor tuning, and training reinforcement",
    ],
    daily_ar: [
      "قيادة ورش الفجوات والتصميم وإخراج قائمة الأعمال والمواصفات",
      "إعداد الوحدات وسير العمل والتسلسلات والأبعاد والصلاحيات",
      "امتلاك قوالب الترحيل والتسوية وتوقيع التكامل/UAT",
      "الدعم المكثف: تصنيف الحوادث والضبط الخفيف وتعزيز التدريب",
    ],
  },
  {
    slug: "odoo-consultant",
    name_en: "Odoo Consultant",
    vendor: "Odoo",
    role_category: "functional",
    keywords: ["odoo"],
    description_en:
      "An Odoo Consultant designs end-to-end Odoo rollouts for SMBs and mid-market teams: choosing apps (Accounting, Inventory, Manufacturing, CRM, HR, Helpdesk), modeling workflows with minimal custom code, importing opening balances and masters, and wiring automations (scheduled actions, email templates, alerts). They translate operational reality—multi-step approvals, landed costs, reorder rules—into Odoo configuration and light Studio or module tweaks when needed. They train internal champions, build dashboards for owners, and iterate after go-live so adoption grows without breaking simplicity Odoo is known for.",
    description_ar:
      "مستشار Odoo يصمم إطلاقات متكاملة للشركات الصغيرة والمتوسطة: اختيار التطبيقات (محاسبة، مخزون، تصنيع، علاقات عملاء، موارد بشرية، دعم)، ونمذجة سير العمل بأقل كود ممكن، واستيراد الأرصدة الافتاضية والبيانات الأساسية، وربط الأتمتة (مهام مجدولة، قوالب بريد، تنبيهات). يترجم واقع التشغيل—موافقات متعددة، تكاليف لاندد، قواعد إعادة طلب—إلى إعداد Odoo وتعديلات Studio أو الوحدات عند الحاجة. يدرّب الأبطال الداخليين، يبني لوحات للإدارة، ويتكرر بعد الإقلاع ليبقى التبني قوياً دون تعقيد يضيع بساطة Odoo.",
    daily_en: [
      "Scope apps and flows; configure accounting, stock rules, CRM pipelines, and approvals",
      "Import or clean masters and validate trial balances / stock valuations",
      "Automate recurring tasks and reporting; optional light customization via Studio",
      "Train users and iterate on feedback during rollout and after go-live",
    ],
    daily_ar: [
      "تحديد النطاق والتطبيقات؛ إعداد المحاسبة والمخزون ومسارات CRM والموافقات",
      "استيراد أو تنظيف البيانات الأساسية والتحقق من الأرصدة والتقييمات",
      "أتمتة المهام والتقارير؛ تخصيص خفيف عبر Studio عند الحاجة",
      "تدريب المستخدمين وتكرار التحسين بعد الإقلاع",
    ],
  },
];

function normalizeText(value) {
  return (value || "").toLowerCase().trim();
}

function inferRole(rawJob) {
  const blob = normalizeText(`${rawJob.title ?? ""} ${rawJob.description ?? ""}`);
  for (const role of ROLE_RULES) {
    if (role.keywords.some((k) => blob.includes(k))) return role;
  }
  return ROLE_RULES[0];
}

function monthStartIso(dateValue) {
  const d = new Date(dateValue);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function prevMonthStart(metricMonth) {
  const d = new Date(`${metricMonth}T12:00:00.000Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  d.setUTCDate(1);
  return d.toISOString().slice(0, 10);
}

function monthBoundsUtc(metricMonth) {
  const [y, mo] = metricMonth.split("-").map(Number);
  const startMs = Date.UTC(y, mo - 1, 1, 0, 0, 0, 0);
  const endMs = Date.UTC(y, mo, 1, 0, 0, 0, 0);
  return {
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
  };
}

function pseudoSalaryUsdFromTitle(title) {
  const text = normalizeText(title);
  if (text.includes("senior") || text.includes("lead")) return [3000, 5000];
  if (text.includes("junior") || text.includes("intern")) return [900, 1800];
  return [1500, 3000];
}

async function createEtlRun() {
  const { data, error } = await supabase
    .from("etl_runs")
    .insert({ pipeline_name: PIPELINE_NAME, status: "running" })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

async function finishEtlRun(runId, status, stats = {}, errorMessage = null) {
  const payload = {
    status,
    ended_at: new Date().toISOString(),
    stats_json: stats,
    error_message: errorMessage,
  };
  await supabase.from("etl_runs").update(payload).eq("id", runId);
}

async function ensureSeedData() {
  const { error: locError } = await supabase.from("job_locations").upsert(
    [
      { country_code: "global", city: "Remote", currency: "USD" },
      { country_code: "eg", city: "Egypt", currency: "EGP" },
    ],
    { onConflict: "country_code,city" }
  );
  if (locError) throw locError;

  // Explicit insert/update — reliable vs bulk upsert on `slug`.
  for (const r of ROLE_RULES) {
    const { data: existing, error: findError } = await supabase
      .from("job_roles")
      .select("id")
      .eq("slug", r.slug)
      .maybeSingle();
    if (findError) throw findError;

    if (existing?.id) {
      const patch = {
        title: r.name_en,
        pipeline_erp_vendor: r.vendor,
        role_category: r.role_category,
        description: r.description_en,
        description_ar: r.description_ar,
        daily_activities: r.daily_en,
        daily_activities_ar: r.daily_ar,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      const { error: updError } = await supabase.from("job_roles").update(patch).eq("id", existing.id);
      if (updError) throw updError;
    } else {
      const { error: insError } = await supabase.from("job_roles").insert({
        slug: r.slug,
        title: r.name_en,
        pipeline_erp_vendor: r.vendor,
        role_category: r.role_category,
        description: r.description_en,
        description_ar: r.description_ar,
        daily_activities: r.daily_en,
        daily_activities_ar: r.daily_ar,
        is_active: true,
      });
      if (insError) throw insError;
    }
  }

  const { data: slugRows, error: slugErr } = await supabase
    .from("job_roles")
    .select("slug")
    .not("slug", "is", null);
  if (slugErr) throw slugErr;
  const withSlug = (slugRows ?? []).filter((row) => row.slug && String(row.slug).trim() !== "");
  if (withSlug.length < ROLE_RULES.length) {
    throw new Error(
      `job_roles seed incomplete: need ${ROLE_RULES.length} rows with slug, found ${withSlug.length}. Check unique index on job_roles.slug and DB errors.`
    );
  }

  const LEGACY_DAILY_PATCHES = [
    {
      title_en: "Junior Financial Analyst (Oracle)",
      daily_en: [
        "Process journal entries",
        "Run standard reports",
        "Assist with month-end close",
        "Reconcile accounts",
        "Support senior analysts",
        "Document processes",
      ],
      daily_ar: [
        "معالجة القيود اليومية",
        "تشغيل التقارير القياسية",
        "المساعدة في إقفال نهاية الشهر",
        "تسوية الحسابات",
        "دعم المحللين الأقدم",
        "توثيق العمليات",
      ],
    },
  ];
  for (const p of LEGACY_DAILY_PATCHES) {
    const { data: legacyRow, error: legErr } = await supabase
      .from("job_roles")
      .select("id, daily_activities")
      .eq("title", p.title_en)
      .maybeSingle();
    if (legErr) throw legErr;
    if (!legacyRow?.id) continue;
    const raw = legacyRow.daily_activities;
    let parsedLen = 0;
    if (Array.isArray(raw)) parsedLen = raw.length;
    else if (typeof raw === "string" && raw.trim()) {
      try {
        const j = JSON.parse(raw);
        if (Array.isArray(j)) parsedLen = j.length;
      } catch {
        parsedLen = 0;
      }
    }
    if (parsedLen > 0) continue;
    const { error: patchErr } = await supabase
      .from("job_roles")
      .update({
        daily_activities: p.daily_en,
        daily_activities_ar: p.daily_ar,
        updated_at: new Date().toISOString(),
      })
      .eq("id", legacyRow.id);
    if (patchErr) throw patchErr;
  }
}

async function fetchRawJobs() {
  const response = await fetch(REMOTIVE_API);
  if (!response.ok) throw new Error(`Failed to fetch source jobs: ${response.status}`);
  const body = await response.json();
  return Array.isArray(body.jobs) ? body.jobs : [];
}

async function loadLookupMaps() {
  const { data: roles, error: roleError } = await supabase.from("job_roles").select("id,slug");
  if (roleError) throw roleError;

  const { data: globalLoc, error: globalErr } = await supabase
    .from("job_locations")
    .select("id,country_code,city")
    .eq("country_code", "global")
    .eq("city", "Remote")
    .limit(1)
    .single();
  if (globalErr) throw globalErr;

  const roleBySlug = new Map(
    roles.filter((row) => row.slug).map((row) => [row.slug, row.id])
  );
  return {
    roleBySlug,
    defaultLocationId: globalLoc.id,
  };
}

function toRawRow(job) {
  return {
    source: "remotive",
    external_id: String(job.id),
    payload_json: job,
    fetched_at: new Date().toISOString(),
  };
}

function toNormalizedRow(job, rawId, roleId, locationId) {
  const [salaryMin, salaryMax] = pseudoSalaryUsdFromTitle(job.title || "");
  const postedAt = job.publication_date || new Date().toISOString();
  const dedupeKey = `remotive:${job.id}`;
  return {
    raw_id: rawId,
    role_id: roleId,
    title: job.title || "ERP Role",
    company: job.company_name || null,
    location_id: locationId,
    salary_min: salaryMin,
    salary_max: salaryMax,
    currency: "USD",
    posted_at: postedAt,
    url: job.url || "https://remotive.com/",
    source: "remotive",
    dedupe_key: dedupeKey,
    is_active: true,
  };
}

function salaryStatsFromRows(rows) {
  const salaries = [];
  for (const row of rows) {
    if (Number.isFinite(Number(row.salary_min))) salaries.push(Number(row.salary_min));
    if (Number.isFinite(Number(row.salary_max))) salaries.push(Number(row.salary_max));
  }
  salaries.sort((a, b) => a - b);
  const mid = salaries.length ? salaries[Math.floor(salaries.length / 2)] : null;
  return {
    openings_count: rows.length,
    salary_min: salaries.length ? salaries[0] : null,
    salary_median: mid,
    salary_max: salaries.length ? salaries[salaries.length - 1] : null,
    /** Number of job postings in this bucket (matches “roles in sample”). Not 2× postings. */
    sample_size: rows.length,
  };
}

/**
 * Recompute metrics from ALL normalized postings in each (role, location, month) bucket
 * so reruns stay consistent.
 */
async function recomputeMonthlyMetrics(supabase, tuples) {
  const marketMetrics = [];
  const salaryMetrics = [];
  const now = new Date().toISOString();

  for (const t of tuples) {
    const { start, end } = monthBoundsUtc(t.metric_month);
    const { data: rows, error } = await supabase
      .from("job_postings_normalized")
      .select("salary_min,salary_max,posted_at")
      .eq("role_id", t.role_id)
      .eq("location_id", t.location_id)
      .gte("posted_at", start)
      .lt("posted_at", end)
      .eq("is_active", true);
    if (error) throw error;

    const stats = salaryStatsFromRows(rows ?? []);
    const prevMonth = prevMonthStart(t.metric_month);
    const { data: prevMetric } = await supabase
      .from("role_market_metrics")
      .select("openings_count")
      .eq("role_id", t.role_id)
      .eq("location_id", t.location_id)
      .eq("metric_month", prevMonth)
      .maybeSingle();

    let growth_mom_pct = null;
    if (prevMetric && prevMetric.openings_count > 0) {
      growth_mom_pct =
        ((stats.openings_count - prevMetric.openings_count) / prevMetric.openings_count) * 100;
    }

    marketMetrics.push({
      role_id: t.role_id,
      location_id: t.location_id,
      metric_month: t.metric_month,
      openings_count: stats.openings_count,
      growth_mom_pct,
      remote_ratio: 1,
      updated_at: now,
    });
    salaryMetrics.push({
      role_id: t.role_id,
      location_id: t.location_id,
      metric_month: t.metric_month,
      salary_min: stats.salary_min,
      salary_median: stats.salary_median,
      salary_max: stats.salary_max,
      sample_size: stats.sample_size,
      currency: "USD",
      updated_at: now,
    });
  }

  return { marketMetrics, salaryMetrics };
}

async function run() {
  const runId = await createEtlRun();
  const stats = {
    ingested_raw: 0,
    normalized_rows: 0,
    market_rows: 0,
    salary_rows: 0,
  };

  try {
    await ensureSeedData();
    const jobs = await fetchRawJobs();

    if (!jobs.length) {
      await finishEtlRun(runId, "success", stats);
      console.log("No jobs returned from source.");
      return;
    }

    const rawRows = jobs.map(toRawRow);
    const { data: rawInserted, error: rawError } = await supabase
      .from("job_postings_raw")
      .upsert(rawRows, { onConflict: "source,external_id" })
      .select("id,external_id,payload_json");
    if (rawError) throw rawError;

    let rawList = rawInserted ?? [];
    if (!rawList.length && jobs.length) {
      const externalIds = jobs.map((j) => String(j.id));
      const { data: refetched, error: refetchErr } = await supabase
        .from("job_postings_raw")
        .select("id,external_id")
        .eq("source", "remotive")
        .in("external_id", externalIds);
      if (refetchErr) throw refetchErr;
      rawList = refetched ?? [];
    }

    stats.ingested_raw = jobs.length;

    const rawByExternalId = new Map(rawList.map((r) => [String(r.external_id), r]));
    const { roleBySlug, defaultLocationId } = await loadLookupMaps();
    const normalizedRows = [];

    for (const job of jobs) {
      const mappedRole = inferRole(job);
      const roleId = roleBySlug.get(mappedRole.slug);
      const rawRecord = rawByExternalId.get(String(job.id));
      if (!rawRecord || !roleId) continue;
      normalizedRows.push(toNormalizedRow(job, rawRecord.id, roleId, defaultLocationId));
    }

    if (!normalizedRows.length) {
      console.warn("job_roles ETL: zero normalized rows", {
        jobs: jobs.length,
        rawRowsResolved: rawList.length,
        pipelineSlugsLoaded: roleBySlug.size,
      });
    }

    if (normalizedRows.length) {
      const { error: normalizedError } = await supabase
        .from("job_postings_normalized")
        .upsert(normalizedRows, { onConflict: "dedupe_key" });
      if (normalizedError) throw normalizedError;
      stats.normalized_rows = normalizedRows.length;

      const tupleMap = new Map();
      for (const row of normalizedRows) {
        const metricMonth = monthStartIso(row.posted_at);
        const key = `${row.role_id}|${row.location_id}|${metricMonth}`;
        if (!tupleMap.has(key)) {
          tupleMap.set(key, {
            role_id: row.role_id,
            location_id: row.location_id,
            metric_month: metricMonth,
          });
        }
      }
      const tuples = [...tupleMap.values()];

      const { marketMetrics, salaryMetrics } = await recomputeMonthlyMetrics(supabase, tuples);

      if (marketMetrics.length) {
        const { data: marketRows, error: marketError } = await supabase
          .from("role_market_metrics")
          .upsert(marketMetrics, { onConflict: "role_id,location_id,metric_month" })
          .select("id");
        if (marketError) throw marketError;
        stats.market_rows = marketRows.length;
      }

      if (salaryMetrics.length) {
        const { data: salaryRows, error: salaryError } = await supabase
          .from("role_salary_metrics")
          .upsert(salaryMetrics, { onConflict: "role_id,location_id,metric_month" })
          .select("id");
        if (salaryError) throw salaryError;
        stats.salary_rows = salaryRows.length;
      }
    }

    await finishEtlRun(runId, "success", stats);
    console.log("ETL completed", stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ETL error";
    await finishEtlRun(runId, "failed", stats, message);
    console.error("ETL failed:", message);
    process.exit(1);
  }
}

run();
