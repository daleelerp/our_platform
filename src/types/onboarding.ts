// Onboarding option types from database

export type ExperienceLevel = {
  id: string;
  value: string;
  label: string;
  label_ar: string | null;
  description: string | null;
  description_ar: string | null;
  icon: string | null;
  display_order: number;
};

export type Industry = {
  id: string;
  value: string;
  label: string;
  label_ar: string | null;
  icon: string | null;
  display_order: number;
};

export type Country = {
  id: string;
  code: string;
  name: string;
  name_ar: string | null;
  flag: string | null;
  region: string;
  display_order: number;
};

export type LearningGoal = {
  id: string;
  value: string;
  label: string;
  label_ar: string | null;
  description: string | null;
  description_ar: string | null;
  icon: string | null;
  display_order: number;
};

export type CertificationType = {
  id: string;
  value: string;
  label: string;
  label_ar: string | null;
  erp_system_id: string | null;
  provider_id: string | null; // Links to erp_providers table
  is_hot: boolean;
  display_order: number;
  career_focus: string | null; // 'technical', 'business_functional', or null (both)
};

export type LearningStyle = {
  id: string;
  value: string;
  label: string;
  label_ar: string | null;
  description: string | null;
  description_ar: string | null;
  icon: string | null;
  display_order: number;
};

export type CareerTimeline = {
  id: string;
  value: string;
  label: string;
  label_ar: string | null;
  description: string | null;
  description_ar: string | null;
  display_order: number;
};

export type BudgetRange = {
  id: string;
  value: string;
  label: string;
  label_ar: string | null;
  icon: string | null;
  min_amount: number | null;
  max_amount: number | null;
  currency: string;
  display_order: number;
};

export type ReferralSource = {
  id: string;
  value: string;
  label: string;
  label_ar: string | null;
  display_order: number;
};

export type ErpSystem = {
  id: string;
  name: string;
  vendor: string;
  logo_url: string | null;
  description: string | null;
  description_ar: string | null;
  market_share_mena: number | null;
  is_active: boolean;
  launch_date: string | null;
  priority_order: number;
  avg_salary_range: string | null;
  job_demand_level: string | null;
  learning_difficulty: string | null;
  certification_available: boolean;
  primary_industries: string[] | null;
  /** Optional MENA salary bands (EGP / month) — see docs/sql/add_salary_fields_to_erp_systems.sql */
  salary_beginner_min?: number | null;
  salary_beginner_max?: number | null;
  salary_intermediate_min?: number | null;
  salary_intermediate_max?: number | null;
  salary_senior_min?: number | null;
  salary_senior_max?: number | null;
  salary_expert_min?: number | null;
  salary_expert_max?: number | null;
};

export type StudentStatus = {
  id: string;
  value: string;
  label: string;
  label_ar: string | null;
  icon: string | null;
  display_order: number;
};

export type ErpProvider = {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string;
  description: string | null;
  description_ar: string | null;
  logo_url: string | null;
  is_active: boolean;
  display_order: number;
};

export type ErpProviderTool = {
  id: string;
  provider_id: string;
  name: string;
  name_ar: string | null;
  slug: string;
  description: string | null;
  description_ar: string | null;
  category: string | null;
  category_ar: string | null;
  is_active: boolean;
  display_order: number;
};

export type OnboardingOptions = {
  experienceLevels: ExperienceLevel[];
  industries: Industry[];
  countries: Country[];
  learningGoals: LearningGoal[];
  certifications: CertificationType[];
  learningStyles: LearningStyle[];
  careerTimelines: CareerTimeline[];
  budgetRanges: BudgetRange[];
  referralSources: ReferralSource[];
  erpSystems: ErpSystem[];
  studentStatuses: StudentStatus[];
  erpProviders: ErpProvider[];
  erpProviderTools: ErpProviderTool[];
};

