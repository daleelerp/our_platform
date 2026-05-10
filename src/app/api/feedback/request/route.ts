import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import {
  isUserInFeedbackRollout,
  syncFeedbackRequestsForUserSubscriptions,
} from "@/lib/studentFeedback";

const DEFAULT_ROLLOUT_PERCENT = 100;
const DEFAULT_SNOOZE_DAYS = 2;
const MAX_PROMPT_ATTEMPTS = 2;

function getRolloutPercent(): number {
  const raw = Number(process.env.FEEDBACK_ROLLOUT_PERCENT ?? DEFAULT_ROLLOUT_PERCENT);
  if (!Number.isFinite(raw)) return DEFAULT_ROLLOUT_PERCENT;
  return Math.max(0, Math.min(100, raw));
}

function getSnoozeDays(): number {
  return DEFAULT_SNOOZE_DAYS;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rolloutPercent = getRolloutPercent();
    if (!isUserInFeedbackRollout(user.id, rolloutPercent)) {
      return NextResponse.json({ request: null, rollout: false });
    }

    try {
      await syncFeedbackRequestsForUserSubscriptions(user.id);
    } catch (syncErr) {
      console.error("Feedback subscription sync error:", syncErr);
    }

    const nowIso = new Date().toISOString();
    const { data: requestRow, error } = await supabase
      .from("student_feedback_requests")
      .select("id, purchase_id, plan_id, scheduled_at, status, prompt_attempts")
      .eq("user_id", user.id)
      .lte("scheduled_at", nowIso)
      .or(`snoozed_until.is.null,snoozed_until.lte.${nowIso}`)
      .in("status", ["scheduled", "shown"])
      .order("scheduled_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Failed to load feedback request" }, { status: 500 });
    }
    if (!requestRow) {
      return NextResponse.json({ request: null, rollout: true });
    }

    if ((requestRow.prompt_attempts ?? 0) >= MAX_PROMPT_ATTEMPTS) {
      await supabase
        .from("student_feedback_requests")
        .update({ status: "expired" })
        .eq("id", requestRow.id);
      return NextResponse.json({ request: null, rollout: true });
    }

    if (requestRow.status !== "shown") {
      await supabase
        .from("student_feedback_requests")
        .update({ shown_at: nowIso, status: "shown" })
        .eq("id", requestRow.id);
    }

    const { data: planRow } = await supabase
      .from("subscription_plans")
      .select("display_name_en, display_name_ar, name")
      .eq("id", requestRow.plan_id)
      .maybeSingle();

    const request = {
      id: requestRow.id,
      purchase_id: requestRow.purchase_id,
      plan_id: requestRow.plan_id,
      plan_name_en: planRow?.display_name_en ?? planRow?.name ?? null,
      plan_name_ar: planRow?.display_name_ar ?? null,
    };

    return NextResponse.json({ request, rollout: true });
  } catch (error) {
    console.error("Feedback request GET error:", error);
    return NextResponse.json({ error: "Failed to load feedback request" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const requestId = String(body?.requestId ?? "");
    const action = String(body?.action ?? "").toLowerCase();
    if (!requestId || !["skip", "dismiss"].includes(action)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabase
      .from("student_feedback_requests")
      .select("id, prompt_attempts")
      .eq("id", requestId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Feedback request not found" }, { status: 404 });
    }

    const attempts = Number(existing.prompt_attempts ?? 0) + 1;
    const now = new Date();
    const snoozeDate = new Date(now.getTime() + getSnoozeDays() * 24 * 60 * 60 * 1000);

    const shouldExpire = attempts >= MAX_PROMPT_ATTEMPTS;
    const updatePayload = shouldExpire
      ? {
          status: "expired",
          dismissed_at: now.toISOString(),
          prompt_attempts: attempts,
        }
      : {
          status: "scheduled",
          dismissed_at: now.toISOString(),
          prompt_attempts: attempts,
          snoozed_until: snoozeDate.toISOString(),
        };

    const { error: updateError } = await supabase
      .from("student_feedback_requests")
      .update(updatePayload)
      .eq("id", requestId)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update feedback request" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Feedback request POST error:", error);
    return NextResponse.json({ error: "Failed to update feedback request" }, { status: 500 });
  }
}
