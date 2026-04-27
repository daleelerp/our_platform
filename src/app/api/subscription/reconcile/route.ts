import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { verifyKashierSessionAndSyncDb } from "@/lib/kashierSubscriptionVerification";

/**
 * For logged-in users: re-run Kashier verification for each distinct pending session.
 * Fixes stuck "pending" after successful payment when webhook/callback missed or verify used wrong API host.
 *
 * Calls Kashier synchronously on the server (no HTTP loopback to /verify) so it is faster and more reliable on Vercel.
 */
export async function POST(_request: Request) {
  try {
    const cookieStore = await cookies();
    const userClient = createServerClient(cookieStore);
    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: pendingRows } = await admin
      .from("user_subscriptions")
      .select("external_subscription_id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .not("external_subscription_id", "is", null);

    const sessionIds = Array.from(
      new Set(
        (pendingRows || [])
          .map((r) => r.external_subscription_id)
          .filter((id): id is string => !!id)
      )
    );

    if (sessionIds.length === 0) {
      return NextResponse.json({ ok: true, checked: 0, sessions: [] });
    }

    const results: { sessionId: string; status: unknown }[] = [];

    for (const sessionId of sessionIds) {
      const json = await verifyKashierSessionAndSyncDb({ sessionId });
      const status =
        typeof json === "object" &&
        json !== null &&
        "status" in json &&
        typeof (json as { status: unknown }).status !== "undefined"
          ? (json as { status: unknown }).status
          : json;
      results.push({ sessionId, status });
    }

    return NextResponse.json({
      ok: true,
      checked: sessionIds.length,
      sessions: results,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Reconcile failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
