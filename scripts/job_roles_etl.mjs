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

/** Used to derive EGP salary bands from USD sample signals (override via JOB_MARKET_USD_TO_EGP). */
const USD_TO_EGP = Number(process.env.JOB_MARKET_USD_TO_EGP || "50") || 50;

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
      "Bridges business needs and ERP software: requirements, configuration, testing, cutover, and user adoption so finance/operations can run end-to-end processes.",
    description_ar:
      "يربط احتياجات الأعمال بنظام الـ ERP: الجمع والتحليل، الإعداد، الاختبار، الإقلاع، وتبني المستخدمين حتى تعمل المالية والعمليات بسلاسة.",
    daily_en: [
      "Workshops & interviews to capture requirements and gaps",
      "Configure modules, workflows, approvals, and master data",
      "Write test scripts, support UAT, and fix defects with IT",
      "Prepare training, job aids, and handover for go-live",
    ],
    daily_ar: [
      "جلسات عمل ومقابلات لاستخراج المتطلبات والفجوات",
      "إعداد الوحدات وسير العمل والموافقات والبيانات الأساسية",
      "كتابة سيناريوهات الاختبار ودعم UAT مع تقنية المعلومات",
      "إعداد التدريب وأدلة العمل وتسليم ما بعد الإطلاق",
    ],
  },
  {
    slug: "erp-technical-consultant",
    name_en: "ERP Technical Consultant",
    vendor: "General",
    role_category: "technical",
    keywords: ["technical", "developer", "integration", "api"],
    description_en:
      "Implements integrations, extensions, reports, and performance fixes so the ERP stays reliable, secure, and connected to other systems.",
    description_ar:
      "ينفذ التكاملات والتوسعات والتقارير وتحسينات الأداء ليبقى النظام موثوقاً وآمناً ومتصلاً بالأنظمة الأخرى.",
    daily_en: [
      "Design and build integrations (APIs, iPaaS, file feeds)",
      "Debug workflows, jobs, and customizations",
      "Support releases, migrations, and environment hygiene",
      "Collaborate with functional peers on technical feasibility",
    ],
    daily_ar: [
      "تصميم وبناء التكاملات (واجهات، ملفات، منصات تكامل)",
      "تتبع الأخطاء في الأتمتة والمهام والتخصيصات",
      "دعم الإصدارات والترحيل والبيئات",
      "التنسيق مع الوظيفيين حول الجدوى التقنية",
    ],
  },
  {
    slug: "sap-fico-consultant",
    name_en: "SAP FICO Consultant",
    vendor: "SAP",
    role_category: "functional",
    keywords: ["sap", "fico"],
    description_en:
      "Specializes in SAP Finance & Controlling: chart of accounts, asset accounting, costing, period close, and statutory reporting alignment.",
    description_ar:
      "متخصص في SAP للمالية والمحاسبة الإدارية: دليل الحسابات، الأصول، التكلفة، الإقفال، والتقارير التنظيمية.",
    daily_en: [
      "Translate finance policies into SAP FICO setup",
      "Support month-end close, reconciliations, and audits",
      "Tune CO-PA, costing sheets, and profitability reporting",
      "Train finance users on transactions and controls",
    ],
    daily_ar: [
      "ترجمة سياسات المالية إلى إعدادات FICO",
      "دعم الإقفال الشهري والتسويات والمراجعات",
      "ضبط CO-PA وأوراق التكلفة وتقارير الربحية",
      "تدريب مستخدمي المالية على العمليات والضوابط",
    ],
  },
  {
    slug: "oracle-erp-consultant",
    name_en: "Oracle ERP Consultant",
    vendor: "Oracle",
    role_category: "functional",
    keywords: ["oracle", "ebs", "fusion"],
    description_en:
      "Delivers Oracle ERP (EBS / Fusion Cloud) solutions across finance, SCM, or projects—configuration through go-live and steady-state support.",
    description_ar:
      "يقدم حلول Oracle ERP (EBS أو Fusion) في المالية أو سلسلة التوريد أو المشاريع من الإعداد حتى الإطلاق والدعم.",
    daily_en: [
      "Blueprint processes and map them to Oracle modules",
      "Configure setups, integrations, and extensions",
      "Lead testing cycles and defect triage",
      "Drive adoption with SMEs and change activities",
    ],
    daily_ar: [
      "رسم العمليات وربطها بوحدات Oracle",
      "إعداد النظام والتكاملات والتوسعات",
      "قيادة الاختبار ومتابعة العيوب",
      "دعم التبني مع أصحاب المصلحة والتغيير",
    ],
  },
  {
    slug: "microsoft-dynamics-consultant",
    name_en: "Microsoft Dynamics Consultant",
    vendor: "Dynamics",
    role_category: "consulting",
    keywords: ["dynamics", "d365", "ax"],
    description_en:
      "Implements Microsoft Dynamics 365 (Finance & Operations / CE): discovery, configuration, data migration, and rollout for SMB to enterprise.",
    description_ar:
      "ينفذ Microsoft Dynamics 365 للمالية أو العمليات أو العملاء: الاكتشاف، الإعداد، ترحيل البيانات، والإطلاق.",
    daily_en: [
      "Workshops for fit/gap and solution design",
      "Configure D365 entities, workflows, and security",
      "Coordinate data migration and integration tests",
      "Hypercare and optimization after go-live",
    ],
    daily_ar: [
      "ورش الفجوات والتصميم",
      "إعداد الكيانات وسير العمل والصلاحيات",
      "تنسيق ترحيل البيانات واختبارات التكامل",
      "الدعم المكثف والتحسين بعد الإطلاق",
    ],
  },
  {
    slug: "odoo-consultant",
    name_en: "Odoo Consultant",
    vendor: "Odoo",
    role_category: "functional",
    keywords: ["odoo"],
    description_en:
      "Designs and deploys Odoo apps (accounting, inventory, CRM, HR) with automation and reporting tailored to growing businesses.",
    description_ar:
      "يصمم ويطبّق تطبيقات Odoo (محاسبة، مخزون، علاقات عملاء، موارد بشرية) مع الأتمتة والتقارير للشركات النامية.",
    daily_en: [
      "Scope modules and customize Odoo workflows",
      "Import master data and validate balances",
      "Build dashboards and scheduled reports",
      "Coach teams on daily operations in Odoo",
    ],
    daily_ar: [
      "تحديد النطاق وتخصيص سير العمل",
      "استيراد البيانات الأساسية والتحقق من الأرصدة",
      "بناء لوحات التحكم والتقارير الدورية",
      "تدريب الفرق على العمليات اليومية",
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
      const { data: cur, error: curErr } = await supabase
        .from("job_roles")
        .select("description, description_ar, daily_activities, daily_activities_ar, role_category")
        .eq("id", existing.id)
        .maybeSingle();
      if (curErr) throw curErr;

      const patch = {
        title: r.name_en,
        pipeline_erp_vendor: r.vendor,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      if (!cur?.description?.trim()) patch.description = r.description_en;
      if (!cur?.description_ar?.trim()) patch.description_ar = r.description_ar;
      const da = cur?.daily_activities;
      const hasDaily =
        Array.isArray(da) && da.length > 0
          ? true
          : Boolean(da && typeof da === "object" && !Array.isArray(da)
              ? Object.keys(da).length > 0
              : false);
      if (!hasDaily) {
        patch.daily_activities = r.daily_en;
        patch.daily_activities_ar = r.daily_ar;
      }
      if (!cur?.role_category?.trim()) patch.role_category = r.role_category;

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

  const { data: egLoc, error: egErr } = await supabase
    .from("job_locations")
    .select("id,country_code,city")
    .eq("country_code", "eg")
    .eq("city", "Egypt")
    .limit(1)
    .single();
  if (egErr) throw egErr;

  const roleBySlug = new Map(
    roles.filter((row) => row.slug).map((row) => [row.slug, row.id])
  );
  return {
    roleBySlug,
    defaultLocationId: globalLoc.id,
    egyptLocationId: egLoc.id,
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

function buildEgyptDerivedMetrics(marketMetrics, salaryMetrics, egyptLocationId, rate) {
  const egMarket = marketMetrics.map((m) => ({
    ...m,
    location_id: egyptLocationId,
  }));
  const egSalary = salaryMetrics.map((s) => ({
    ...s,
    location_id: egyptLocationId,
    salary_min: s.salary_min != null ? Math.round(Number(s.salary_min) * rate) : null,
    salary_median: s.salary_median != null ? Math.round(Number(s.salary_median) * rate) : null,
    salary_max: s.salary_max != null ? Math.round(Number(s.salary_max) * rate) : null,
    currency: "EGP",
  }));
  return { egMarket, egSalary };
}

async function run() {
  const runId = await createEtlRun();
  const stats = {
    ingested_raw: 0,
    normalized_rows: 0,
    market_rows: 0,
    salary_rows: 0,
    egypt_market_rows: 0,
    egypt_salary_rows: 0,
    usd_to_egp_rate: USD_TO_EGP,
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
    const { roleBySlug, defaultLocationId, egyptLocationId } = await loadLookupMaps();
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

      const { egMarket, egSalary } = buildEgyptDerivedMetrics(
        marketMetrics,
        salaryMetrics,
        egyptLocationId,
        USD_TO_EGP
      );
      if (egMarket.length) {
        const { data: egM, error: egMErr } = await supabase
          .from("role_market_metrics")
          .upsert(egMarket, { onConflict: "role_id,location_id,metric_month" })
          .select("id");
        if (egMErr) throw egMErr;
        stats.egypt_market_rows = egM?.length ?? 0;
      }
      if (egSalary.length) {
        const { data: egS, error: egSErr } = await supabase
          .from("role_salary_metrics")
          .upsert(egSalary, { onConflict: "role_id,location_id,metric_month" })
          .select("id");
        if (egSErr) throw egSErr;
        stats.egypt_salary_rows = egS?.length ?? 0;
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
