import { createClient } from "@/utils/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OnboardingOptions } from "@/types/onboarding";

export async function fetchOnboardingOptions(): Promise<OnboardingOptions> {
  const supabase = createClient();

  const [
    experienceLevelsRes,
    industriesRes,
    countriesRes,
    learningGoalsRes,
    certificationsRes,
    learningStylesRes,
    careerTimelinesRes,
    budgetRangesRes,
    referralSourcesRes,
    erpSystemsRes,
    studentStatusesRes,
    erpProvidersRes,
    erpProviderToolsRes,
  ] = await Promise.all([
    supabase
      .from("experience_levels")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("industries")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("countries")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("learning_goals")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("certification_types")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("learning_styles")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("career_timelines")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("budget_ranges")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("referral_sources")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("erp_systems")
      .select("*")
      .order("priority_order"),
    supabase
      .from("student_status")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("erp_providers")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("erp_provider_tools")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
  ]);

  return {
    experienceLevels: experienceLevelsRes.data || [],
    industries: industriesRes.data || [],
    countries: countriesRes.data || [],
    learningGoals: learningGoalsRes.data || [],
    certifications: certificationsRes.data || [],
    learningStyles: learningStylesRes.data || [],
    careerTimelines: careerTimelinesRes.data || [],
    budgetRanges: budgetRangesRes.data || [],
    referralSources: referralSourcesRes.data || [],
    erpSystems: erpSystemsRes.data || [],
    studentStatuses: studentStatusesRes.data || [],
    erpProviders: erpProvidersRes.data || [],
    erpProviderTools: erpProviderToolsRes.data || [],
  };
}

// Server-side version
export async function fetchOnboardingOptionsServer(
  supabase: SupabaseClient
): Promise<OnboardingOptions> {
  const [
    experienceLevelsRes,
    industriesRes,
    countriesRes,
    learningGoalsRes,
    certificationsRes,
    learningStylesRes,
    careerTimelinesRes,
    budgetRangesRes,
    referralSourcesRes,
    erpSystemsRes,
    studentStatusesRes,
    erpProvidersRes,
    erpProviderToolsRes,
  ] = await Promise.all([
    supabase
      .from("experience_levels")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("industries")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("countries")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("learning_goals")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("certification_types")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("learning_styles")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("career_timelines")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("budget_ranges")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("referral_sources")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("erp_systems")
      .select("*")
      .order("priority_order"),
    supabase
      .from("student_status")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("erp_providers")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("erp_provider_tools")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
  ]);

  return {
    experienceLevels: experienceLevelsRes.data || [],
    industries: industriesRes.data || [],
    countries: countriesRes.data || [],
    learningGoals: learningGoalsRes.data || [],
    certifications: certificationsRes.data || [],
    learningStyles: learningStylesRes.data || [],
    careerTimelines: careerTimelinesRes.data || [],
    budgetRanges: budgetRangesRes.data || [],
    referralSources: referralSourcesRes.data || [],
    erpSystems: erpSystemsRes.data || [],
    studentStatuses: studentStatusesRes.data || [],
    erpProviders: erpProvidersRes.data || [],
    erpProviderTools: erpProviderToolsRes.data || [],
  };
}
