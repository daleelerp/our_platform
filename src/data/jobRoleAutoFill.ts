/**
 * Auto-fill job role form fields from ERP + role type + module (no DB templates required).
 */

export type RoleCat = "technical" | "functional";

export type JobRoleAutoFillInput = {
  erpLabel: string;
  roleCategory: RoleCat;
  moduleCode: string;
  moduleName: string;
};

function lines(...items: string[]) {
  return items.join("\n");
}

function isSapErp(erpLabel: string): boolean {
  const u = erpLabel.toLowerCase();
  return u.includes("sap") || u.includes("s/4") || u.includes("s4hana");
}

/** Generic preset when ERP is not SAP or module is unknown */
function buildGenericPreset(input: JobRoleAutoFillInput): Record<string, unknown> {
  const { roleCategory, moduleName } = input;
  const roleWord =
    roleCategory === "technical" ? "Technical Consultant" : "Functional Consultant";
  const roleWordAr =
    roleCategory === "technical" ? "مستشار تقني" : "مستشار وظيفي";
  const title = `${moduleName} ${roleWord}`;
  const title_ar = `${roleWordAr} — ${moduleName}`;
  const descEn = `This role focuses on ${moduleName} within ERP implementations. Responsibilities include analysis, configuration, testing, and ongoing support aligned with business requirements.`;
  const descAr = `يركز هذا الدور على ${moduleName} ضمن مشروعات تخطيط موارد المؤسسات، ويشمل التحليل والإعداد والاختبار والدعم المستمر وفق متطلبات العمل.`;
  const actEn = lines(
    `Analyze requirements for ${moduleName} processes`,
    "Configure and validate system settings",
    "Collaborate with business stakeholders and testers",
    "Support incidents, defects, and enhancements",
    "Document solutions and handover materials"
  );
  const actAr = lines(
    `تحليل متطلبات عمليات ${moduleName}`,
    "إعداد النظام والتحقق من الإعدادات",
    "التنسيق مع أصحاب المصلحة والاختبار",
    "معالجة الحوادث والأخطاء والتحسينات",
    "توثيق الحلول وتسليم المعرفة"
  );
  return {
    title,
    title_ar: title_ar,
    description: descEn,
    description_ar: descAr,
    daily_activities: actEn,
    daily_activities_ar: actAr,
    min_years_experience: 0,
    typical_years_to_role: roleCategory === "technical" ? 3 : 2,
  };
}

function sapFunctionalConsultant(moduleName: string, moduleNameAr: string) {
  return {
    description: `SAP functional consultant specializing in ${moduleName}. Leads workshops, maps business processes to SAP standard, prepares configuration and test scripts, and supports cutover and hypercare.`,
    description_ar: `مستشار وظيفي في SAP متخصص في ${moduleNameAr}. يقود ورش العمل، ويربط العمليات بالمعيار في SAP، ويعد الإعدادات وسيناريوهات الاختبار، ويدعم الإقلاع والفترة الفورية بعد الإطلاق.`,
    daily_activities: lines(
      "Gather and document business requirements",
      "Perform fit-gap analysis and propose solutions",
      "Configure SAP based on signed-off designs",
      "Coordinate integration with other modules",
      "Support UAT, training, and post-go-live issues"
    ),
    daily_activities_ar: lines(
      "جمع وتوثيق متطلبات العمل",
      "تحليل الفجوات واقتراح الحلول",
      "إعداد النظام وفق التصاميم المعتمدة",
      "التنسيق مع الوحدات الأخرى والتكامل",
      "دعم اختبار القبول والتدريب ومشاكل ما بعد الإطلاق"
    ),
    min_years_experience: 0,
    typical_years_to_role: 2,
  };
}

