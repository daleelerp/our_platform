import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";

const adminSupabase = createServiceRoleClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
      promoCode,
      planId,
      billingCycle,
      amount,
    }: { promoCode?: string; planId?: string; billingCycle?: string; amount?: number } =
      await request.json();

    if (!promoCode || !planId || !billingCycle || typeof amount !== "number") {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const normalizedCode = promoCode.toUpperCase().trim();
    const { data: plan } = await adminSupabase
      .from("subscription_plans")
      .select("id, payment_type, price_one_time_egp, price_monthly_egp, price_yearly_egp")
      .eq("id", planId)
      .maybeSingle();
    const isOneTimePlan = !!plan && (
      plan.payment_type === "one_time" ||
      ((plan.price_one_time_egp || 0) > 0 &&
        (plan.price_monthly_egp || 0) === 0 &&
        (plan.price_yearly_egp || 0) === 0)
    );

    const { data: discount } = await adminSupabase
      .from("subscription_discounts")
      .select("*")
      .eq("code", normalizedCode)
      .eq("is_active", true)
      .maybeSingle();

    if (!discount) {
      return NextResponse.json({ error: "invalid_or_inactive_code" }, { status: 400 });
    }

    const now = new Date();
    const validFrom = discount.valid_from ? new Date(discount.valid_from) : null;
    const validUntil = discount.valid_until ? new Date(discount.valid_until) : null;
    if ((validFrom && now < validFrom) || (validUntil && now > validUntil)) {
      return NextResponse.json({ error: "code_not_in_valid_time_window" }, { status: 400 });
    }

    if (Array.isArray(discount.applicable_plans) && discount.applicable_plans.length > 0) {
      const normalizedPlanId = String(planId).trim().toLowerCase();
      const normalizedApplicablePlanIds = discount.applicable_plans
        .map((id: unknown) => String(id || "").trim().toLowerCase())
        .filter((id: string) => id.length > 0);
      if (!normalizedApplicablePlanIds.includes(normalizedPlanId)) {
        return NextResponse.json(
          {
            error: "code_not_applicable_to_plan",
            requestedPlanId: planId,
            matchedPlanId: plan?.id || null,
            applicablePlans: discount.applicable_plans,
          },
          { status: 400 }
        );
      }
    }

    if (Array.isArray(discount.applicable_cycles) && discount.applicable_cycles.length > 0) {
      if (isOneTimePlan) {
        const allowsOneTime =
          discount.applicable_cycles.includes("one_time") ||
          discount.applicable_cycles.includes("monthly") ||
          discount.applicable_cycles.includes("yearly");
        if (!allowsOneTime) {
          return NextResponse.json({ error: "code_not_applicable_to_billing_cycle" }, { status: 400 });
        }
      } else if (!discount.applicable_cycles.includes(billingCycle)) {
        return NextResponse.json({ error: "code_not_applicable_to_billing_cycle" }, { status: 400 });
      }
    }

    if (typeof discount.min_amount_egp === "number" && amount < discount.min_amount_egp) {
      return NextResponse.json(
        {
          error: "minimum_amount_not_met",
          minAmount: discount.min_amount_egp,
        },
        { status: 400 }
      );
    }

    if (discount.max_uses && discount.current_uses >= discount.max_uses) {
      return NextResponse.json({ error: "max_usage_reached" }, { status: 400 });
    }

    if (discount.max_uses_per_user && discount.max_uses_per_user > 0) {
      const { data: usageRows } = await adminSupabase
        .from("user_discount_usage")
        .select("subscription_id")
        .eq("user_id", user.id)
        .eq("discount_id", discount.id);

      const usageSubscriptionIds = (usageRows || [])
        .map((row: any) => row.subscription_id as string | null)
        .filter((id: string | null): id is string => !!id);

      let successfulUsageCount = 0;
      if (usageSubscriptionIds.length > 0) {
        const { count } = await adminSupabase
          .from("user_subscriptions")
          .select("id", { count: "exact", head: true })
          .in("id", usageSubscriptionIds)
          .in("status", ["active", "trial", "paused", "expired"]);
        successfulUsageCount = count || 0;
      }

      if (successfulUsageCount >= discount.max_uses_per_user) {
        return NextResponse.json({ error: "user_usage_limit_reached" }, { status: 400 });
      }
    }

    if (discount.requires_first_subscription) {
      const { count } = await adminSupabase
        .from("user_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("status", ["active", "trial", "paused", "expired"]);
      if ((count || 0) > 0) {
        return NextResponse.json({ error: "first_subscription_only" }, { status: 400 });
      }
    }

    let discountedAmount = amount;
    if (discount.type === "percentage") {
      discountedAmount = Math.max(0, Math.round(amount * (1 - discount.value / 100)));
    } else if (discount.type === "fixed") {
      discountedAmount = Math.max(0, amount - discount.value);
    }

    return NextResponse.json({
      success: true,
      discount: {
        id: discount.id,
        code: discount.code,
        type: discount.type,
        value: discount.value,
      },
      discountedAmount,
      discountValue: Math.max(0, amount - discountedAmount),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "discount_validation_failed", details: error?.message || "unknown_error" },
      { status: 500 }
    );
  }
}
