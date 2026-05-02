import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * After a successful paid activation, record promo usage and bump global `current_uses`.
 * Safe under duplicate webhooks: DB function only increments when the usage row is new.
 */
export async function recordDiscountUsageAfterSuccessfulPayment(
  supabase: SupabaseClient,
  row: { id: string; user_id: string; applied_discount_id?: string | null }
): Promise<void> {
  const discountId = row.applied_discount_id;
  if (!discountId) return;

  const { error } = await supabase.rpc("record_discount_usage_after_payment", {
    p_user_id: row.user_id,
    p_subscription_id: row.id,
    p_discount_id: discountId,
  });

  if (error) {
    console.error(
      "[discount usage] record_discount_usage_after_payment failed — run docs/sql/migrations/add_discount_usage_after_payment.sql on Supabase:",
      error.message
    );
  }
}