function sapTechnicalConsultant(moduleName: string, moduleNameAr: string) {
  return {
    description: `SAP technical consultant for ${moduleName}. Implements enhancements, interfaces, workflows, and troubleshooting across development and configuration boundaries; works closely with functional teams and basis/integration.`,
    description_ar: `مستشار تقني في SAP لمجال ${moduleNameAr}. ينفذ التطويرات والتكامل وسير العمل ومعالجة العيوب بين الجوانب التقنية والإعداد؛ بالتنسيق مع الفريق الوظيفي والأساس والتكامل.`,
    daily_activities: lines(
      "Debug and resolve technical defects in the module area",
      "Implement enhancements, user exits, and integrations",
      "Review transports, performance, and authorization impacts",
      "Support technical design for interfaces and conversions",
      "Coordinate with Basis, security, and functional consultants"
    ),
    daily_activities_ar: lines(
      "تشخيص وحل العيوب التقنية في نطاق الوحدة",
      "تنفيذ التحسينات والمخارج والتكامل",
      "مراجعة النقل والأداء وتأثير الصلاحيات",
      "دعم التصميم التقني للواجهات والتحويلات",
      "التنسيق مع الأساس والأمن والمستشارين الوظيفيين"
    ),
    min_years_experience: 0,
    typical_years_to_role: 3,
  };
}

const MODULE_AR: Record<string, string> = {
  FI: "المالية FI",
  CO: "الإدارة المالية CO",
  MM: "إدارة المواد MM",
  SD: "المبيعات والتوزيع SD",
  PP: "تخطيط الإنتاج PP",
  QM: "إدارة الجودة QM",
  WM: "إدارة المستودعات WM",
  PM: "صيانة المصنع PM",
  PS: "نظام المشاريع PS",
  HCM: "الموارد البشرية HCM",
  ABAP: "تطوير ABAP",
  BASIS: "الأساس Basis",
  BTP: "منصة SAP BTP",
};

