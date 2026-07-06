import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

const DEFAULT_SETTINGS = {
  id: 1,
  fee_percent: 3.17,
  vat_percent: 14,
  fixed_fee_egp: 0,
};

export async function GET() {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminSupabaseClient();
  const { data, error } = await supabase
    .from("finance_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("finance-settings GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? DEFAULT_SETTINGS });
}

export async function PUT(request: NextRequest) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const fee_percent = Number(body.fee_percent);
  const vat_percent = Number(body.vat_percent);
  const fixed_fee_egp = Number(body.fixed_fee_egp);

  if (![fee_percent, vat_percent, fixed_fee_egp].every((n) => Number.isFinite(n) && n >= 0)) {
    return NextResponse.json({ error: "fee_percent, vat_percent, and fixed_fee_egp must be non-negative numbers" }, { status: 400 });
  }

  const supabase = getAdminSupabaseClient();
  const { data, error } = await supabase
    .from("finance_settings")
    .upsert(
      { id: 1, fee_percent, vat_percent, fixed_fee_egp, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) {
    console.error("finance-settings PUT error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
