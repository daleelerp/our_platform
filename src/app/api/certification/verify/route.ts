import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { getKashierApiBaseUrl, extractKashierPaymentStatus } from "@/lib/kashier";

const KASHIER_API_KEY = process.env.KASHIER_API_KEY;
const KASHIER_SECRET_KEY = process.env.KASHIER_SECRET_KEY;

const adminSupabase = createServiceRoleClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id") || searchParams.get("sessionId") || searchParams.get("_id");
    const examId = searchParams.get("examId");

    if (!sessionId) {
      return NextResponse.json({ error: "session_id is required" }, { status: 400 });
    }

    // Find the purchase record
    const { data: purchase } = await adminSupabase
      .from("user_certification_purchases")
      .select("*")
      .eq("kashier_session_id", sessionId)
      .maybeSingle();

    if (!purchase) {
      return NextResponse.json({ status: "pending" });
    }

    if (purchase.status === "paid") {
      return NextResponse.json({ status: "success", purchase });
    }

    if (purchase.status === "failed") {
      return NextResponse.json({ status: "failed" });
    }

    // Verify with Kashier
    if (!KASHIER_API_KEY || !KASHIER_SECRET_KEY) {
      return NextResponse.json({ status: "pending" });
    }

    const KASHIER_BASE_URL = getKashierApiBaseUrl();
    const kashierRes = await fetch(`${KASHIER_BASE_URL}/v3/payment/sessions/${sessionId}`, {
      headers: {
        Authorization: KASHIER_SECRET_KEY,
        "api-key": KASHIER_API_KEY,
      },
      cache: "no-store",
    });

    if (!kashierRes.ok) {
      return NextResponse.json({ status: "pending" });
    }

    const kashierData = await kashierRes.json();
    const rawStatus = extractKashierPaymentStatus(kashierData);

    const SUCCESS_STATUSES = new Set(["SUCCESS", "PAID", "CAPTURED", "COMPLETED", "AUTHORIZED", "SETTLED", "APPROVED"]);
    const FAILURE_STATUSES = new Set(["FAILED", "CANCELLED", "REJECTED", "DECLINED", "VOIDED", "EXPIRED"]);

    if (SUCCESS_STATUSES.has(rawStatus)) {
      const transactionId = kashierData?.data?.transaction?.transactionId || kashierData?._id || sessionId;

      // Activate the purchase
      await adminSupabase
        .from("user_certification_purchases")
        .update({
          status: "paid",
          kashier_transaction_id: transactionId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", purchase.id);

      return NextResponse.json({ status: "success", purchase: { ...purchase, status: "paid" } });
    }

    if (FAILURE_STATUSES.has(rawStatus)) {
      await adminSupabase
        .from("user_certification_purchases")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", purchase.id);

      return NextResponse.json({ status: "failed" });
    }

    return NextResponse.json({ status: "pending" });
  } catch (error: any) {
    console.error("Certification verify error:", error);
    return NextResponse.json({ status: "pending" });
  }
}
