"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import { createClient } from "@/utils/supabase/client";
import type { SubscriptionDiscount } from "@/types/subscription";

export function SpecialOffers() {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const [offers, setOffers] = useState<SubscriptionDiscount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchOffers() {
      const supabase = createClient();
      const now = new Date().toISOString();

      const { data } = await supabase
        .from("subscription_discounts")
        .select("*")
        .eq("is_active", true)
        .or(`valid_until.is.null,valid_until.gte.${now}`)
        .order("created_at", { ascending: false })
        .limit(3); // Show max 3 active offers

      if (data) {
        setOffers(data);
      }
      setIsLoading(false);
    }

    fetchOffers();
  }, []);

  const getOfferName = (offer: SubscriptionDiscount) => {
    return language === "ar" ? offer.name_ar : offer.name_en || offer.code;
  };

  const formatDiscount = (offer: SubscriptionDiscount) => {
    if (offer.type === "percentage") {
      return `${offer.value}% ${language === "ar" ? "خصم" : "OFF"}`;
    } else if (offer.type === "fixed") {
      return `${offer.value} ${language === "ar" ? "ج.م" : "EGP"} ${language === "ar" ? "خصم" : "OFF"}`;
    }
    return language === "ar" ? "عرض خاص" : "Special Offer";
  };

  const formatValidUntil = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return null; // Don't show loading state, just hide if no offers
  }

  // Don't render if no offers
  if (offers.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-gradient-to-r from-[#429874] to-[#357a5d] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">
            {language === "ar" ? "عروض خاصة محدودة" : "Limited Special Offers"}
          </h2>
          <p className="text-white/90">
            {language === "ar"
              ? "استفد من هذه العروض الحصرية الآن"
              : "Take advantage of these exclusive offers now"}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg mb-1">{getOfferName(offer)}</h3>
                  <p className="text-white/80 text-sm mb-2">Code: {offer.code}</p>
                </div>
                <div className="bg-white/20 rounded-full px-3 py-1 text-sm font-semibold">
                  {formatDiscount(offer)}
                </div>
              </div>

              {offer.valid_until && (
                <p className="text-white/70 text-xs mb-4">
                  {language === "ar" ? "صالح حتى" : "Valid until"}: {formatValidUntil(offer.valid_until)}
                </p>
              )}

              <Link
                href="/pricing"
                className="block w-full text-center py-2 bg-white text-[#429874] rounded-lg font-semibold hover:bg-white/90 transition text-sm"
              >
                {language === "ar" ? "استخدم الكود" : "Use Code"}
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center mt-6">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-white font-medium hover:text-white/80 transition underline"
          >
            {language === "ar" ? "عرض جميع العروض" : "View All Offers"}
            <svg
              className="w-4 h-4 rtl:rotate-180"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

