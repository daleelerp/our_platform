"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

type PlanCategory = "erp" | "sw";
type TrackType = "technical" | "functional" | "all";

type EnrolledPlan = {
  slug: string;
  titleEn: string;
  titleAr: string | null;
  category: PlanCategory;
  trackType: TrackType;
};

type HonorEntry = {
  rank: number;
  fullName: string;
  avatarUrl: string | null;
  initials: string;
};

type BoardState = {
  leaderboard: HonorEntry[];
  own: HonorEntry | null;
};

const PODIUM_MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const PODIUM_ORDER: Record<number, string> = { 1: "order-2", 2: "order-1", 3: "order-3" };
const PODIUM_HEIGHT: Record<number, string> = { 1: "h-24 sm:h-28", 2: "h-16 sm:h-20", 3: "h-12 sm:h-16" };
const PODIUM_BAR: Record<number, string> = {
  1: "bg-gradient-to-b from-amber-300 to-amber-100",
  2: "bg-gradient-to-b from-slate-300 to-slate-100",
  3: "bg-gradient-to-b from-orange-300 to-orange-100",
};
const PODIUM_RING: Record<number, string> = {
  1: "ring-4 ring-amber-300",
  2: "ring-4 ring-slate-300",
  3: "ring-4 ring-orange-300",
};
const PODIUM_AVATAR: Record<number, string> = {
  1: "w-20 h-20 text-xl",
  2: "w-16 h-16 text-lg",
  3: "w-16 h-16 text-lg",
};

