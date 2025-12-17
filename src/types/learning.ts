// Learning Paths & Resources Types

// =====================================================
// RESOURCE TYPES
// =====================================================

export type ResourcePlatform = {
  id: string;
  name: string;
  name_ar: string | null;
  base_url: string | null;
  platform_type: 'official' | 'learning_platform' | 'community' | 'video' | 'documentation';
  logo_url: string | null;
  credibility_score: number;
  is_free: boolean;
  supports_arabic: boolean;
  is_active: boolean;
};

export type LearningResource = {
  id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  url: string;
  resource_type: 'video' | 'article' | 'test' | 'course' | 'documentation' | 'tutorial' | 'lab' | 'certification_prep';
  platform_id: string | null;
  language: 'en' | 'ar' | 'both';
  has_arabic_subtitles: boolean;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  estimated_duration_minutes: number | null;
  quality_score: number | null;
  relevance_score: number | null;
  currency_score: number | null;
  view_count: number | null;
  rating: number | null;
  rating_count: number | null;
  author_name: string | null;
  author_credibility_score: number | null;
  publish_date: string | null;
  last_updated: string | null;
  thumbnail_url: string | null;
  is_free: boolean;
  price: number | null;
  price_currency: string;
  is_verified: boolean;
  is_active: boolean;
  // Joined data
  platform?: ResourcePlatform;
};

export type ResourceEvaluation = {
  id: string;
  resource_id: string;
  overall_score: number | null;
  relevance_score: number | null;
  currency_score: number | null;
  comprehensiveness_score: number | null;
  clarity_score: number | null;
  practical_score: number | null;
  production_quality_score: number | null;
  key_topics: string[] | null;
  skill_coverage: string[] | null;
  prerequisite_skills: string[] | null;
  best_for_audience: string | null;
  learning_style_fit: string | null;
  evaluation_date: string;
  confidence_score: number | null;
  notes: string | null;
};

// =====================================================
// PLAYLIST TYPES
// =====================================================

export type ResourcePlaylist = {
  id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  platform_id: string | null;
  language: 'en' | 'ar' | 'both';
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  playlist_url: string;
  external_playlist_id: string | null;
  thumbnail_url: string | null;
  estimated_total_duration_minutes: number | null;
  resource_count: number;
  is_free: boolean;
  price: number | null;
  price_currency: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  platform?: ResourcePlatform;
  resources?: LearningResource[];
};

// =====================================================
// SKILLS TYPES
// =====================================================

export type Skill = {
  id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  description_ar: string | null;
  skill_category: 'technical' | 'functional' | 'soft' | 'business' | 'tool';
  erp_system_id: string | null;
  erp_module_id: string | null;
  market_demand_score: number | null;
  is_certification_required: boolean;
  display_order: number;
  is_active: boolean;
};

// =====================================================
// PATH & MILESTONE TYPES
// =====================================================

export type LearningPath = {
  id: string;
  erp_module_id: string | null;
  title: string;
  title_ar: string | null;
  slug: string;
  description: string | null;
  description_ar: string | null;
  target_audience: string | null;
  estimated_duration_hours: number | null;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  prerequisites: string[] | null;
  learning_outcomes: string[] | null;
  career_outcomes: string[] | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  milestones?: PathMilestone[];
  job_roles?: JobRole[];
  erp_module?: ErpModule;
};

export type PathMilestone = {
  id: string;
  learning_path_id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  milestone_number: number;
  estimated_hours: number | null;
  learning_objectives: string[] | null;
  learning_objectives_ar: string[] | null;
  checkpoint_type: 'quiz' | 'project' | 'certification' | 'peer_review' | null;
  checkpoint_description: string | null;
  checkpoint_description_ar: string | null;
  job_skills_unlocked: string[] | null;
  is_optional: boolean;
  is_active: boolean;
  // Joined data
  resources?: MilestoneResource[];
  skills?: MilestoneSkill[];
};

export type MilestoneResource = {
  id: string;
  milestone_id: string;
  resource_id: string;
  resource_order: number;
  is_primary: boolean;
  is_required: boolean;
  selection_reason: string | null;
  selection_reason_ar: string | null;
  // Joined data
  resource?: LearningResource;
};

export type MilestoneSkill = {
  id: string;
  milestone_id: string;
  skill_id: string;
  proficiency_target: 'awareness' | 'basic' | 'intermediate' | 'advanced' | 'expert' | null;
  is_prerequisite: boolean;
  // Joined data
  skill?: Skill;
};

// =====================================================
// JOB MARKET TYPES
// =====================================================

