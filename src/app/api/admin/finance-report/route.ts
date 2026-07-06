import { NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

const DEFAULT_FEE_SETTINGS = { fee_percent: 3.17, vat_percent: 14, fixed_fee_egp: 0 };
const MONTHS_BACK = 12;

/** Fee charged by the gateway on a single transaction, including VAT on top of the fee. */
function feeForAmount(
  amount: number,
  settings: { fee_percent: number; vat_percent: number; fixed_fee_egp: number }
): number {
  const baseFee = (amount * settings.fee_percent) / 100 + settings.fixed_fee_egp;
  return baseFee * (1 + settings.vat_percent / 100);
}

function monthKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 7); // "YYYY-MM"
}

function lastMonthKeys(n: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(d.toISOString().slice(0, 7));
  }
  return keys;
}

export async function GET() {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminSupabaseClient();

  const [{ data: settingsRow }, { data: subsRows, error: subsError }, { data: certRows, error: certError }, { data: expenseRows, error: expenseError }] =
    await Promise.all([
      supabase.from("finance_settings").select("*").eq("id", 1).maybeSingle(),
      supabase
        .from("user_subscriptions")
        .select("id, status, payment_method, price_locked_egp, started_at, plan_id, subscription_plans(display_name_en, name, payment_type)")
        .in("payment_method", ["card", "wallet"]),
      supabase
        .from("user_certification_purchases")
        .select("id, amount_paid_egp, created_at, status")
        .eq("status", "paid"),
      supabase.from("expenses").select("id, category, amount_egp, expense_date"),
    ]);

  if (subsError || certError || expenseError) {
    console.error("finance-report error:", subsError || certError || expenseError);
    return NextResponse.json(
      { error: (subsError || certError || expenseError)?.message || "Failed to load finance report" },
      { status: 500 }
    );
  }

  const settings = {
    fee_percent: Number(settingsRow?.fee_percent ?? DEFAULT_FEE_SETTINGS.fee_percent),
    vat_percent: Number(settingsRow?.vat_percent ?? DEFAULT_FEE_SETTINGS.vat_percent),
    fixed_fee_egp: Number(settingsRow?.fixed_fee_egp ?? DEFAULT_FEE_SETTINGS.fixed_fee_egp),
  };

  type PlanRelation = { display_name_en?: string | null; name?: string | null };
  type SubRow = {
    price_locked_egp: number | string | null;
    status: string | null;
    payment_method: string | null;
    started_at: string | null;
    subscription_plans: PlanRelation | PlanRelation[] | null;
  };
  type CertRow = { amount_paid_egp: number | string | null; created_at: string | null };
  type ExpenseRow = { amount_egp: number | string | null; category: string | null; expense_date: string | null };

  const paidSubs = ((subsRows ?? []) as SubRow[]).map((row) => {
    const plan = Array.isArray(row.subscription_plans) ? row.subscription_plans[0] : row.subscription_plans;
    const amount = Number(row.price_locked_egp) || 0;
    return {
      amount,
      fee: feeForAmount(amount, settings),
      status: String(row.status ?? ""),
      payment_method: String(row.payment_method ?? ""),
      plan_name: plan?.display_name_en || plan?.name || "Unknown plan",
      month: monthKey(row.started_at),
    };
  });

  const paidCerts = ((certRows ?? []) as CertRow[]).map((row) => {
    const amount = Number(row.amount_paid_egp) || 0;
    return {
      amount,
      fee: feeForAmount(amount, settings),
      month: monthKey(row.created_at),
    };
  });

  const expenses = ((expenseRows ?? []) as ExpenseRow[]).map((row) => ({
    amount: Number(row.amount_egp) || 0,
    category: String(row.category ?? "other"),
    month: monthKey(row.expense_date),
  }));

  const subsGross = paidSubs.reduce((s, r) => s + r.amount, 0);
  const certsGross = paidCerts.reduce((s, r) => s + r.amount, 0);
  const gross = subsGross + certsGross;

  const fees = paidSubs.reduce((s, r) => s + r.fee, 0) + paidCerts.reduce((s, r) => s + r.fee, 0);
  const netAfterFees = gross - fees;
  const expensesTotal = expenses.reduce((s, r) => s + r.amount, 0);
  const netProfit = netAfterFees - expensesTotal;

  const activeSubscribers = paidSubs.filter((r) => r.status === "active").length;
  const paidSubsCount = paidSubs.length;
  const arpu = paidSubsCount > 0 ? subsGross / paidSubsCount : 0;

  // Breakdown by plan
  const byPlanMap = new Map<string, { gross: number; count: number }>();
  for (const r of paidSubs) {
    const existing = byPlanMap.get(r.plan_name) ?? { gross: 0, count: 0 };
    existing.gross += r.amount;
    existing.count += 1;
    byPlanMap.set(r.plan_name, existing);
  }
  const byPlan = Array.from(byPlanMap.entries())
    .map(([plan_name, v]) => ({ plan_name, gross: v.gross, count: v.count }))
    .sort((a, b) => b.gross - a.gross);

  // Breakdown by payment method
  const byMethodMap = new Map<string, { gross: number; count: number; fees: number }>();
  for (const r of paidSubs) {
    const existing = byMethodMap.get(r.payment_method) ?? { gross: 0, count: 0, fees: 0 };
    existing.gross += r.amount;
    existing.count += 1;
    existing.fees += r.fee;
    byMethodMap.set(r.payment_method, existing);
  }
  const byPaymentMethod = Array.from(byMethodMap.entries())
    .map(([method, v]) => ({ method, gross: v.gross, count: v.count, fees: v.fees }))
    .sort((a, b) => b.gross - a.gross);

  // Monthly series (last 12 months, zero-filled)
  const months = lastMonthKeys(MONTHS_BACK);
  const monthly = months.map((month) => {
    const monthGrossSubs = paidSubs.filter((r) => r.month === month).reduce((s, r) => s + r.amount, 0);
    const monthGrossCerts = paidCerts.filter((r) => r.month === month).reduce((s, r) => s + r.amount, 0);
    const monthGross = monthGrossSubs + monthGrossCerts;
    const monthFees =
      paidSubs.filter((r) => r.month === month).reduce((s, r) => s + r.fee, 0) +
      paidCerts.filter((r) => r.month === month).reduce((s, r) => s + r.fee, 0);
    const monthExpenses = expenses.filter((r) => r.month === month).reduce((s, r) => s + r.amount, 0);
    const paidCount =
      paidSubs.filter((r) => r.month === month).length + paidCerts.filter((r) => r.month === month).length;

    return {
      month,
      gross: monthGross,
      fees: monthFees,
      net: monthGross - monthFees,
      expenses: monthExpenses,
      profit: monthGross - monthFees - monthExpenses,
      paid_count: paidCount,
    };
  });

  return NextResponse.json({
    settings,
    totals: {
      gross,
      subs_gross: subsGross,
      certs_gross: certsGross,
      fees,
      net_after_fees: netAfterFees,
      expenses_total: expensesTotal,
      net_profit: netProfit,
      active_subscribers: activeSubscribers,
      paid_subs_count: paidSubsCount,
      arpu,
    },
    monthly,
    by_plan: byPlan,
    by_payment_method: byPaymentMethod,
  });
}
