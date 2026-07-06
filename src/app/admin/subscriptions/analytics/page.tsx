"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FinanceTrendChart } from "@/components/admin/FinanceTrendChart";

type FinanceReport = {
  settings: { fee_percent: number; vat_percent: number; fixed_fee_egp: number };
  totals: {
    gross: number;
    subs_gross: number;
    certs_gross: number;
    fees: number;
    net_after_fees: number;
    expenses_total: number;
    net_profit: number;
    active_subscribers: number;
    paid_subs_count: number;
    arpu: number;
  };
  monthly: Array<{
    month: string;
    gross: number;
    fees: number;
    net: number;
    expenses: number;
    profit: number;
    paid_count: number;
  }>;
  by_plan: Array<{ plan_name: string; gross: number; count: number }>;
  by_payment_method: Array<{ method: string; gross: number; count: number; fees: number }>;
};

function egp(n: number): string {
  return `${Math.round(n).toLocaleString()} EGP`;
}

function StatTile({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p
        className={`text-2xl font-semibold mt-1 ${
          tone === "positive" ? "text-green-700" : tone === "negative" ? "text-red-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function SubscriptionAnalyticsPage() {
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [feeForm, setFeeForm] = useState({ fee_percent: "", vat_percent: "", fixed_fee_egp: "" });
  const [savingSettings, setSavingSettings] = useState(false);

  const loadReport = async () => {
    try {
      const res = await fetch("/api/admin/finance-report", { cache: "no-store" });
      if (!res.ok) {
        toast.error("Failed to load finance report");
        return;
      }
      const json = (await res.json()) as FinanceReport;
      setReport(json);
      setFeeForm({
        fee_percent: String(json.settings.fee_percent),
        vat_percent: String(json.settings.vat_percent),
        fixed_fee_egp: String(json.settings.fixed_fee_egp),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, []);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/finance-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fee_percent: parseFloat(feeForm.fee_percent),
          vat_percent: parseFloat(feeForm.vat_percent),
          fixed_fee_egp: parseFloat(feeForm.fixed_fee_egp),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to save fee settings");
        return;
      }
      toast.success("Fee settings saved");
      await loadReport();
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/admin/subscriptions" className="text-teal-600 hover:text-teal-700 text-sm">
          ← Back to Subscriptions
        </Link>
        <Link href="/admin/expenses" className="text-teal-600 hover:text-teal-700 text-sm font-medium">
          Manage Expenses →
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Revenue Analytics</h1>
        <p className="text-slate-500 mb-6">
          Gross income, estimated Kashier gateway fees, logged expenses, and actual earnings.
        </p>

        {loading && <p className="text-sm text-slate-500">Loading report...</p>}

        {!loading && !report && <p className="text-sm text-red-600">Failed to load finance report.</p>}

        {!loading && report && (
          <div className="space-y-8">
            {/* Stat tiles */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile label="Gross revenue" value={egp(report.totals.gross)} />
              <StatTile label="Gateway fees (est.)" value={egp(report.totals.fees)} tone="negative" />
              <StatTile label="Net revenue (after fees)" value={egp(report.totals.net_after_fees)} />
              <StatTile label="Total expenses" value={egp(report.totals.expenses_total)} tone="negative" />
              <StatTile
                label="Actual earnings"
                value={egp(report.totals.net_profit)}
                tone={report.totals.net_profit >= 0 ? "positive" : "negative"}
              />
              <StatTile label="Active paid subscribers" value={String(report.totals.active_subscribers)} />
              <StatTile label="All-time paid subscriptions" value={String(report.totals.paid_subs_count)} />
              <StatTile label="ARPU (per paid subscription)" value={egp(report.totals.arpu)} />
            </div>

            {/* Fee settings */}
            <div className="rounded-lg border border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-900 mb-1">Kashier fee settings</h2>
              <p className="text-xs text-slate-500 mb-3">
                Kashier doesn&apos;t expose per-transaction fees via API — these rates are used to estimate
                gateway fees. Seeded from a real Kashier receipt (299 EGP → 9.47 EGP fee → 10.80 EGP after
                14% VAT). Edit if your rate changes.
              </p>
              <div className="flex flex-wrap items-end gap-4">
                <label className="text-sm text-slate-700">
                  Fee %
                  <input
                    type="number"
                    step="0.01"
                    value={feeForm.fee_percent}
                    onChange={(e) => setFeeForm((f) => ({ ...f, fee_percent: e.target.value }))}
                    className="mt-1 block w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  VAT %
                  <input
                    type="number"
                    step="0.01"
                    value={feeForm.vat_percent}
                    onChange={(e) => setFeeForm((f) => ({ ...f, vat_percent: e.target.value }))}
                    className="mt-1 block w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  Fixed fee (EGP)
                  <input
                    type="number"
                    step="0.01"
                    value={feeForm.fixed_fee_egp}
                    onChange={(e) => setFeeForm((f) => ({ ...f, fixed_fee_egp: e.target.value }))}
                    className="mt-1 block w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </label>
                <button
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="rounded-md bg-teal-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {savingSettings ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            {/* Monthly trend */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Last 12 months</h2>
              <FinanceTrendChart monthly={report.monthly} />
            </div>

            {/* Breakdowns */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Revenue by plan</h2>
                {report.by_plan.length === 0 ? (
                  <p className="text-sm text-slate-500">No paid subscriptions yet.</p>
                ) : (
                  <div className="space-y-2">
                    {report.by_plan.map((p) => (
                      <div
                        key={p.plan_name}
                        className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-sm"
                      >
                        <span className="font-medium text-slate-800">{p.plan_name}</span>
                        <span className="text-slate-600">
                          {egp(p.gross)} · {p.count} paid
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Revenue by payment method</h2>
                {report.by_payment_method.length === 0 ? (
                  <p className="text-sm text-slate-500">No paid subscriptions yet.</p>
                ) : (
                  <div className="space-y-2">
                    {report.by_payment_method.map((p) => (
                      <div
                        key={p.method}
                        className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-sm"
                      >
                        <span className="font-medium text-slate-800 capitalize">{p.method}</span>
                        <span className="text-slate-600">
                          {egp(p.gross)} · {p.count} paid · fees {egp(p.fees)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
