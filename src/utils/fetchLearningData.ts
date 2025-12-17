import { createClient } from "@/utils/supabase/client";
import type {
  LearningPath,
  PathMilestone,
  LearningResource,
  JobRole,
  JobMarketData,
  Skill,
  PathPreview,
  PathWithDetails,
  UserPathProgress,
  ErpSystem,
  ErpModule,
} from "@/types/learning";

// =====================================================
// LEARNING PATHS
// =====================================================

/**
 * Fetch all published learning paths with basic info
 */
export async function fetchPublishedPaths(): Promise<PathPreview[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("learning_paths")
    .select(`
      id,
      title,
      title_ar,
      slug,
      description,
      description_ar,
      target_audience,
      estimated_duration_hours,
      difficulty_level,
      career_outcomes,
      erp_modules (
        name,
        name_ar,
        erp_systems (
          name
        )
      )
    `)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching paths:", error);
    return [];
  }

  // Transform to PathPreview format
  return (data || []).map((path: any) => ({
    id: path.id,
    title: path.title,
    title_ar: path.title_ar,
    slug: path.slug,
    description: path.description,
    description_ar: path.description_ar,
    target_audience: path.target_audience,
    estimated_duration_hours: path.estimated_duration_hours,
    difficulty_level: path.difficulty_level,
    career_outcomes: path.career_outcomes,
    milestone_count: 0, // Will be fetched separately if needed
    erp_system_name: path.erp_modules?.erp_systems?.name || "Oracle",
    erp_module_name: path.erp_modules?.name || "Financials",
  }));
}

/**
 * Fetch paths for a specific ERP system
 */
export async function fetchPathsByErpSystem(erpSystemId: string): Promise<PathPreview[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("learning_paths")
    .select(`
      id,
      title,
      title_ar,
      slug,
      description,
      description_ar,
      target_audience,
      estimated_duration_hours,
      difficulty_level,
      career_outcomes,
      erp_modules!inner (
        name,
        name_ar,
        erp_system_id,
        erp_systems (
          name
        )
      )
    `)
    .eq("is_published", true)
    .eq("erp_modules.erp_system_id", erpSystemId)
    .order("difficulty_level");

  if (error) {
    console.error("Error fetching paths by ERP:", error);
    return [];
  }

  return (data || []).map((path: any) => ({
    id: path.id,
    title: path.title,
    title_ar: path.title_ar,
    slug: path.slug,
    description: path.description,
    description_ar: path.description_ar,
    target_audience: path.target_audience,
    estimated_duration_hours: path.estimated_duration_hours,
    difficulty_level: path.difficulty_level,
    career_outcomes: path.career_outcomes,
    milestone_count: 0,
    erp_system_name: path.erp_modules?.erp_systems?.name || "Oracle",
    erp_module_name: path.erp_modules?.name || "Financials",
  }));
}

/**
 * Fetch a single path with all details
 */
export async function fetchPathBySlug(slug: string): Promise<PathWithDetails | null> {
  const supabase = createClient();

  // Fetch path with module and system info
  const { data: path, error: pathError } = await supabase
    .from("learning_paths")
    .select(`
      *,
      erp_modules (
        *,
        erp_systems (*)
      )
    `)
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (pathError || !path) {
    console.error("Error fetching path:", pathError);
    return null;
  }

  // Fetch milestones
  const { data: milestones } = await supabase
    .from("path_milestones")
    .select("*")
    .eq("learning_path_id", path.id)
    .eq("is_active", true)
    .order("milestone_number");

  // Fetch job roles linked to this path
  const { data: pathJobRoles } = await supabase
    .from("path_job_roles")
    .select(`
      *,
      job_roles (*)
    `)
    .eq("learning_path_id", path.id);

  // Calculate totals
  const totalHours = (milestones || []).reduce(
    (sum: number, m: any) => sum + (m.estimated_hours || 0),
    0
  );

  return {
    ...path,
    milestones: milestones || [],
    job_roles: pathJobRoles || [],
    erp_module: path.erp_modules,
    total_resources: 0, // Would need another query
    total_hours: totalHours,
  };
}

