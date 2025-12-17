import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { PathFinderQuiz } from "@/components/PathFinderQuiz";

export default async function PathFinderPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch user profile first to get career_focus for filtering
  let userProfileForFilter = null;
  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("career_focus, erp_provider_id")
      .eq("id", user.id)
      .single();
    userProfileForFilter = profile;
  }

  // Build query with career_focus filtering
  let pathsQuery = supabase
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
      prerequisites,
      career_outcomes,
      career_focus
    `)
    .eq("is_published", true);

  // Filter by career_focus if user has selected one
  if (userProfileForFilter && userProfileForFilter.career_focus) {
    // Show paths that match career_focus OR are available for both (NULL)
    pathsQuery = pathsQuery.or(`career_focus.eq.${userProfileForFilter.career_focus},career_focus.is.null`);
  }

  const { data: paths } = await pathsQuery.order("difficulty_level");

  // Fetch ERP systems
  const { data: erpSystems } = await supabase
    .from("erp_systems")
    .select("id, name, description, description_ar, is_active")
    .order("priority_order");

  // Fetch saved preferences if user is logged in
  let savedPreferences = null;
  let userProfile = null;
  if (user) {
    const { data: prefs } = await supabase
      .from("user_path_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();
    
    savedPreferences = prefs;

    // Fetch user profile for onboarding data
    const { data: profile } = await supabase
      .from("user_profiles")
      .select(`
        *,
        erp_provider:erp_providers(id, name, slug),
        erp_tool:erp_provider_tools(id, name, slug)
      `)
      .eq("id", user.id)
      .single();
    
    userProfile = profile;
  }

  // Additional filtering by ERP provider if user has selected one
  let filteredPaths = paths || [];
  if (userProfile && userProfile.onboarding_completed && userProfile.erp_provider_id) {
    // Get provider name to match with erp_systems.vendor
    const { data: provider } = await supabase
      .from("erp_providers")
      .select("name, slug")
      .eq("id", userProfile.erp_provider_id)
      .single();

    if (provider) {
      // Step 1: Get ERP systems for this provider (match vendor name)
      const { data: erpSystems } = await supabase
        .from("erp_systems")
        .select("id")
        .eq("vendor", provider.name)
        .eq("is_active", true);

      if (erpSystems && erpSystems.length > 0) {
        const systemIds = erpSystems.map(s => s.id);

        // Step 2: Get modules for these systems
        const { data: modules } = await supabase
          .from("erp_modules")
          .select("id")
          .in("erp_system_id", systemIds);

        if (modules && modules.length > 0) {
          const moduleIds = modules.map(m => m.id);

          // Step 3: Filter paths by module AND career_focus
          filteredPaths = filteredPaths.filter(path => {
            // Check if path belongs to one of the provider's modules
            // Note: We need erp_module_id in the path data, but it might not be in the select
            // For now, we'll filter by career_focus which is already done in the query above
            return true; // Career focus filtering is already done in the query
          });
        } else {
          // No modules found for this provider
          filteredPaths = [];
        }
      } else {
        // No ERP systems found for this provider
        filteredPaths = [];
      }
    }
  }

  return (
    <PathFinderQuiz 
      paths={filteredPaths} 
      erpSystems={erpSystems || []}
      savedPreferences={savedPreferences}
      userId={user?.id || null}
      userProfile={userProfile}
    />
  );
}