function Avatar({ entry, sizeClass, ringClass }: { entry: HonorEntry; sizeClass: string; ringClass?: string }) {
  if (entry.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={entry.avatarUrl}
        alt=""
        className={`${sizeClass} rounded-full object-cover shrink-0 ${ringClass ?? ""}`}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} rounded-full bg-primary-green text-white flex items-center justify-center font-semibold shrink-0 ${ringClass ?? ""}`}
    >
      {entry.initials}
    </div>
  );
}

function PodiumPlace({ entry }: { entry: HonorEntry }) {
  const place = entry.rank;
  return (
    <div className={`flex flex-col items-center flex-1 min-w-0 max-w-[140px] ${PODIUM_ORDER[place]}`}>
      <span className="text-2xl">{PODIUM_MEDAL[place]}</span>
      <Avatar entry={entry} sizeClass={`${PODIUM_AVATAR[place]} mt-1`} ringClass={PODIUM_RING[place]} />
      <span
        title={entry.fullName}
        className="mt-2 block w-full truncate max-w-[130px] mx-auto font-semibold text-slate-900 text-sm text-center"
      >
        {entry.fullName}
      </span>
      <div className={`mt-3 w-full rounded-t-xl ${PODIUM_BAR[place]} ${PODIUM_HEIGHT[place]} flex items-start justify-center pt-2`}>
        <span className="text-lg font-bold text-slate-600">#{place}</span>
      </div>
    </div>
  );
}

/** Skeleton for the initial plans fetch — mirrors the category/type/dropdown/board shell so the page doesn't jump once real content arrives. */
function PlansSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mt-8 flex gap-2">
        <div className="h-9 w-20 bg-slate-200 rounded-full" />
        <div className="h-9 w-24 bg-slate-200 rounded-full" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-7 w-14 bg-slate-100 rounded-full" />
        <div className="h-7 w-20 bg-slate-100 rounded-full" />
        <div className="h-7 w-24 bg-slate-100 rounded-full" />
      </div>
      <div className="mt-4 h-12 w-full max-w-md bg-slate-100 rounded-xl" />
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <BoardSkeleton />
      </div>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-end justify-center gap-4 sm:gap-8 px-6 pt-8 pb-2">
        {[2, 1, 3].map((place) => (
          <div key={place} className="flex flex-col items-center flex-1 max-w-[140px]">
            <div className="w-16 h-16 rounded-full bg-slate-200" />
            <div className="mt-2 h-3 w-16 bg-slate-200 rounded" />
            <div className={`mt-3 w-full rounded-t-xl bg-slate-100 ${PODIUM_HEIGHT[place]}`} />
          </div>
        ))}
      </div>
      <div className="divide-y divide-slate-100 mt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3">
            <div className="w-6 h-4 bg-slate-200 rounded" />
            <div className="w-9 h-9 rounded-full bg-slate-200" />
            <div className="h-4 w-32 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Plan selector as a single dropdown (LOV) instead of a wrapping pill list — scales to any number of plans. */
function PlanDropdown({
  plans,
  selectedSlug,
  onSelect,
  isArabic,
}: {
  plans: EnrolledPlan[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  isArabic: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const selected = plans.find((p) => p.slug === selectedSlug) ?? null;
  const label = (p: EnrolledPlan) => (isArabic && p.titleAr ? p.titleAr : p.titleEn);

  return (
    <div ref={containerRef} className="relative mt-4 w-full max-w-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open ? "true" : "false"}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-medium shadow-sm hover:border-primary-green transition"
      >
        <span className="flex-1 min-w-0 block truncate" title={selected ? label(selected) : undefined}>
          {selected ? label(selected) : ""}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg py-1">
          {plans.map((p) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => {
                onSelect(p.slug);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition ${
                p.slug === selectedSlug
                  ? "bg-primary-green-50 text-primary-green-700 font-semibold"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {label(p)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Muted, static preview of the honor board shape — used when a filter (e.g. a not-yet-launched category) has no real plans to show yet. */
function DemoBoardShape({ message }: { message: string }) {
  const demoPodium = [2, 1, 3];
  return (
    <div className="relative">
      <div className="opacity-40 pointer-events-none select-none">
        <div className="flex items-end justify-center gap-4 sm:gap-8 px-6 pt-8 pb-2">
          {demoPodium.map((place) => (
            <div key={place} className="flex flex-col items-center flex-1 max-w-[140px]">
              <span className="text-2xl">{PODIUM_MEDAL[place]}</span>
              <div className={`${PODIUM_AVATAR[place]} mt-1 rounded-full bg-slate-300`} />
              <div className="mt-2 h-3 w-16 bg-slate-300 rounded" />
              <div className={`mt-3 w-full rounded-t-xl bg-slate-200 ${PODIUM_HEIGHT[place]}`} />
            </div>
          ))}
        </div>
        <div className="divide-y divide-slate-100 mt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <span className="w-6 text-center text-sm font-semibold text-slate-300">{i + 4}</span>
              <div className="w-9 h-9 rounded-full bg-slate-300" />
              <div className="h-4 w-32 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="bg-white/95 border border-slate-200 rounded-xl shadow-sm px-6 py-4 text-center max-w-sm">
          <div className="text-2xl mb-1">🚧</div>
          <p className="text-slate-600 text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
}

export default function RankingsPage() {
  const language = useAppStore((state) => state.language);
  const user = useAppStore((state) => state.user);
  const isAuthResolved = useAppStore((state) => state.isAuthResolved);
  const isArabic = language === "ar";

  const [plans, setPlans] = useState<EnrolledPlan[]>([]);
  const [category, setCategory] = useState<PlanCategory>("erp");
  const [trackType, setTrackType] = useState<TrackType>("all");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [boards, setBoards] = useState<Record<string, BoardState>>({});
  const requestIdRef = useRef(0);
  const router = useRouter();

  const t = {
    title: isArabic ? "لوحة الشرف" : "Honor Board",
    subtitle: isArabic
      ? "الأسماء الأعلى إنجازاً في كل خطة — للتحفيز فقط"
      : "The top achievers on each plan — for motivation only",
    noPlans: isArabic ? "لا توجد خطط متاحة حالياً." : "No plans available yet.",
    browsePaths: isArabic ? "تصفح المسارات" : "Browse paths",
    yourRank: isArabic ? "ترتيبك" : "Your rank",
    emptyState: isArabic
      ? "أكمل أول نقطة تفتيش لتنضم إلى لوحة الشرف!"
      : "Complete your first checkpoint to join the honor board!",
    categoryErp: "ERP",
    categorySw: isArabic ? "برمجيات" : "Software",
    soon: isArabic ? "قريباً" : "Soon",
    typeAll: isArabic ? "الكل" : "All",
    typeTechnical: isArabic ? "تقني" : "Technical",
    typeFunctional: isArabic ? "وظيفي" : "Functional",
    comingSoonCategory: isArabic
      ? "خطط هذا القسم قادمة قريباً — هذه معاينة لشكل لوحة الشرف عند إطلاقها."
      : "Plans in this category are launching soon — here's a preview of how the honor board will look.",
    noTypeMatch: isArabic
      ? "لا توجد خطط من هذا النوع في هذا القسم حالياً."
      : "No plans of this type in this category yet.",
  };

  const plansInCategory = plans.filter((p) => p.category === category);
  const visiblePlans = plansInCategory.filter(
    (p) => trackType === "all" || p.trackType === trackType
  );
  const swPlanCount = plans.filter((p) => p.category === "sw").length;

  // Wait for the initial Supabase session check before deciding the visitor is logged out —
  // otherwise a hard refresh sees the store's default `user: null` and bounces a logged-in user.
  useEffect(() => {
    if (!isAuthResolved) return;
    if (!user) {
      router.push("/");
      return;
    }
    setLoadingPlans(true);
    fetch("/api/rankings")
      .then((r) => r.json())
      .then((j) => {
        const list: EnrolledPlan[] = j.data?.plans ?? [];
        setPlans(list);
      })
      .catch(() => setPlans([]))
      .finally(() => setLoadingPlans(false));
  }, [isAuthResolved, user]);

  // Keep the selected plan valid as the category/type filters (or the plan list itself) change.
  useEffect(() => {
    const visible = plans
      .filter((p) => p.category === category)
      .filter((p) => trackType === "all" || p.trackType === trackType);
    if (visible.length === 0) {
      setSelectedSlug(null);
      return;
    }
    setSelectedSlug((prev) => (prev && visible.some((p) => p.slug === prev) ? prev : visible[0].slug));
  }, [plans, category, trackType]);

  useEffect(() => {
    if (!selectedSlug) return;
    if (boards[selectedSlug]) return; // already cached — show instantly, no flash

    const reqId = ++requestIdRef.current;
    setLoadingBoard(true);
    fetch(`/api/rankings/${selectedSlug}`)
      .then((r) => r.json())
      .then((j) => {
        if (reqId !== requestIdRef.current) return; // a newer tab was selected meanwhile
        setBoards((prev) => ({
          ...prev,
          [selectedSlug]: { leaderboard: j.data?.leaderboard ?? [], own: j.data?.own ?? null },
        }));
      })
      .catch(() => {
        if (reqId !== requestIdRef.current) return;
        setBoards((prev) => ({ ...prev, [selectedSlug]: { leaderboard: [], own: null } }));
      })
      .finally(() => {
        if (reqId === requestIdRef.current) setLoadingBoard(false);
      });
  }, [selectedSlug, boards]);

  if (!isAuthResolved || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
        <div className="max-w-4xl mx-auto animate-pulse">
          <div className="h-9 w-56 bg-slate-200 rounded" />
          <div className="h-5 w-72 bg-slate-200 rounded mt-3" />
        </div>
      </div>
    );
  }

  const current = selectedSlug ? boards[selectedSlug] : undefined;
  const leaderboard = current?.leaderboard ?? [];
  const own = current?.own ?? null;
  const showSkeleton = loadingBoard && !current;
  const podium = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900">🏆 {t.title}</h1>
        <p className="text-slate-500 mt-2">{t.subtitle}</p>

        {loadingPlans ? (
          <PlansSkeleton />
        ) : plans.length === 0 ? (
          <div className="mt-10 bg-white rounded-xl shadow-sm border border-slate-200 p-10 text-center">
            <p className="text-slate-500">{t.noPlans}</p>
            <button
              type="button"
              onClick={() => router.push("/path-finder")}
              className="mt-4 px-4 py-2 rounded-lg bg-primary-green text-white text-sm font-medium hover:bg-primary-green-600 transition"
            >
              {t.browsePaths}
            </button>
          </div>
        ) : (
          <>
            {/* Category: ERP vs Software */}
            <div className="mt-8 flex gap-2">
              {(["erp", "sw"] as PlanCategory[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition flex items-center gap-1.5 ${
                    category === c
                      ? "bg-primary-green-700 text-white border-primary-green-700"
                      : "bg-white text-slate-700 border-slate-200 hover:border-primary-green-700"
                  }`}
                >
                  {c === "erp" ? t.categoryErp : t.categorySw}
                  {c === "sw" && swPlanCount === 0 && (
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        category === c ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {t.soon}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {plansInCategory.length === 0 ? (
              <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <DemoBoardShape message={t.comingSoonCategory} />
              </div>
            ) : (
              <>
                {/* Track type: All / Technical / Functional */}
                <div className="mt-4 flex gap-2">
                  {(["all", "technical", "functional"] as TrackType[]).map((tt) => (
                    <button
                      key={tt}
                      type="button"
                      onClick={() => setTrackType(tt)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                        trackType === tt
                          ? "bg-primary-green text-white border-primary-green"
                          : "bg-white text-slate-500 border-slate-200 hover:border-primary-green"
                      }`}
                    >
                      {tt === "all" ? t.typeAll : tt === "technical" ? t.typeTechnical : t.typeFunctional}
                    </button>
                  ))}
                </div>

                {visiblePlans.length === 0 ? (
                  <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 p-10 text-center text-slate-500">
                    {t.noTypeMatch}
                  </div>
                ) : (
                  <>
                    <PlanDropdown
                      plans={visiblePlans}
                      selectedSlug={selectedSlug}
                      onSelect={setSelectedSlug}
                      isArabic={isArabic}
                    />

                    <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      {showSkeleton ? (
                        <BoardSkeleton />
                      ) : leaderboard.length === 0 ? (
                        <div className="p-10 text-center text-slate-500">
                          <div className="text-3xl mb-2">🏅</div>
                          {t.emptyState}
                        </div>
                      ) : (
                        <>
                          {podium.length > 0 && (
                            <div className="flex items-end justify-center gap-4 sm:gap-8 px-6 pt-8 pb-2">
                              {podium.map((entry) => (
                                <PodiumPlace key={entry.rank} entry={entry} />
                              ))}
                            </div>
                          )}
                          {rest.length > 0 && (
                            <div className="divide-y divide-slate-100 mt-2">
                              {rest.map((entry) => (
                                <div key={entry.rank} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition">
                                  <span className="w-6 shrink-0 text-center text-sm font-semibold text-slate-400">{entry.rank}</span>
                                  <Avatar entry={entry} sizeClass="w-9 h-9 text-sm" />
                                  <span
                                    title={entry.fullName}
                                    className="flex-1 min-w-0 block truncate font-medium text-slate-800"
                                  >
                                    {entry.fullName}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {own && own.rank > leaderboard.length && (
                      <div className="mt-4 bg-primary-green-50 border border-primary-green/30 rounded-xl px-5 py-4 flex items-center gap-4">
                        <span className="text-xs font-semibold text-primary-green-700 uppercase tracking-wide shrink-0">
                          {t.yourRank}
                        </span>
                        <span className="w-8 shrink-0 text-center text-sm font-semibold text-primary-green-700">#{own.rank}</span>
                        <Avatar entry={own} sizeClass="w-9 h-9 text-sm" />
                        <span
                          title={own.fullName}
                          className="flex-1 min-w-0 block truncate font-medium text-slate-900"
                        >
                          {own.fullName}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