// =====================================================
// MILESTONES & RESOURCES
// =====================================================

/**
 * Fetch milestones for a path with their resources
 */
export async function fetchMilestonesWithResources(pathId: string): Promise<PathMilestone[]> {
  const supabase = createClient();

  const { data: milestones, error } = await supabase
    .from("path_milestones")
    .select(`
      *,
      milestone_resources (
        *,
        learning_resources (
          *,
          resource_platforms (*)
        )
      ),
      milestone_skills (
        *,
        skills (*)
      )
    `)
    .eq("learning_path_id", pathId)
    .eq("is_active", true)
    .order("milestone_number");

  if (error) {
    console.error("Error fetching milestones:", error);
    return [];
  }

  return milestones || [];
}

/**
 * Fetch resources for a specific milestone
 */
export async function fetchMilestoneResources(milestoneId: string): Promise<LearningResource[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("milestone_resources")
    .select(`
      *,
      learning_resources (
        *,
        resource_platforms (*)
      )
    `)
    .eq("milestone_id", milestoneId)
    .order("resource_order");

  if (error) {
    console.error("Error fetching resources:", error);
    return [];
  }

  return (data || []).map((mr: any) => mr.learning_resources);
}

// =====================================================
// JOB MARKET DATA
// =====================================================

/**
 * Fetch job roles with market data
 */
export async function fetchJobRolesWithMarket(erpSystemId?: string): Promise<JobRole[]> {
  const supabase = createClient();

  let query = supabase
    .from("job_roles")
    .select(`
      *,
      job_market_data (*),
      role_skills (
        *,
        skills (*)
      )
    `)
    .eq("is_active", true);

  if (erpSystemId) {
    query = query.eq("erp_system_id", erpSystemId);
  }

  const { data, error } = await query.order("min_years_experience");

  if (error) {
    console.error("Error fetching job roles:", error);
    return [];
  }

  return data || [];
}

/**
 * Fetch market data for a specific country
 */
export async function fetchMarketDataByCountry(country: string): Promise<JobMarketData[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("job_market_data")
    .select(`
      *,
      job_roles (*)
    `)
    .eq("country", country)
    .order("data_date", { ascending: false });

  if (error) {
    console.error("Error fetching market data:", error);
    return [];
  }

  return data || [];
}

// =====================================================
// SKILLS
// =====================================================

/**
 * Fetch all skills
 */
export async function fetchSkills(category?: string): Promise<Skill[]> {
  const supabase = createClient();

  let query = supabase
    .from("skills")
    .select("*")
    .eq("is_active", true);

  if (category) {
    query = query.eq("skill_category", category);
  }

  const { data, error } = await query.order("display_order");

  if (error) {
    console.error("Error fetching skills:", error);
    return [];
  }

  return data || [];
}

// =====================================================
// USER PROGRESS
// =====================================================

/**
 * Fetch user's progress on a path
 */
