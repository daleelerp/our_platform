import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type FeedbackRequestStatus =
  | "scheduled"
  | "shown"
  | "submitted"
  | "dismissed"
  | "expired";

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

/** Hours after purchase before the review modal may appear. Set to 0 in .env for immediate testing. */
function getScheduleDelayMs(): number {
  const raw = process.env.FEEDBACK_SCHEDULE_DELAY_HOURS;
  if (raw === undefined || raw === "") return TWO_DAYS_MS;
  const h = Number(raw);
  if (!Number.isFinite(h) || h < 0) return TWO_DAYS_MS;
  return h * 60 * 60 * 1000;
}

const serviceRoleClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getFeedbackClient(client?: SupabaseClient): SupabaseClient {
  return client ?? serviceRoleClient;
}

function scheduleFeedbackAt(isoTimestamp?: string | null): string {
  const base = isoTimestamp ? new Date(isoTimestamp).getTime() : Date.now();
  return new Date(base + getScheduleDelayMs()).toISOString();
}

export async function ensureFeedbackRequestForPurchase(params: {
  userId: string;
  planId: string;
  purchaseId: string;
  purchaseTime?: string | null;
  client?: SupabaseClient;
}): Promise<void> {
  const client = getFeedbackClient(params.client);

  await client.from("student_feedback_requests").upsert(
    {
      user_id: params.userId,
      plan_id: params.planId,
      purchase_id: params.purchaseId,
      scheduled_at: scheduleFeedbackAt(params.purchaseTime),
      status: "scheduled" as FeedbackRequestStatus,
    },
    {
      onConflict: "purchase_id",
      ignoreDuplicates: true,
    }
  );
}

export function isUserInFeedbackRollout(
  userId: string,
  rolloutPercent: number
): boolean {
  const normalized = Math.min(100, Math.max(0, rolloutPercent));
  if (normalized === 0) return false;
  if (normalized === 100) return true;

  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  const bucket = hash % 100;
  return bucket < normalized;
}
