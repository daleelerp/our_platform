"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { GeneratedPath } from "@/services/pathGenerator";
import { EditablePathView } from "./EditablePathView";

type BudgetTier = "free" | "basic" | "premium";

export function PathGenerator() {
  const language = useAppStore((state) => state.language) || "en";

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPath, setGeneratedPath] = useState<GeneratedPath | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEditView, setShowEditView] = useState(false);
  const [savedPathId, setSavedPathId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [experienceLevel, setExperienceLevel] = useState<"beginner" | "intermediate" | "advanced" | "expert">("beginner");
  const [focusArea, setFocusArea] = useState<"technical" | "functional" | "both">("both");
  const [budgetTier, setBudgetTier] = useState<BudgetTier>("free");
  const [estimatedBudget, setEstimatedBudget] = useState<number>(0);
  const [oracleModule, setOracleModule] = useState<string>("");
  const [careerGoals, setCareerGoals] = useState<string>("");
  const [timeCommitment, setTimeCommitment] = useState<number>(10);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setGeneratedPath(null);

    try {
      const response = await fetch("/api/paths/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language,
          experienceLevel,
          focusArea,
          budgetTier,
          estimatedBudget: budgetTier !== "free" ? estimatedBudget : undefined,
          oracleModule: oracleModule || undefined,
          careerGoals: careerGoals ? careerGoals.split(",").map((g) => g.trim()) : undefined,
          timeCommitment,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate path");
      }

      const data = await response.json();
      setGeneratedPath(data.path);
      setSavedPathId(data.savedPathId || null);
      setShowEditView(true); // Show edit view after generation
    } catch (err: any) {
      setError(err.message || "Error generating path");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePath = async (editedPath: any) => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/paths/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: editedPath,
          pathId: savedPathId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save path");
      }

      const data = await response.json();
      setSavedPathId(data.pathId);
      alert("Path saved successfully!");
    } catch (err: any) {
      setError(err.message || "Error saving path");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          Generate Personalized Learning Path
        </h2>

        <div className="space-y-4">
          {/* Experience Level */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Experience Level
            </label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value as any)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          {/* Focus Area */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Focus Area
            </label>
            <select
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value as any)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
            >
              <option value="both">Both (Technical & Functional)</option>
              <option value="technical">Technical</option>
              <option value="functional">Functional</option>
            </select>
          </div>

          {/* Budget Tier */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Budget Tier
            </label>
            <select
              value={budgetTier}
              onChange={(e) => setBudgetTier(e.target.value as BudgetTier)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
            >
              <option value="free">Free (YouTube + Oracle Docs)</option>
              <option value="basic">Basic (1-2000 EGP - Udemy, SkillShare)</option>
              <option value="premium">Premium (2001-10000 EGP - Coursera, Official Training)</option>
            </select>
          </div>

          {/* Estimated Budget (if not free) */}
          {budgetTier !== "free" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Estimated Budget (EGP)
              </label>
              <input
                type="number"
                value={estimatedBudget}
                onChange={(e) => setEstimatedBudget(parseInt(e.target.value) || 0)}
                min={budgetTier === "basic" ? 1 : 2001}
                max={budgetTier === "basic" ? 2000 : 10000}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
              />
            </div>
          )}

          {/* Oracle Module (Optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Oracle Module (Optional)
            </label>
            <input
              type="text"
              value={oracleModule}
              onChange={(e) => setOracleModule(e.target.value)}
              placeholder="e.g., Financials, SCM, HCM"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
            />
          </div>

          {/* Career Goals (Optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Career Goals (Optional)
            </label>
            <textarea
              value={careerGoals}
              onChange={(e) => setCareerGoals(e.target.value)}
              placeholder="e.g., Oracle Consultant, ERP Developer"
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
            />
          </div>

          {/* Time Commitment */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Time Available (hours/week)
            </label>
            <input
              type="number"
              value={timeCommitment}
              onChange={(e) => setTimeCommitment(parseInt(e.target.value) || 10)}
              min={5}
              max={40}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full px-6 py-3 bg-gradient-to-r from-[#357a5d] to-[#429874] text-white rounded-xl font-semibold text-lg hover:from-[#285c46] hover:to-[#357a5d] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? "Generating..." : "Generate Path"}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Generated Path Display - Editable View */}
      {generatedPath && showEditView ? (
        <EditablePathView
          generatedPath={generatedPath}
          onSave={handleSavePath}
          onCancel={() => setShowEditView(false)}
          isSaving={isSaving}
        />
      ) : generatedPath ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">
              Path Generated Successfully
            </h3>
            <button
              onClick={() => setShowEditView(true)}
              className="px-4 py-2 bg-[#429874] text-white rounded-lg hover:bg-[#357a5d] transition-colors"
            >
              Edit & Save
            </button>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
            Review the generated path below, then click "Edit & Save" to adjust and save it to the database.
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            {language === "ar" && generatedPath.path.title_ar ? generatedPath.path.title_ar : generatedPath.path.title}
          </h3>
          <p className="text-slate-600">
            {language === "ar" && generatedPath.path.description_ar ? generatedPath.path.description_ar : generatedPath.path.description}
          </p>

          {/* Budget Breakdown */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-semibold text-slate-900 mb-2">
              Budget Breakdown
            </h4>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Free:</span>
                <span className="font-medium ml-2">{generatedPath.path.budget_breakdown.free} EGP</span>
              </div>
              <div>
                <span className="text-slate-600">Basic:</span>
                <span className="font-medium ml-2">{generatedPath.path.budget_breakdown.basic} EGP</span>
              </div>
              <div>
                <span className="text-slate-600">Premium:</span>
                <span className="font-medium ml-2">{generatedPath.path.budget_breakdown.premium} EGP</span>
              </div>
              <div>
                <span className="text-slate-600">Total:</span>
                <span className="font-medium ml-2">{generatedPath.path.budget_breakdown.total} EGP</span>
              </div>
            </div>
          </div>

          {/* Milestones */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900">
              Milestones
            </h4>
            {generatedPath.milestones.map((milestone) => (
              <div key={milestone.milestone_number} className="border border-slate-200 rounded-lg p-4">
                <h5 className="font-semibold text-slate-900 mb-2">
                  {milestone.milestone_number}. {language === "ar" && milestone.title_ar ? milestone.title_ar : milestone.title}
                </h5>
                <p className="text-sm text-slate-600 mb-3">
                  {language === "ar" && milestone.description_ar ? milestone.description_ar : milestone.description}
                </p>
                
                {/* Resources */}
                <div className="mt-3 space-y-2">
                  <span className="text-xs font-medium text-slate-500">
                    Resources:
                  </span>
                  {milestone.resources.map((resource, idx) => (
                    <div key={idx} className="text-sm">
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#429874] hover:underline"
                      >
                        {language === "ar" && resource.title_ar ? resource.title_ar : resource.title}
                      </a>
                      <span className="text-slate-500 ml-2">
                        ({resource.is_free ? "Free" : `${resource.price_egp} EGP`})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Final Project */}
          <div className="bg-[#f0f9f6] rounded-lg p-4 border border-[#a9dbc7]">
            <h4 className="font-semibold text-[#285c46] mb-2">
              Final Project
            </h4>
            <h5 className="font-medium text-slate-900 mb-2">
              {language === "ar" && generatedPath.finalProject.title_ar ? generatedPath.finalProject.title_ar : generatedPath.finalProject.title}
            </h5>
            <p className="text-sm text-slate-700 mb-3">
              {language === "ar" && generatedPath.finalProject.description_ar ? generatedPath.finalProject.description_ar : generatedPath.finalProject.description}
            </p>
            <div>
              <span className="text-xs font-medium text-slate-600">
                Portfolio Recommendations:
              </span>
              <ul className="list-disc list-inside text-sm text-slate-700 mt-1">
                {generatedPath.finalProject.portfolio_recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

