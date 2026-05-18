import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { HeroSection } from "@/components/landing/HeroSection";
import { CurrentStatusBanner } from "@/components/landing/CurrentStatusBanner";
import { ErpSystemsGrid } from "@/components/landing/ErpSystemsGrid";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { OraclePathsPreview } from "@/components/landing/OraclePathsPreview";
import { EarlyAccessCTA } from "@/components/landing/EarlyAccessCTA";
import { mergeHomepageErpSystems } from "@/lib/mergeHomepageErpSystems";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  let user = null;
  let erpSystems: import("@/types/onboarding").ErpSystem[] | null = null;
  let learningPaths = null;
  let liveErpNames: string[] = [];
  let pendingErpNames: string[] = [];

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;

    if (user) {
      redirect("/dashboard");
    }

    const [
      { data: erpSystemsData },
      { data: learningPathsData },
      { data: erpProvidersData },
      { data: activePlansData },
    ] = await Promise.all([
      supabase.from("erp_systems").select("*").order("priority_order"),
      supabase
        .from("learning_paths")
        .select(
          `
        id,
        title,
        title_ar,
        slug,
        description,
        description_ar,
        target_audience,
        estimated_duration_hours,
        difficulty_level,
        career_outcomes
      `
        )
        .eq("is_published", true),
      supabase
        .from("erp_providers")
        .select("id, name, name_ar, slug, description, description_ar, logo_url, display_order")
        .eq("is_active", true)
        .order("display_order"),
      supabase.from("subscription_plans").select("erp_provider_ids").eq("is_active", true),
    ]);

    const providerIdsWithPlans = new Set<string>();
    for (const plan of activePlansData || []) {
      const ids = plan.erp_provider_ids;
      if (Array.isArray(ids)) {
        for (const id of ids) {
          if (typeof id === "string") providerIdsWithPlans.add(id);
        }
      }
    }

    const systems = mergeHomepageErpSystems(
      erpSystemsData || [],
      erpProvidersData || [],
      providerIdsWithPlans
    );
    erpSystems = systems;

    liveErpNames = [...new Set(systems.filter((s) => s.is_active).map((s) => s.name))];
    pendingErpNames = [...new Set(systems.filter((s) => !s.is_active).map((s) => s.name))];

    learningPaths = learningPathsData;
  } catch (error: any) {
    if (
      error?.digest === "NEXT_REDIRECT" ||
      error?.digest === "DYNAMIC_SERVER_USAGE"
    ) {
      throw error;
    }

    const errorMessage = error?.message || String(error);
    const isNetworkError =
      errorMessage.includes("ENOTFOUND") ||
      errorMessage.includes("getaddrinfo") ||
      errorMessage.includes("fetch failed") ||
      error?.code === "ENOTFOUND";

    if (isNetworkError) {
      console.error("Network error connecting to Supabase. Please check:", {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        error: errorMessage,
        hint: "Verify your Supabase project is active and the URL is correct",
      });
    } else {
      console.error("Error fetching data for homepage:", error);
    }
  }

  const difficultyOrder: Record<string, number> = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
    expert: 4,
  };

  const sortedPaths = learningPaths
    ? [...learningPaths].sort((a, b) => {
        const aOrder = difficultyOrder[a.difficulty_level || "beginner"] || 99;
        const bOrder = difficultyOrder[b.difficulty_level || "beginner"] || 99;
        return aOrder - bOrder;
      })
    : [];

  return (
    <main className="min-h-screen">
      <HeroSection liveErpNames={liveErpNames} pendingErpNames={pendingErpNames} />
      <CurrentStatusBanner liveSystemNames={liveErpNames} pendingSystemNames={pendingErpNames} />
      <HowItWorks />
      <ErpSystemsGrid
        systems={erpSystems || []}
        liveSystemNames={liveErpNames}
        pendingSystemNames={pendingErpNames}
      />
      <OraclePathsPreview paths={sortedPaths} />
      <EarlyAccessCTA />
    </main>
  );
}