function buildSapPreset(input: JobRoleAutoFillInput): Record<string, unknown> {
  const code = input.moduleCode.toUpperCase().trim();
  const modAr = MODULE_AR[code] || input.moduleName;
  const { roleCategory, moduleName } = input;

  // Pure technical stacks
  if (code === "ABAP") {
    const base =
      roleCategory === "technical"
        ? {
            title: "SAP ABAP Developer",
            title_ar: "مطور ABAP في SAP",
            description:
              "Develops and maintains ABAP objects (reports, interfaces, enhancements, OData), performs code reviews, and supports technical incidents in SAP S/4HANA.",
            description_ar:
              "تطوير وصيانة كائنات ABAP (تقارير، تكامل، تحسينات، OData)، ومراجعة الشيفرة، ودعم الحوادث التقنية في SAP S/4HANA.",
            daily_activities: lines(
              "Design and implement ABAP programs, enhancements, and OData services",
              "Debug production issues and optimize runtime",
              "Collaborate on technical specifications with functional teams",
              "Support transports through the landscape",
              "Follow SAP development standards and security guidelines"
            ),
            daily_activities_ar: lines(
              "تصميم وتنفيذ برامج ABAP والتحسينات وخدمات OData",
              "تشخيص مشاكل الإنتاج وتحسين الأداء",
              "التعاون على المواصفات التقنية مع الفريق الوظيفي",
              "دعم النقل بين البيئات",
              "الالتزام بمعايير التطوير والأمن في SAP"
            ),
          }
        : {
            title: "SAP ABAP Analyst",
            title_ar: "محلل ABAP في SAP",
            description:
              "Supports functional teams with light ABAP changes, analysis of dumps and short dumps, and coordination with developers for larger enhancements.",
            description_ar:
              "دعم الفريق الوظيفي بتعديلات ABAP الخفيفة وتحليل الأعطال والتنسيق مع المطورين للتحسينات الأكبر.",
            daily_activities: lines(
              "Analyze incidents related to custom ABAP objects",
              "Coordinate enhancement requests with developers",
              "Validate fixes in QA before production",
              "Document interfaces and custom logic"
            ),
            daily_activities_ar: lines(
              "تحليل الحوادث المتعلقة بكائنات ABAP المخصصة",
              "تنسيق طلبات التحسين مع المطورين",
              "التحقق من الإصلاحات قبل الإنتاج",
              "توثيق الواجهات والمنطق المخصص"
            ),
          };
    return {
      ...base,
      min_years_experience: 0,
      typical_years_to_role: roleCategory === "technical" ? 3 : 2,
    };
  }

  if (code === "BASIS") {
    return {
      title:
        roleCategory === "technical"
          ? "SAP Basis Administrator"
          : "SAP Basis Consultant",
      title_ar:
        roleCategory === "technical"
          ? "مسؤول أساس SAP (Basis)"
          : "مستشار أساس SAP",
      description:
        "Administers SAP NetWeaver / S/4HANA landscape: installations, upgrades, transports, performance, batch jobs, system copies, and security integration.",
      description_ar:
        "إدارة بيئة SAP NetWeaver / S/4HANA: التثبيت والترقيات والنقل والأداء والمجدولة والنسخ والتكامل الأمني.",
      daily_activities: lines(
        "Monitor system health, workload, and backups",
        "Manage transports, client copies, and patching",
        "Tune performance and troubleshoot RFC/gateway issues",
        "Coordinate DR tests and capacity planning",
        "Support security roles integration with GRC where applicable"
      ),
      daily_activities_ar: lines(
        "مراقبة صحة النظام والأعباء والنسخ الاحتياطي",
        "إدارة النقل ونسخ العملاء والتحديثات",
        "ضبط الأداء ومشاكل RFC والبوابة",
        "التنسيق لاختبارات الكوارث والسعة",
        "دعم التكامل مع الأدوار الأمنية وGRC عند الحاجة"
      ),
      min_years_experience: 0,
      typical_years_to_role: 4,
    };
  }

  if (code === "BTP") {
    return {
      title: "SAP BTP / Integration Developer",
      title_ar: "مطور التكامل و SAP BTP",
      description:
        "Builds and operates integrations on SAP BTP (Integration Suite, APIs, events) connecting SAP S/4HANA with cloud and third-party systems.",
      description_ar:
        "بناء وتشغيل التكامل على SAP BTP (Integration Suite، APIs، الأحداث) لربط S/4HANA بالأنظمة السحابية والخارجية.",
      daily_activities: lines(
        "Design and implement APIs, iFlows, and event-driven integrations",
        "Monitor integration errors and retry policies",
        "Collaborate on API governance and security",
        "Support CI/CD for integration artifacts"
      ),
      daily_activities_ar: lines(
        "تصميم وتنفيذ واجهات API وتكامل الأحداث",
        "مراقبة أخطاء التكامل وسياسات إعادة المحاولة",
        "التعاون على حوكمة API والأمن",
        "دعم CI/CD لمكونات التكامل"
      ),
      min_years_experience: 0,
      typical_years_to_role: 3,
    };
  }

  // Application modules FI, CO, MM, SD, ...
  const titleEn =
    roleCategory === "technical"
      ? `${moduleName} Technical Consultant`
      : `${moduleName} Functional Consultant`;
  const titleAr =
    roleCategory === "technical"
      ? `مستشار تقني — ${modAr}`
      : `مستشار وظيفي — ${modAr}`;

  const detail =
    roleCategory === "technical"
      ? sapTechnicalConsultant(moduleName, modAr)
      : sapFunctionalConsultant(moduleName, modAr);

  return {
    title: titleEn,
    title_ar: titleAr,
    ...detail,
  };
}

export function buildJobRoleAutoFill(input: JobRoleAutoFillInput): Record<string, unknown> {
  const erp = input.erpLabel.trim();
  const rc = input.roleCategory;
  const code = (input.moduleCode || "").toUpperCase().trim();
  const name = input.moduleName.trim() || code || "ERP Module";

  if (!code && !name) {
    return {};
  }

  if (isSapErp(erp)) {
    return buildSapPreset({
      ...input,
      moduleCode: code || name.slice(0, 12).toUpperCase(),
      moduleName: name,
      roleCategory: rc,
    });
  }

  return buildGenericPreset({
    ...input,
    moduleCode: code || "GEN",
    moduleName: name,
    roleCategory: rc,
  });
}
