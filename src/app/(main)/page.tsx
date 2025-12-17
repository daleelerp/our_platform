import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { HeroSection } from "@/components/landing/HeroSection";
import { CurrentStatusBanner } from "@/components/landing/CurrentStatusBanner";
import { ErpSystemsGrid } from "@/components/landing/ErpSystemsGrid";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { OraclePathsPreview } from "@/components/landing/OraclePathsPreview";
import { FoundersNote } from "@/components/landing/FoundersNote";
import { EarlyAccessCTA } from "@/components/landing/EarlyAccessCTA";
import { PricingSection } from "@/components/landing/PricingSection";
import { SpecialOffers } from "@/components/landing/SpecialOffers";

export default async function HomePage() {
  let user = null;
  let erpSystems = null;
  let learningPaths = null;

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;

    // If user is already logged in, redirect to dashboard
    if (user) {
      redirect("/dashboard");
    }

    // Fetch ERP systems for the grid
    const { data: erpSystemsData } = await supabase
      .from("erp_systems")
      .select("*")
      .order("priority_order");
    erpSystems = erpSystemsData;

    // Fetch published learning paths
    const { data: learningPathsData } = await supabase
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
        career_outcomes
      `)
      .eq("is_published", true);
    learningPaths = learningPathsData;
  } catch (error) {
    // If Supabase is unavailable, continue with empty data
    console.error("Error fetching data for homepage:", error);
    // Don't throw - allow page to render with empty data
  }

  // Sort paths from beginner to advanced
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
      <HeroSection />
      <CurrentStatusBanner />
      <HowItWorks />
      <ErpSystemsGrid systems={erpSystems || []} />
      <OraclePathsPreview paths={sortedPaths} />
      <PricingSection />
      <SpecialOffers />
      <FoundersNote />
      <EarlyAccessCTA />
    </main>
  );
}
