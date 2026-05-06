import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

/** Egypt UI uses curated rows in `job_market_data` (EGP), not USD→EGP conversion. */
function isEgyptBundle(country: string | null, city: string | null) {
  return (
    country?.toLowerCase() === "eg" && city?.toLowerCase() === "egypt"
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country") ?? "global";
    const city = searchParams.get("city") ?? "Remote";
    const limit = Math.max(1, Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100));

    const supabase = getAdminSupabaseClient();

    if (isEgyptBundle(country, city)) {
      const { data: roles, error: rolesError } = await supabase
        .from("job_roles")
        .select("id, slug, title, title_ar")
        .eq("is_active", true)
        .order("title")
        .limit(limit);

      if (rolesError) {
        return NextResponse.json(
          { success: false, error: rolesError.message },
          { status: 500 }
        );
      }

      const roleList = roles ?? [];
      const ids = roleList.map((r) => r.id);

      if (!ids.length) {
        return NextResponse.json({
          success: true,
          filters: { country, city, limit, source: "job_market_data" },
          data: [],
          count: 0,
        });
      }

      const { data: egRows, error: egError } = await supabase
        .from("job_market_data")
        .select("*")
        .eq("country", "EG")
        .in("job_role_id", ids);

      if (egError) {
        return NextResponse.json(
          { success: false, error: egError.message },
          { status: 500 }
        );
      }

      const byRoleId = new Map(
        (egRows ?? []).map((row) => [row.job_role_id as string, row])
      );

      const data = roleList.map((r) => {
        const m = byRoleId.get(r.id);
        const min =
          m?.salary_min != null ? Number(m.salary_min) : null;
        const max =
          m?.salary_max != null ? Number(m.salary_max) : null;
        const mid =
          min != null && max != null ? Math.round((min + max) / 2) : null;

        return {
          role_id: r.id,
          slug: r.slug ?? null,
          name_en: r.title,
          name_ar: r.title_ar,
          country_code: "eg",
          city: "Egypt",
          openings_count: m?.open_positions_count ?? 0,
          growth_mom_pct: null,
          remote_ratio: m?.remote_percentage ?? null,
          salary_min: min,
          salary_max: max,
          salary_median: mid,
          salary_currency: m?.salary_currency ?? "EGP",
          salary_period: m?.salary_period ?? "yearly",
          sample_size: m?.sample_size ?? null,
          data_source: m?.data_source ?? null,
          data_date: m?.data_date ?? null,
          data_month: m?.data_date ?? null,
          currency: m?.salary_currency ?? "EGP",
          salary_basis: "eg_job_market_data" as const,
        };
      });

      data.sort((a, b) => {
        const aw = a.salary_min != null ? 1 : 0;
        const bw = b.salary_min != null ? 1 : 0;
        if (bw !== aw) return bw - aw;
        return (b.openings_count ?? 0) - (a.openings_count ?? 0);
      });

      return NextResponse.json({
        success: true,
        filters: {
          country,
          city,
          limit,
          source: "job_market_data",
          note: "EGP ranges are stored in job_market_data (country=EG); edit SQL or Admin — not FX-derived.",
        },
        data,
        count: data.length,
      });
    }

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
      filters: { country, city, limit, source: "job_roles_overview_latest" },
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
