import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country") ?? "global";
    const city = searchParams.get("city") ?? "Remote";
    const limit = Math.max(1, Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100));

    const supabase = getAdminSupabaseClient();
    const { data, error } = await supabase
      .from("job_roles_overview_latest")
      .select("*")
      .eq("country_code", country)
      .eq("city", city)
      .order("openings_count", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      filters: { country, city, limit },
      data: data ?? [],
      count: data?.length ?? 0,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