export type JobRole = {
  id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  role_category: 'functional' | 'technical' | 'management' | 'consulting';
  erp_system_id: string | null;
  erp_module_id: string | null;
  min_years_experience: number;
  max_years_experience: number | null;
  typical_years_to_role: number | null;
  daily_activities: string[] | null;
  daily_activities_ar: string[] | null;
  previous_roles: string[] | null;
  next_roles: string[] | null;
  is_active: boolean;
  // Joined data
  market_data?: JobMarketData[];
  required_skills?: RoleSkill[];
};

export type JobMarketData = {
  id: string;
  job_role_id: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  salary_period: 'yearly' | 'monthly';
  open_positions_count: number | null;
  positions_growth_6m: number | null;
  remote_percentage: number | null;
  contract_percentage: number | null;
  top_hiring_companies: string[] | null;
  top_industries: string[] | null;
  common_requirements: string[] | null;
  required_certifications: string[] | null;
  preferred_certifications: string[] | null;
  language_requirements: string[] | null;
  sample_job_descriptions: string[] | null;
  job_posting_urls: string[] | null;
  data_source: string | null;
  sample_size: number | null;
  data_date: string | null;
  confidence_score: number | null;
};

export type RoleSkill = {
  id: string;
  job_role_id: string;
  skill_id: string;
  importance_level: 'required' | 'preferred' | 'nice_to_have';
  proficiency_required: 'basic' | 'intermediate' | 'advanced' | 'expert' | null;
  mention_frequency: number | null;
  // Joined data
  skill?: Skill;
};

export type PathJobRole = {
  id: string;
  learning_path_id: string;
  job_role_id: string;
  readiness_level: 'entry_ready' | 'interview_ready' | 'fully_qualified';
  additional_requirements: string | null;
  // Joined data
  job_role?: JobRole;
};

// =====================================================
// USER PROGRESS TYPES
// =====================================================

export type UserMilestoneProgress = {
  id: string;
  user_id: string;
  milestone_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  progress_percentage: number;
  started_at: string | null;
  completed_at: string | null;
  checkpoint_passed: boolean;
  checkpoint_score: number | null;
  checkpoint_attempts: number;
  notes: string | null;
  // Joined data
  milestone?: PathMilestone;
};

export type UserResourceInteraction = {
  id: string;
  user_id: string;
  resource_id: string;
  interaction_type: 'viewed' | 'started' | 'completed' | 'bookmarked' | 'reported' | 'rated';
  progress_percentage: number | null;
  time_spent_minutes: number | null;
  user_rating: number | null;
  user_review: string | null;
  difficulty_feedback: 'too_easy' | 'just_right' | 'too_hard' | null;
  helpfulness_rating: number | null;
  reported_issue: 'broken_link' | 'outdated' | 'wrong_difficulty' | 'poor_quality' | null;
  report_details: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  resource?: LearningResource;
};

// =====================================================
// ERP TYPES (from existing schema)
// =====================================================

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
  job_demand_level: 'very_high' | 'high' | 'medium' | 'low' | null;
  learning_difficulty: 'beginner' | 'intermediate' | 'advanced' | null;
  certification_available: boolean;
  primary_industries: string[] | null;
};

export type ErpModule = {
  id: string;
  erp_system_id: string | null;
  name: string;
  name_ar: string | null;
  code: string | null;
  description: string | null;
  description_ar: string | null;
  is_core_module: boolean;
  typical_roles: string[] | null;
  // Joined data
  erp_system?: ErpSystem;
};

// =====================================================
// AGGREGATED/VIEW TYPES
// =====================================================

export type PathWithDetails = LearningPath & {
  milestones: PathMilestone[];
  job_roles: (PathJobRole & { job_role: JobRole })[];
  erp_module: ErpModule & { erp_system: ErpSystem };
  total_resources: number;
  total_hours: number;
};

export type PathPreview = {
  id: string;
  title: string;
  title_ar: string | null;
  slug: string;
  description: string | null;
  description_ar: string | null;
  target_audience: string | null;
  estimated_duration_hours: number | null;
  difficulty_level: string | null;
  career_outcomes: string[] | null;
  milestone_count: number;
  erp_system_name: string;
  erp_module_name: string;
};

export type JobRoleWithMarket = JobRole & {
  market_data: JobMarketData[];
  salary_range_display: string;
  top_companies: string[];
  demand_indicator: 'very_high' | 'high' | 'medium' | 'low';
};

export type UserPathProgress = {
  path_id: string;
  path_title: string;
  total_milestones: number;
  completed_milestones: number;
  progress_percentage: number;
  current_milestone: PathMilestone | null;
  started_at: string | null;
  estimated_completion_date: string | null;
};

