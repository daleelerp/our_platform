import { useState } from "react";
import { SubscriptionPlan, SubscriptionFeature} from "@/types/subscription";

type PricingCardProps = {
  plan: SubscriptionPlan;
  price: any;
  isPremium: boolean;
  isTeam: boolean;
  isOneTime: boolean;
  isLoading: boolean;
  selectedPlan: string | null;
  allPlanFeatures: SubscriptionFeature[];
  isArabic: boolean;
  t: Record<string, string>;
  getFeatureName: (feature: SubscriptionFeature) => string;
  handleSubscribe: (planId: string) => void;
};

export default function PricingCard({
  plan,
  price,
  isPremium,
  isTeam,
  isOneTime,
  isLoading,
  selectedPlan,
  allPlanFeatures,
  isArabic,
  t,
  getFeatureName,
  handleSubscribe,
}: PricingCardProps) {
  const [showIncludes, setShowIncludes] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);

  return (
    <div
      className={`relative bg-white rounded-2xl border-2 transition-all flex flex-col ${
        isPremium
          ? "border-[#429874] shadow-lg shadow-[#429874]/10"
          : "border-slate-200 hover:border-[#429874]/40 hover:shadow-lg"
      }`}
    >
      {/* Popular Badge */}
      {plan.is_popular && (
        <div className="bg-gradient-to-r from-[#429874] to-[#357a5d] text-white text-xs font-semibold py-1.5 text-center rounded-t-xl">
          ⭐ {t.popular}
        </div>
      )}

      <div className="p-5 flex flex-col flex-grow">
        {/* One-Time Badge */}
        {isOneTime && (
          <div className="mb-3">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t.oneTimePayment}
            </span>
          </div>
        )}

        {/* Plan Title & Description */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {isArabic ? plan.display_name_ar : plan.display_name_en}
          </h3>
          <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">
            {isArabic ? plan.description_ar : plan.description_en}
          </p>
        </div>

        {/* Price Section */}
        <div className="mb-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-slate-900">{price.display}</span>
            {price.sub && <span className="text-sm text-slate-500">{price.sub}</span>}
          </div>

          {/* One-time benefits */}
          {isOneTime && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-md">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t.lifetimeAccess}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-md">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t.noSubscription}
              </span>
            </div>
          )}

          {/* Recurring plan savings */}
          {!isOneTime && price.savings && (
            <p className="text-[#429874] text-xs font-semibold mt-2 bg-[#f0f9f6] inline-block px-2.5 py-1 rounded-full">
              {price.savings}
            </p>
          )}
        </div>

        {/* CTA Button */}
        <button
          onClick={() => handleSubscribe(plan.id)}
          disabled={isLoading && selectedPlan === plan.id}
          className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
            isPremium
              ? "bg-gradient-to-r from-[#429874] to-[#357a5d] text-white hover:from-[#357a5d] hover:to-[#285c46] shadow-md hover:shadow-lg"
              : isTeam
              ? "bg-slate-900 text-white hover:bg-slate-800 shadow-md"
              : plan.name === "free"
              ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
              : "bg-[#429874] text-white hover:bg-[#357a5d] shadow-md hover:shadow-lg"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading && selectedPlan === plan.id ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>{t.processing}</span>
            </>
          ) : plan.name === "free" ? (
            t.getStarted
          ) : isTeam ? (
            t.contactSales
          ) : isOneTime ? (
            t.buyNow
          ) : (
            t.upgrade
          )}
        </button>

        {/* Divider */}
        <div className="border-t border-slate-100 my-4"></div>

        {/* What's Included - Collapsible */}
        {isOneTime && (
          <div className="mb-3">
            <button
              onClick={() => setShowIncludes(!showIncludes)}
              className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <span className="flex items-center gap-2">
                <span className="text-base">📦</span>
                <span className="text-sm font-semibold text-slate-700">{t.includes}</span>
                <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">3</span>
              </span>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  showIncludes ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Collapsible Content */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                showIncludes ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="pt-2 pb-1 px-3 space-y-2">
                <div className="flex items-center gap-2.5 text-sm text-slate-600">
                  <span className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-sm">📚</span>
                  <span>{t.learningPaths}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-slate-600">
                  <span className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-sm">🤖</span>
                  <span>{t.aiAccess}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-slate-600">
                  <span className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center text-sm">💰</span>
                  <span>{t.jobSalaries}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Features - Collapsible */}
        <div>
          <button
            onClick={() => setShowFeatures(!showFeatures)}
            className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors group"
          >
            <span className="flex items-center gap-2">
              <span className="text-base">✨</span>
              <span className="text-sm font-semibold text-slate-700">{t.features}</span>
              <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                {allPlanFeatures.length}
              </span>
            </span>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                showFeatures ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Collapsible Content */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              showFeatures ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="pt-2 pb-1 px-3 grid grid-cols-2 gap-x-3 gap-y-2">
              {allPlanFeatures.map((feature) => (
                <div
                  key={feature.id}
                  className="flex items-center gap-1.5 text-xs text-slate-600"
                >
                  <span className="text-sm shrink-0">{feature.icon || "✓"}</span>
                  <span className="truncate">{getFeatureName(feature)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Preview - Show when collapsed */}
        {!showFeatures && allPlanFeatures.length > 0 && (
          <div className="px-3 pt-1">
            <div className="flex flex-wrap gap-1">
              {allPlanFeatures.slice(0, 4).map((feature) => (
                <span
                  key={feature.id}
                  className="text-xs text-slate-400"
                  title={getFeatureName(feature)}
                >
                  {feature.icon}
                </span>
              ))}
              {allPlanFeatures.length > 4 && (
                <span className="text-xs text-slate-400">+{allPlanFeatures.length - 4}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}