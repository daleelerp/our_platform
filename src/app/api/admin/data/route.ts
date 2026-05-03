import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminSession } from "@/utils/admin-auth";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

async function enrichUserSubscriptionsRows(
  supabase: SupabaseClient,
  rows: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  if (!rows.length) return rows;

  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean) as string[])];
  const emailById = new Map<string, string>();

  await Promise.all(
    userIds.map(async (uid) => {
      try {
        const { data, error } = await supabase.auth.admin.getUserById(uid);
        if (!error && data?.user?.email) {
          emailById.set(uid, data.user.email);
        }
      } catch {
        // ignore per-user lookup failures
      }
    })
  );

  return rows.map((row) => {
    const plan = row.subscription_plans as
      | { name?: string; display_name_en?: string; display_name_ar?: string }
      | null
      | undefined;
    const planDisplay =
      (plan && (plan.display_name_en || plan.display_name_ar || plan.name)) || "";
    const rest = { ...(row as Record<string, unknown>) };
    delete rest.subscription_plans;
    return {
      ...rest,
      plan_display_name: planDisplay,
      user_email: emailById.get(row.user_id as string) ?? "—",
    };
  });
}

/** Empty strings break Postgres UUID, date, and timestamptz columns — treat as SQL NULL. */
function sanitizeAdminPayload(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const key of Object.keys(out)) {
    if (out[key] !== "") continue;
    const lower = key.toLowerCase();
    if (
      lower.endsWith("_id") ||
      lower === "launch_date" ||
      lower.endsWith("_date") ||
      lower.endsWith("_at")
    ) {
      out[key] = null;
    }
  }
  return out;
}

/**
 * Secure Admin Data API
 * Provides CRUD operations for all database tables
 * Requires valid admin session
 */

export async function GET(request: NextRequest) {
  try {
    // Verify admin session
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table");
    const id = searchParams.get("id");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");
    const filterColumn = searchParams.get("filterColumn");
    const filterValue = searchParams.get("filterValue");
    const plan_id = searchParams.get("plan_id"); // Special filter for plan_paths

    if (!table) {
      return NextResponse.json(
        { error: "Table parameter is required" },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabaseClient();

    // Build query with joins for specific tables
    let selectQuery = "*";
    if (table === "plan_paths") {
      selectQuery = "*, learning_paths(*)";
    } else if (table === "user_subscriptions") {
      selectQuery = "*, subscription_plans(name, display_name_en, display_name_ar)";
    }

    let query: any = supabase.from(table).select(selectQuery);

    if (id) {
      const { data, error } = await query.eq("id", id).single();
      if (error) {
        console.error(`Error fetching from ${table}:`, error);
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
      let payload = data;
      if (table === "user_subscriptions" && payload) {
        const enriched = await enrichUserSubscriptionsRows(supabase, [payload as Record<string, unknown>]);
        payload = enriched[0];
      }
      return NextResponse.json({ data: payload });
    } else {
      // Special handling for plan_paths with plan_id filter
      if (table === "plan_paths" && plan_id) {
        query = query.eq("plan_id", plan_id);
      } else if (filterColumn && filterValue) {
        query = query.eq(filterColumn, filterValue);
      }

      if (limit) {
        query = query.limit(parseInt(limit));
      }
      if (offset) {
        const limitNumber = parseInt(limit || "10");
        const offsetNumber = parseInt(offset);
        query = query.range(offsetNumber, offsetNumber + (limitNumber - 1));
      }
    }

    let { data, error } = await query;

    if (error) {
      console.error(`Error fetching from ${table}:`, error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (table === "user_subscriptions" && Array.isArray(data)) {
      data = await enrichUserSubscriptionsRows(
        supabase,
        data as Record<string, unknown>[]
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Admin data API error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin session
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table");

    if (!table) {
      return NextResponse.json(
        { error: "Table parameter is required" },
        { status: 400 }
      );
    }

    const raw = await request.json();
    const body = sanitizeAdminPayload(raw as Record<string, unknown>);
    const supabase = getAdminSupabaseClient();

    const { data, error } = await supabase
      .from(table)
      .insert(body)
      .select()
      .single();

    if (error) {
      console.error(`Error inserting into ${table}:`, error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    console.error("Admin data API error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify admin session
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table");
    const id = searchParams.get("id");

    if (!table || !id) {
      return NextResponse.json(
        { error: "Table and id parameters are required" },
        { status: 400 }
      );
    }

    const raw = await request.json();
    const body = sanitizeAdminPayload(raw as Record<string, unknown>);
    const supabase = getAdminSupabaseClient();

    const { data, error } = await supabase
      .from(table)
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating ${table}:`, error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Admin data API error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify admin session
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table");
    const id = searchParams.get("id");

    if (!table || !id) {
      return NextResponse.json(
        { error: "Table and id parameters are required" },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabaseClient();

    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", id);

    if (error) {
      console.error(`Error deleting from ${table}:`, error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin data API error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}


