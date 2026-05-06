import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

/**
 * GET /api/job-roles/[slug]/market?country=global&city=Remote&months=12
 * Time series of market + salary metrics for one canonical role slug.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country") ?? "global";
    const city = searchParams.get("city") ?? "Remote";
    const months = Math.max(1, Math.min(parseInt(searchParams.get("months") ?? "12", 10), 36));

    const supabase = getAdminSupabaseClient();

    const { data: roleRow, error: roleError } = await supabase
      .from("job_roles")
      .select("id, slug, title, title_ar, pipeline_erp_vendor")
      .eq("slug", slug)
      .maybeSingle();

    if (roleError) {
      return NextResponse.json(
        { success: false, error: roleError.message },
        { status: 500 }
      );
    }
    if (!roleRow) {
      return NextResponse.json(
        { success: false, error: "Role not found" },
        { status: 404 }
      );
    }

    const { data: locRow, error: locError } = await supabase
      .from("job_locations")
      .select("id")
      .eq("country_code", country)
      .eq("city", city)
      .maybeSingle();

    if (locError) {
      return NextResponse.json(
        { success: false, error: locError.message },
        { status: 500 }
      );
    }
    if (!locRow) {
      return NextResponse.json(
        { success: false, error: "Location not found" },
        { status: 404 }
      );
    }

    const { data: marketRows, error: marketError } = await supabase
      .from("role_market_metrics")
      .select("metric_month, openings_count, growth_mom_pct, remote_ratio, updated_at")
      .eq("role_id", roleRow.id)
      .eq("location_id", locRow.id)
      .order("metric_month", { ascending: false })
      .limit(months);

    if (marketError) {
      return NextResponse.json(
        { success: false, error: marketError.message },
        { status: 500 }
      );
    }

    const { data: salaryRows, error: salaryError } = await supabase
      .from("role_salary_metrics")
      .select(
        "metric_month, salary_min, salary_median, salary_max, sample_size, currency, updated_at"
      )
      .eq("role_id", roleRow.id)
      .eq("location_id", locRow.id)
      .order("metric_month", { ascending: false })
      .limit(months);

    if (salaryError) {
      return NextResponse.json(
        { success: false, error: salaryError.message },
        { status: 500 }
      );
    }

    const market_series = [...(marketRows ?? [])].reverse();
    const salary_series = [...(salaryRows ?? [])].reverse();

    return NextResponse.json({
      success: true,
      filters: { slug, country, city, months },
      role: {
        id: roleRow.id,
        slug: roleRow.slug,
        title: roleRow.title,
        title_ar: roleRow.title_ar,
        pipeline_erp_vendor: roleRow.pipeline_erp_vendor,
      },
      market_series,
      salary_series,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
