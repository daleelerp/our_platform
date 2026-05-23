"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { GeneratedPath } from "@/services/pathGenerator";
import { EditablePathView } from "./EditablePathView";

type WizardStep = "erp" | "plan" | "generate" | "review" | "done";
type BudgetTier = "free" | "basic" | "premium";
type Audience = "technical" | "business_functional" | "business_consultant" | "all";

type ErpRow = { id: string; name: string; description?: string; is_active?: boolean };
type PlanRow = { id: string; name: string; display_name_en?: string; display_name_ar?: string; target_audience?: string; is_active?: boolean };

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "erp", label: "ERP System" },
  { key: "plan", label: "Plan" },
  { key: "generate", label: "Generate Path" },
  { key: "review", label: "Review & Save" },
];

const AUDIENCE_LABELS: Record<string, string> = {
  technical: "Technical",
  business_functional: "Functional",
  business_consultant: "Consultant",
  all: "All Learners",
};

function StepIndicator({ current }: { current: WizardStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                  done
                    ? "bg-[#429874] border-[#429874] text-white"
                    : active
                    ? "border-[#429874] text-[#429874] bg-white"
                    : "border-slate-300 text-slate-400 bg-white"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span className={`mt-1 text-xs font-medium ${active ? "text-[#429874]" : done ? "text-slate-600" : "text-slate-400"}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mt-[-14px] transition-all ${done ? "bg-[#429874]" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AIContentWizard() {
  const language = useAppStore((s) => s.language) || "en";
  const [step, setStep] = useState<WizardStep>("erp");

  // ── Step 1: ERP ──────────────────────────────────────────────
  const [erpList, setErpList] = useState<ErpRow[]>([]);
  const [erpLoading, setErpLoading] = useState(true);
  const [selectedErpId, setSelectedErpId] = useState<string | null>(null);
  const [selectedErpName, setSelectedErpName] = useState("");
  const [showNewErp, setShowNewErp] = useState(false);
  const [newErpName, setNewErpName] = useState("");
  const [newErpDesc, setNewErpDesc] = useState("");
  const [newErpDescAr, setNewErpDescAr] = useState("");
  const [generatingErpDesc, setGeneratingErpDesc] = useState(false);
  const [savingErp, setSavingErp] = useState(false);

  // ── Step 2: Plan ─────────────────────────────────────────────
  const [planList, setPlanList] = useState<PlanRow[]>([]);
  const [planLoading, setPlanLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedPlanName, setSelectedPlanName] = useState("");
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [planAudience, setPlanAudience] = useState<Audience>("technical");
  const [newPlanDisplayEn, setNewPlanDisplayEn] = useState("");
  const [newPlanDisplayAr, setNewPlanDisplayAr] = useState("");
  const [newPlanDescEn, setNewPlanDescEn] = useState("");
  const [newPlanDescAr, setNewPlanDescAr] = useState("");
  const [newPlanNameEn, setNewPlanNameEn] = useState("");
  const [newPlanNameAr, setNewPlanNameAr] = useState("");
  const [newPlanPaymentType, setNewPlanPaymentType] = useState<"free" | "one_time" | "monthly">("free");
  const [newPlanPrice, setNewPlanPrice] = useState(0);
  const [newPlanLimitations, setNewPlanLimitations] = useState({
    max_paths: 5,
    resources_per_milestone: 10,
    monthly_hours: 40,
    ai_requests: 20,
    downloads: 0,
  });
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planSlug, setPlanSlug] = useState("");

  // ── Step 3: Generate ─────────────────────────────────────────
  const [experienceLevel, setExperienceLevel] = useState<"beginner" | "intermediate" | "advanced" | "expert">("beginner");
  const [budgetTier, setBudgetTier] = useState<BudgetTier>("free");
  const [erpModule, setErpModule] = useState("");
  const [careerGoals, setCareerGoals] = useState("");
  const [timeCommitment, setTimeCommitment] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);

  // ── Step 4: Review ────────────────────────────────────────────
  const [generatedPath, setGeneratedPath] = useState<GeneratedPath | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Step 5: Done ──────────────────────────────────────────────
  const [savedPathId, setSavedPathId] = useState<string | null>(null);

  // Load ERP list on mount
  useEffect(() => {
    setErpLoading(true);
    fetch("/api/admin/data?table=erp_systems&limit=200")
      .then((r) => r.json())
      .then((d) => { if (d.data) setErpList(d.data); })
      .finally(() => setErpLoading(false));
  }, []);

  // Load plans when entering plan step
  useEffect(() => {
    if (step !== "plan") return;
    setPlanLoading(true);
    fetch("/api/admin/data?table=subscription_plans&limit=200")
      .then((r) => r.json())
      .then((d) => { if (d.data) setPlanList(d.data); })
      .finally(() => setPlanLoading(false));
  }, [step]);

  // ── ERP Step handlers ────────────────────────────────────────

  function selectErp(erp: ErpRow) {
    setSelectedErpId(erp.id);
    setSelectedErpName(erp.name);
    setShowNewErp(false);
  }

  async function handleGenerateErpDescription() {
    if (!newErpName.trim()) return;
    setGeneratingErpDesc(true);
    try {
      const res = await fetch("/api/admin/ai-generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ erpName: newErpName, targetAudience: "all" }),
      });
      const d = await res.json();
      if (d.plan) {
        setNewErpDesc(`${newErpName} is an enterprise resource planning (ERP) system. ${d.plan.description_en || ""}`);
        setNewErpDescAr(d.plan.description_ar || "");
      }
    } catch {}
    setGeneratingErpDesc(false);
  }

  async function handleCreateErp() {
    if (!newErpName.trim()) return;
    setSavingErp(true);
    try {
      const res = await fetch("/api/admin/data?table=erp_systems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newErpName.trim(),
          description: newErpDesc,
          description_ar: newErpDescAr,
          is_active: true,
          priority_order: erpList.length + 1,
        }),
      });
      const d = await res.json();
      if (d.data) {
        const newErp = d.data as ErpRow;
        setErpList((prev) => [...prev, newErp]);
        selectErp(newErp);
        setShowNewErp(false);
        setNewErpName("");
        setNewErpDesc("");
        setNewErpDescAr("");
      }
    } catch {}
    setSavingErp(false);
  }

  // ── Plan Step handlers ───────────────────────────────────────

  function selectPlan(plan: PlanRow) {
    setSelectedPlanId(plan.id);
    setSelectedPlanName(plan.display_name_en || plan.name);
    setShowNewPlan(false);
  }

  async function handleGeneratePlanContent() {
    setGeneratingPlan(true);
    try {
      const res = await fetch("/api/admin/ai-generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ erpName: selectedErpName, targetAudience: planAudience, budgetTier }),
      });
      const d = await res.json();
      if (d.plan) {
        setNewPlanNameEn(d.plan.name_en || "");
        setNewPlanNameAr(d.plan.name_ar || "");
        setNewPlanDisplayEn(d.plan.display_name_en || "");
        setNewPlanDisplayAr(d.plan.display_name_ar || "");
        setNewPlanDescEn(d.plan.description_en || "");
        setNewPlanDescAr(d.plan.description_ar || "");
        setPlanSlug(d.plan.suggested_slug || `${selectedErpName.toLowerCase().replace(/\s+/g, "-")}-${planAudience}`);
      }
    } catch {}
    setGeneratingPlan(false);
  }

  async function handleCreatePlan() {
    if (!newPlanDisplayEn.trim() || !newPlanNameEn.trim()) return;
    setSavingPlan(true);
    const slug = planSlug.trim() || `${selectedErpName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${planAudience}-${Date.now()}`;

    const priceMonthly = newPlanPaymentType === "monthly" ? newPlanPrice : 0;
    const priceOneTime = newPlanPaymentType === "one_time" ? newPlanPrice : 0;

    try {
      const res = await fetch("/api/admin/data?table=subscription_plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: slug,
          name_en: newPlanNameEn.trim().slice(0, 50),
          name_ar: (newPlanNameAr.trim() || newPlanNameEn.trim()).slice(0, 50),
          display_name_en: newPlanDisplayEn.trim().slice(0, 100),
          display_name_ar: (newPlanDisplayAr.trim() || newPlanDisplayEn.trim()).slice(0, 100),
          description_en: newPlanDescEn,
          description_ar: newPlanDescAr,
          target_audience: planAudience,
          payment_type: newPlanPaymentType,
          price_monthly_egp: priceMonthly,
          price_yearly_egp: 0,
          price_one_time_egp: priceOneTime,
          is_active: true,
          is_popular: false,
          sort_order: planList.length + 1,
          features: [],
          limitations: newPlanLimitations,
          erp_provider_ids: [],
        }),
      });
      const d = await res.json();
      if (d.data) {
        const newPlan = d.data as PlanRow;
        setPlanList((prev) => [...prev, newPlan]);
        selectPlan(newPlan);
        setShowNewPlan(false);
      } else {
        console.error("Plan save error:", d.error);
      }
    } catch (e) {
      console.error("Plan save error:", e);
    }
    setSavingPlan(false);
  }

  // ── Generate Path handler ────────────────────────────────────

  async function handleGeneratePath() {
    setIsGenerating(true);
    setGenerationError(null);

    // Map plan audience to focus area
    const focusMap: Record<string, string> = {
      technical: "technical",
      business_functional: "functional",
      business_consultant: "functional",
      all: "both",
    };

    try {
      const res = await fetch("/api/paths/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          experienceLevel,
          focusArea: focusMap[planAudience] || "both",
          budgetTier,
          erpSystem: selectedErpName,
          erpModule: erpModule || undefined,
          careerGoals: careerGoals ? careerGoals.split(",").map((g) => g.trim()) : undefined,
          timeCommitment,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Generation failed");
      }

      const data = await res.json();
      setGeneratedPath(data.path);
      setSavedDraftId(data.savedPathId || null);
      setStep("review");
    } catch (e: any) {
      setGenerationError(e.message || "Error generating path");
    } finally {
      setIsGenerating(false);
    }
  }

  // ── Save handler ─────────────────────────────────────────────

  async function handleSaveAll(editedPath: GeneratedPath) {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/paths/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: editedPath,
          pathId: savedDraftId,
          planId: selectedPlanId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }

      const data = await res.json();
      setSavedPathId(data.pathId);
      setStep("done");
    } catch (e: any) {
      setSaveError(e.message || "Error saving");
    } finally {
      setIsSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="max-w-4xl">
      {step !== "done" && <StepIndicator current={step} />}

      {/* ── STEP 1: ERP ── */}
      {step === "erp" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Step 1: Choose ERP System</h2>
            <p className="text-sm text-slate-500 mt-1">Select the ERP you want to create content for, or add a new one.</p>
          </div>

          {erpLoading ? (
            <p className="text-slate-500 text-sm">Loading ERP systems...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {erpList.map((erp) => (
                <button
                  key={erp.id}
                  type="button"
                  onClick={() => selectErp(erp)}
                  className={`text-left px-4 py-3 rounded-lg border-2 transition-all ${
                    selectedErpId === erp.id
                      ? "border-[#429874] bg-[#f0f9f6]"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="font-semibold text-slate-900">{erp.name}</div>
                  {erp.description && (
                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{erp.description}</div>
                  )}
                </button>
              ))}

              <button
                type="button"
                onClick={() => { setShowNewErp(true); setSelectedErpId(null); }}
                className={`text-left px-4 py-3 rounded-lg border-2 border-dashed transition-all ${
                  showNewErp ? "border-[#429874] bg-[#f0f9f6]" : "border-slate-300 hover:border-[#429874]"
                }`}
              >
                <div className="font-semibold text-[#429874]">+ Add New ERP</div>
                <div className="text-xs text-slate-500 mt-0.5">Create a new ERP system entry</div>
              </button>
            </div>
          )}

          {/* New ERP form */}
          {showNewErp && (
            <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
              <h3 className="font-semibold text-slate-800">New ERP Details</h3>
              <input
                type="text"
                value={newErpName}
                onChange={(e) => setNewErpName(e.target.value)}
                placeholder="ERP Name (e.g., Odoo, SAP S/4HANA)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGenerateErpDescription}
                  disabled={!newErpName.trim() || generatingErpDesc}
                  className="px-3 py-1.5 text-xs bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
                >
                  {generatingErpDesc ? "Generating..." : "AI Generate Description"}
                </button>
              </div>
              <textarea
                value={newErpDesc}
                onChange={(e) => setNewErpDesc(e.target.value)}
                placeholder="Description (English)"
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#429874]"
              />
              <textarea
                value={newErpDescAr}
                onChange={(e) => setNewErpDescAr(e.target.value)}
                placeholder="الوصف بالعربية"
                rows={2}
                dir="rtl"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#429874]"
              />
              <button
                type="button"
                onClick={handleCreateErp}
                disabled={!newErpName.trim() || savingErp}
                className="px-4 py-2 bg-[#429874] text-white rounded-lg text-sm font-medium hover:bg-[#357a5d] disabled:opacity-50"
              >
                {savingErp ? "Saving..." : "Save ERP & Select"}
              </button>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep("plan")}
              disabled={!selectedErpId}
              className="px-6 py-2.5 bg-[#429874] text-white rounded-lg font-semibold hover:bg-[#357a5d] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Continue to Plan →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: PLAN ── */}
      {step === "plan" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Step 2: Choose Subscription Plan</h2>
            <p className="text-sm text-slate-500 mt-1">
              Select an existing plan for <span className="font-semibold text-slate-700">{selectedErpName}</span>, or create a new one.
            </p>
          </div>

          {/* Audience selector for filtering/creating */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Track Type</label>
            <div className="flex gap-2 flex-wrap">
              {(["technical", "business_functional", "all"] as Audience[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setPlanAudience(a)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    planAudience === a
                      ? "border-[#429874] bg-[#f0f9f6] text-[#357a5d]"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {AUDIENCE_LABELS[a]}
                </button>
              ))}
            </div>
          </div>

          {planLoading ? (
            <p className="text-slate-500 text-sm">Loading plans...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {planList.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => selectPlan(plan)}
                  className={`text-left px-4 py-3 rounded-lg border-2 transition-all ${
                    selectedPlanId === plan.id
                      ? "border-[#429874] bg-[#f0f9f6]"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="font-semibold text-slate-900">{plan.display_name_en || plan.name}</div>
                  {plan.target_audience && (
                    <div className="text-xs text-[#429874] font-medium mt-0.5">{AUDIENCE_LABELS[plan.target_audience] || plan.target_audience}</div>
                  )}
                </button>
              ))}

              <button
                type="button"
                onClick={() => { setShowNewPlan(true); setSelectedPlanId(null); }}
                className={`text-left px-4 py-3 rounded-lg border-2 border-dashed transition-all ${
                  showNewPlan ? "border-[#429874] bg-[#f0f9f6]" : "border-slate-300 hover:border-[#429874]"
                }`}
              >
                <div className="font-semibold text-[#429874]">+ Create New Plan</div>
                <div className="text-xs text-slate-500 mt-0.5">Build a new subscription plan</div>
              </button>
            </div>
          )}

          {/* New Plan form */}
          {showNewPlan && (
            <div className="border border-slate-200 rounded-lg p-4 space-y-4 bg-slate-50">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">New Plan Details</h3>
                <button
                  type="button"
                  onClick={handleGeneratePlanContent}
                  disabled={generatingPlan}
                  className="px-3 py-1.5 text-xs bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
                >
                  {generatingPlan ? "Generating..." : "AI Generate"}
                </button>
              </div>

              {/* Short names (required) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Short Name (EN) *</label>
                  <input
                    type="text"
                    value={newPlanNameEn}
                    onChange={(e) => setNewPlanNameEn(e.target.value)}
                    placeholder="e.g. Odoo Technical"
                    maxLength={50}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#429874]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Short Name (AR) *</label>
                  <input
                    type="text"
                    value={newPlanNameAr}
                    onChange={(e) => setNewPlanNameAr(e.target.value)}
                    placeholder="أودو تقني"
                    maxLength={50}
                    dir="rtl"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#429874]"
                  />
                </div>
              </div>

              {/* Display names */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Display Name (EN) *</label>
                  <input
                    type="text"
                    value={newPlanDisplayEn}
                    onChange={(e) => setNewPlanDisplayEn(e.target.value)}
                    placeholder="Odoo Technical Starter"
                    maxLength={100}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#429874]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Display Name (AR) *</label>
                  <input
                    type="text"
                    value={newPlanDisplayAr}
                    onChange={(e) => setNewPlanDisplayAr(e.target.value)}
                    placeholder="مسار أودو التقني للمبتدئين"
                    maxLength={100}
                    dir="rtl"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#429874]"
                  />
                </div>
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-2 gap-3">
                <textarea
                  value={newPlanDescEn}
                  onChange={(e) => setNewPlanDescEn(e.target.value)}
                  placeholder="Description (English)"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#429874]"
                />
                <textarea
                  value={newPlanDescAr}
                  onChange={(e) => setNewPlanDescAr(e.target.value)}
                  placeholder="الوصف بالعربية"
                  rows={2}
                  dir="rtl"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#429874]"
                />
              </div>

              {/* Pricing */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block">Pricing</label>
                <div className="flex gap-2 mb-3">
                  {(["free", "one_time", "monthly"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewPlanPaymentType(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        newPlanPaymentType === t
                          ? "border-[#429874] bg-[#f0f9f6] text-[#357a5d]"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      {t === "free" ? "Free" : t === "one_time" ? "One-Time" : "Monthly"}
                    </button>
                  ))}
                </div>
                {newPlanPaymentType !== "free" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={newPlanPrice}
                      onChange={(e) => setNewPlanPrice(Number(e.target.value))}
                      placeholder="Price in EGP"
                      min={0}
                      className="w-40 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#429874]"
                    />
                    <span className="text-sm text-slate-500">EGP</span>
                  </div>
                )}
              </div>

              {/* Limitations */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block">Plan Limits</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(["max_paths", "resources_per_milestone", "monthly_hours", "ai_requests", "downloads"] as const).map((key) => (
                    <div key={key}>
                      <label className="text-xs text-slate-500 block mb-1">
                        {key === "max_paths" ? "Max Paths" : key === "resources_per_milestone" ? "Resources/Milestone" : key === "monthly_hours" ? "Monthly Hours" : key === "ai_requests" ? "AI Requests" : "Downloads"}
                      </label>
                      <input
                        type="number"
                        value={newPlanLimitations[key]}
                        onChange={(e) => setNewPlanLimitations((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                        min={0}
                        title={key}
                        placeholder="0"
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-[#429874]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Plan slug */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Plan Slug (unique key)</label>
                <input
                  type="text"
                  value={planSlug}
                  onChange={(e) => setPlanSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                  placeholder="odoo-technical-starter"
                  maxLength={50}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-[#429874]"
                />
              </div>

              <button
                type="button"
                onClick={handleCreatePlan}
                disabled={!newPlanDisplayEn.trim() || !newPlanNameEn.trim() || savingPlan}
                className="px-4 py-2 bg-[#429874] text-white rounded-lg text-sm font-medium hover:bg-[#357a5d] disabled:opacity-50"
              >
                {savingPlan ? "Saving..." : "Save Plan & Select"}
              </button>
            </div>
          )}

          <div className="flex justify-between">
            <button type="button" onClick={() => setStep("erp")} className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50">
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep("generate")}
              disabled={!selectedPlanId}
              className="px-6 py-2.5 bg-[#429874] text-white rounded-lg font-semibold hover:bg-[#357a5d] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue to Generate →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: GENERATE ── */}
      {step === "generate" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Step 3: Generate Learning Path</h2>
            <p className="text-sm text-slate-500 mt-1">
              AI will generate a complete path for{" "}
              <span className="font-semibold text-slate-700">{selectedErpName}</span>{" "}
              under plan{" "}
              <span className="font-semibold text-slate-700">{selectedPlanName}</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Experience Level */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Experience Level</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as any)}
                title="Experience Level"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#429874]"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            {/* Budget Tier */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Budget Tier</label>
              <select
                value={budgetTier}
                onChange={(e) => setBudgetTier(e.target.value as BudgetTier)}
                title="Budget Tier"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#429874]"
              >
                <option value="free">Free (YouTube + Official Docs)</option>
                <option value="basic">Basic (1–2000 EGP – Udemy, SkillShare)</option>
                <option value="premium">Premium (2001–10000 EGP – Coursera, Official Training)</option>
              </select>
            </div>

            {/* Module / Area */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Module / Area (Optional)</label>
              <input
                type="text"
                value={erpModule}
                onChange={(e) => setErpModule(e.target.value)}
                placeholder={`e.g., ${selectedErpName === "Odoo" ? "Accounting, Inventory, HR" : "Financials, SCM, HCM"}`}
                title="Module or Area"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#429874]"
              />
            </div>

            {/* Time Commitment */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hours per Week</label>
              <input
                type="number"
                value={timeCommitment}
                onChange={(e) => setTimeCommitment(parseInt(e.target.value) || 10)}
                min={5}
                max={40}
                title="Hours per week"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#429874]"
              />
            </div>
          </div>

          {/* Career Goals */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Career Goals (Optional)</label>
            <textarea
              value={careerGoals}
              onChange={(e) => setCareerGoals(e.target.value)}
              placeholder={`e.g., ${selectedErpName} Consultant, ERP Developer, Functional Analyst`}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#429874]"
            />
          </div>

          {generationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{generationError}</div>
          )}

          <div className="flex justify-between">
            <button type="button" onClick={() => setStep("plan")} className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50">
              ← Back
            </button>
            <button
              type="button"
              onClick={handleGeneratePath}
              disabled={isGenerating}
              className="px-6 py-2.5 bg-gradient-to-r from-[#357a5d] to-[#429874] text-white rounded-xl font-semibold hover:from-[#285c46] hover:to-[#357a5d] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? "Generating with AI..." : "Generate Path"}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: REVIEW ── */}
      {step === "review" && generatedPath && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            Review and edit the generated path. When ready, click <strong>Save & Link to Plan</strong> to save everything and link it to plan <strong>{selectedPlanName}</strong>.
          </div>

          {saveError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{saveError}</div>
          )}

          <EditablePathView
            generatedPath={generatedPath}
            onSave={handleSaveAll}
            onCancel={() => setStep("generate")}
            isSaving={isSaving}
            saveLabel="Save & Link to Plan"
          />
        </div>
      )}

      {/* ── STEP 5: DONE ── */}
      {step === "done" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-[#f0f9f6] rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl text-[#429874]">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">All Done!</h2>
          <p className="text-slate-600">
            The learning path has been saved and linked to plan <strong>{selectedPlanName}</strong> for <strong>{selectedErpName}</strong>.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            {savedPathId && (
              <a
                href={`/admin/paths/${savedPathId}`}
                className="px-5 py-2.5 bg-[#429874] text-white rounded-lg font-medium hover:bg-[#357a5d] transition-colors"
              >
                View & Edit Path
              </a>
            )}
            {selectedPlanId && (
              <a
                href={`/admin/plans/${selectedPlanId}/paths`}
                className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
              >
                Manage Plan Paths
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                setStep("erp");
                setSelectedErpId(null);
                setSelectedErpName("");
                setSelectedPlanId(null);
                setSelectedPlanName("");
                setGeneratedPath(null);
                setSavedDraftId(null);
                setSavedPathId(null);
              }}
              className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              Generate Another Path
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