export async function fetchUserPathProgress(
  userId: string,
  pathId: string
): Promise<UserPathProgress | null> {
  const supabase = createClient();

  // Get path info
  const { data: path } = await supabase
    .from("learning_paths")
    .select("id, title")
    .eq("id", pathId)
    .single();

  if (!path) return null;

  // Get milestones count
  const { count: totalMilestones } = await supabase
    .from("path_milestones")
    .select("*", { count: "exact", head: true })
    .eq("learning_path_id", pathId)
    .eq("is_active", true);

  // Get user's completed milestones
  // First get milestone IDs for this path
  const { data: pathMilestones } = await supabase
    .from("path_milestones")
    .select("id")
    .eq("learning_path_id", pathId);
  
  const milestoneIds = pathMilestones?.map((m: any) => m.id) || [];
  
  const { data: progress } = await supabase
    .from("user_milestone_progress")
    .select(`
      *,
      path_milestones (*)
    `)
    .eq("user_id", userId)
    .in("milestone_id", milestoneIds);

  const completedCount = (progress || []).filter(
    (p: any) => p.status === "completed"
  ).length;

  // Find current milestone (first not completed)
  const { data: currentMilestone } = await supabase
    .from("path_milestones")
    .select("*")
    .eq("learning_path_id", pathId)
    .eq("is_active", true)
    .not("id", "in", 
      `(${(progress || [])
        .filter((p: any) => p.status === "completed")
        .map((p: any) => p.milestone_id)
        .join(",")})`
    )
    .order("milestone_number")
    .limit(1)
    .single();

  return {
    path_id: path.id,
    path_title: path.title,
    total_milestones: totalMilestones || 0,
    completed_milestones: completedCount,
    progress_percentage: totalMilestones 
      ? Math.round((completedCount / totalMilestones) * 100) 
      : 0,
    current_milestone: currentMilestone || null,
    started_at: progress?.[0]?.started_at || null,
    estimated_completion_date: null, // Calculate based on pace
  };
}

/**
 * Update user's milestone progress
 */
export async function updateMilestoneProgress(
  userId: string,
  milestoneId: string,
  status: "not_started" | "in_progress" | "completed" | "skipped",
  progressPercentage?: number
): Promise<boolean> {
  const supabase = createClient();

  const updateData: any = {
    user_id: userId,
    milestone_id: milestoneId,
    status,
    updated_at: new Date().toISOString(),
  };

  if (progressPercentage !== undefined) {
    updateData.progress_percentage = progressPercentage;
  }

  if (status === "in_progress" && !updateData.started_at) {
    updateData.started_at = new Date().toISOString();
  }

  if (status === "completed") {
    updateData.completed_at = new Date().toISOString();
    updateData.progress_percentage = 100;
  }

  const { error } = await supabase
    .from("user_milestone_progress")
    .upsert(updateData, {
      onConflict: "user_id,milestone_id",
    });

  if (error) {
    console.error("Error updating progress:", error);
    return false;
  }

  return true;
}

/**
 * Log user resource interaction
 */
export async function logResourceInteraction(
  userId: string,
  resourceId: string,
  interactionType: "viewed" | "started" | "completed" | "bookmarked" | "reported" | "rated",
  additionalData?: {
    progress_percentage?: number;
    time_spent_minutes?: number;
    user_rating?: number;
    user_review?: string;
    difficulty_feedback?: "too_easy" | "just_right" | "too_hard";
    reported_issue?: string;
    report_details?: string;
  }
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase.from("user_resource_interactions").insert({
    user_id: userId,
    resource_id: resourceId,
    interaction_type: interactionType,
    ...additionalData,
  });

  if (error) {
    console.error("Error logging interaction:", error);
    return false;
  }

  return true;
}

// =====================================================
// ERP SYSTEMS (Enhanced)
// =====================================================

/**
 * Fetch ERP systems with path counts
 */
export async function fetchErpSystemsWithPaths(): Promise<(ErpSystem & { path_count: number })[]> {
  const supabase = createClient();

  const { data: systems, error } = await supabase
    .from("erp_systems")
    .select(`
      *,
      erp_modules (
        learning_paths (id)
      )
    `)
    .order("priority_order");

  if (error) {
    console.error("Error fetching ERP systems:", error);
    return [];
  }

  return (systems || []).map((system: any) => {
    const pathCount = (system.erp_modules || []).reduce(
      (count: number, module: any) => count + (module.learning_paths?.length || 0),
      0
    );
    return {
      ...system,
      path_count: pathCount,
    };
  });
}

/**
 * Fetch modules for an ERP system
 */
export async function fetchErpModules(erpSystemId: string): Promise<ErpModule[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("erp_modules")
    .select("*")
    .eq("erp_system_id", erpSystemId)
    .order("is_core_module", { ascending: false });

  if (error) {
    console.error("Error fetching modules:", error);
    return [];
  }

  return data || [];
}

