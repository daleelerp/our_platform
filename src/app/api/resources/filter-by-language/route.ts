import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Get resources filtered by language preference
 * 
 * This endpoint returns resources that match the user's language preference.
 * It prioritizes resources with the exact language match, but also includes
 * resources marked as 'both' if they support multiple languages.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get("language") || "en";
    const milestoneId = searchParams.get("milestone_id");
    const pathId = searchParams.get("path_id");

    if (!["en", "ar"].includes(language)) {
      return NextResponse.json(
        { error: "Language must be 'en' or 'ar'" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    let query = supabase
      .from("learning_resources")
      .select(`
        *,
        platform:resource_platforms(*)
      `)
      .eq("is_active", true);

    // Filter by language: exact match OR 'both'
    query = query.or(`language.eq.${language},language.eq.both`);

    // If milestone_id is provided, get resources for that milestone
    if (milestoneId) {
      const { data: milestoneResources } = await supabase
        .from("milestone_resources")
        .select("resource_id")
        .eq("milestone_id", milestoneId);

      if (milestoneResources && milestoneResources.length > 0) {
        const resourceIds = milestoneResources.map((mr) => mr.resource_id);
        query = query.in("id", resourceIds);
      } else {
        // No resources for this milestone
        return NextResponse.json({ data: [] });
      }
    }

    // If path_id is provided, get resources for all milestones in that path
    if (pathId && !milestoneId) {
      const { data: milestones } = await supabase
        .from("path_milestones")
        .select("id")
        .eq("learning_path_id", pathId);

      if (milestones && milestones.length > 0) {
        const milestoneIds = milestones.map((m) => m.id);
        const { data: milestoneResources } = await supabase
          .from("milestone_resources")
          .select("resource_id")
          .in("milestone_id", milestoneIds);

        if (milestoneResources && milestoneResources.length > 0) {
          const resourceIds = [
            ...new Set(milestoneResources.map((mr) => mr.resource_id)),
          ];
          query = query.in("id", resourceIds);
        } else {
          return NextResponse.json({ data: [] });
        }
      }
    }

    const { data: resources, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Sort: exact language match first, then 'both'
    const sortedResources = (resources || []).sort((a, b) => {
      if (a.language === language && b.language !== language) return -1;
      if (a.language !== language && b.language === language) return 1;
      return 0;
    });

    return NextResponse.json({ data: sortedResources });
  } catch (error: any) {
    console.error("Error filtering resources by language:", error);
    return NextResponse.json(
      { error: error.message || "Failed to filter resources" },
      { status: 500 }
    );
  }
}

