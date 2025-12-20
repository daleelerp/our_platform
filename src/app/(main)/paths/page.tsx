import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { PathsContent } from "@/components/PathsContent";
import { filterPathsByPlan } from "@/utils/pathAccess";

type Props = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function PathsPage({ searchParams }: Props) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const resolvedSearchParams = await searchParams;
  const errorParam = resolvedSearchParams?.error;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // For unauthenticated users, we allow access to the public paths list
  // without requiring a redirect – user-specific data will simply be null.
  let userProfile: any | null = null;
  let savedPreferences: any | null = null;

  if (user) {
    // Fetch user profile and saved preferences only when authenticated
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

    const { data: prefs } = await supabase
      .from("user_path_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();
    
    savedPreferences = prefs;
  }

  // Build base query for all published paths
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
      career_outcomes,
      is_published,
      erp_module_id,
      career_focus
    `)
    .eq("is_published", true);

  // Optional: Filter by provider/module if user has completed onboarding
  // This helps show relevant paths, but we'll show all paths if no match
  // NOTE: We always show general paths (NULL erp_module_id) regardless of provider
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
          // Filter to show paths for this provider's modules OR general paths (NULL erp_module_id)
          // This ensures both module-specific and general paths are shown
          pathsQuery = pathsQuery.or(`erp_module_id.in.(${moduleIds.join(',')}),erp_module_id.is.null`);
        } else {
          // No modules found - show all paths including general ones (NULL erp_module_id)
          // Don't apply any filter, show everything
        }
      } else {
        // No systems found - show all paths
      }
    } else {
      // Provider not found - show all paths
    }
  }
  // If user hasn't completed onboarding or has no provider, show ALL published paths

  // Note: We don't filter by career_focus here - show ALL published paths
  // The career_focus is used for recommendations/badges in the UI, not for filtering

  // Execute query
  const { data: paths, error: err } = await pathsQuery.order("difficulty_level");

  // Filter paths by user's subscription plan
  // Only show paths that are in the user's plan
  const accessiblePaths = paths 
    ? await filterPathsByPlan(paths, supabase, user?.id, undefined)
    : [];

  // Handle error messages
  let errorMessage = err?.message || null;
  if (errorParam === "path_not_in_plan") {
    errorMessage = user 
      ? "This path is not available in your current subscription plan. Please upgrade to access this path."
      : "This path requires a subscription. Please sign in to view available plans.";
  }

  return (
    <PathsContent 
      paths={accessiblePaths} 
      isLoggedIn={!!user} 
      error={errorMessage}
      userProfile={userProfile}
      userId={user?.id || null}
      savedPreferences={savedPreferences}
    />
  );
}
