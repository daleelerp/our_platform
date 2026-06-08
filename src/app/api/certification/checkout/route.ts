import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { getKashierApiBaseUrl } from "@/lib/kashier";

const KASHIER_API_KEY = process.env.KASHIER_API_KEY;
const KASHIER_SECRET_KEY = process.env.KASHIER_SECRET_KEY;
const KASHIER_MERCHANT_ID = process.env.KASHIER_MERCHANT_ID;
const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://www.daleel.site");

const adminSupabase = createServiceRoleClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { examId } = await request.json();
    if (!examId) {
      return NextResponse.json({ error: "examId is required" }, { status: 400 });
    }

    // Fetch exam
    const { data: exam, error: examError } = await adminSupabase
      .from("certification_exams")
      .select("*, subscription_plans(id, display_name_en)")
      .eq("id", examId)
      .eq("is_active", true)
      .single();

    if (examError || !exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Check user has an active subscription for this plan
    const { data: subscription } = await adminSupabase
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("plan_id", exam.plan_id)
      .in("status", ["active", "trial", "paused"])
      .limit(1)
      .maybeSingle();

    if (!subscription) {
      return NextResponse.json(
        { error: "You must be subscribed to this plan before purchasing the certification exam." },
        { status: 403 }
      );
    }

    // Check if already paid
    const { data: existingPurchase } = await adminSupabase
      .from("user_certification_purchases")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("exam_id", examId)
      .maybeSingle();

    if (existingPurchase?.status === "paid") {
      return NextResponse.json({
        success: true,
        redirectUrl: `/plans/${exam.plan_id}?exam=already_purchased`,
      });
    }

    // Cancel any pending purchase for this exam so user can retry
    if (existingPurchase?.status === "pending") {
      await adminSupabase
        .from("user_certification_purchases")
        .update({ status: "failed" })
        .eq("id", existingPurchase.id);
    }

    if (!KASHIER_API_KEY || !KASHIER_MERCHANT_ID || !KASHIER_SECRET_KEY) {
      return NextResponse.json({ error: "Payment gateway not configured" }, { status: 503 });
    }

    const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user.id).single();

    const orderId = `daleel-cert-${user.id.slice(0, 8)}-${Date.now()}`;
    const planName = (exam.subscription_plans as any)?.display_name_en || "Plan";
    const description = `${planName} — Certification Exam`;

    const expireAt = new Date();
    expireAt.setHours(expireAt.getHours() + 24);

    const sessionData = {
      expireAt: expireAt.toISOString(),
      maxFailureAttempts: 3,
      paymentType: "credit",
      amount: Number(exam.price_egp).toFixed(2),
      currency: "EGP",
      order: orderId,
      merchantId: KASHIER_MERCHANT_ID,
      merchantRedirect: `${BASE_URL}/payment/callback?provider=kashier&type=certification&examId=${examId}&planId=${exam.plan_id}`,
      display: "en",
      type: "one-time",
      allowedMethods: "card,wallet",
      redirectMethod: null,
      iframeBackgroundColor: "#FFFFFF",
      metaData: { customKey: "daleel_certification", examId, planId: exam.plan_id },
      failureRedirect: false,
      brandColor: "#FF5733",
      defaultMethod: "card",
      description,
      manualCapture: false,
      customer: {
        email: user.email || "",
        reference: user.id,
      },
      saveCard: "optional",
      retrieveSavedCard: true,
      interactionSource: "ECOMMERCE",
      enable3DS: true,
      serverWebhook: `${BASE_URL}/api/certification/webhook`,
      notes: `Certification exam purchase for ${planName}`,
    };

    const KASHIER_BASE_URL = getKashierApiBaseUrl();
    const sessionResponse = await fetch(`${KASHIER_BASE_URL}/v3/payment/sessions`, {
      method: "POST",
      headers: {
        Authorization: KASHIER_SECRET_KEY,
        "api-key": KASHIER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sessionData),
    });

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error("Kashier session creation failed:", errorText);
      let msg = "Failed to create payment session";
      try { msg = JSON.parse(errorText)?.message || msg; } catch {}
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const sessionResult = await sessionResponse.json();
    const sessionId = sessionResult._id;
    const sessionUrl = sessionResult.sessionUrl;

    // Create pending purchase record
    await adminSupabase.from("user_certification_purchases").insert({
      user_id: user.id,
      exam_id: examId,
      amount_paid_egp: exam.price_egp,
      kashier_session_id: sessionId,
      kashier_order_id: orderId,
      status: "pending",
    });

    return NextResponse.json({ success: true, sessionUrl, sessionId });
  } catch (error: any) {
    console.error("Certification checkout error:", error);
    return NextResponse.json({ error: error.message || "Checkout failed" }, { status: 500 });
  }
}
