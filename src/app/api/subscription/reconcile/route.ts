import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient } from "@supabase/supabase-js";

/**
 * For logged-in users: re-run Kashier verification for each distinct pending session.
 * Fixes stuck "pending" after successful payment when webhook/callback missed or verify used wrong API host.
 */
export async function POST(request: Request) {
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

    const reqUrl = new URL(request.url);
    const origin =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
      `${reqUrl.protocol}//${reqUrl.host}`;

    if (sessionIds.length === 0) {
      return NextResponse.json({ ok: true, checked: 0, sessions: [] });
    }

    const results: { sessionId: string; status: unknown }[] = [];

    for (const sessionId of sessionIds) {
      const res = await fetch(
        `${origin}/api/subscription/verify?session_id=${encodeURIComponent(sessionId)}`,
        { cache: "no-store" }
      );
      let json: unknown = null;
      try {
        json = await res.json();
      } catch {
        json = { error: "invalid_json" };
      }
      results.push({
        sessionId,
        status: typeof json === "object" && json !== null && "status" in json
          ? (json as { status: unknown }).status
          : json,
      });
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
