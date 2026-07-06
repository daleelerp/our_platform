"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionPlan } from "@/types/subscription";
import Link from "next/link";
import { AvatarPicker } from "@/components/AvatarPicker";

type PurchasedPlanRecord = {
  id: string;
  status: string;
  created_at?: string;
  current_period_end?: string;
  subscription_plans: {
    id: string;
    name: string;
    display_name_en: string;
    display_name_ar: string;
    price_monthly_egp: number | null;
    price_yearly_egp: number | null;
    price_one_time_egp: number | null;
    payment_type: string | null;
  } | null;
};

type PurchasedPlanQueryRow = Omit<PurchasedPlanRecord, "subscription_plans"> & {
  subscription_plans: PurchasedPlanRecord["subscription_plans"] | PurchasedPlanRecord["subscription_plans"][];
};

type LearningAnalytics = {
  tier: string;
  finalScore: number;
  checkpointsAttempted: number;
  checkpointsPassed: number;
  avgBestScore: number;
  badges: string[];
  pathsEnrolled: number;
};

export default function ProfilePage() {
  const router = useRouter();
  const language = useAppStore((state) => state.language);
  const user = useAppStore((state) => state.user);
  const userProfile = useAppStore((state) => state.userProfile);
  const setUserProfile = useAppStore((state) => state.setUserProfile);

  const { subscription, plan, usage, isLoading: subLoading, daysRemaining, refresh: refreshSubscription } = useSubscription();

  // Per the published Refund Policy: refunds may be requested within 3 calendar
  // days of purchase, per plan (not per subscription overall) — this is a
  // client-side convenience check only; the API route re-verifies per purchase.
  const REFUND_WINDOW_DAYS = 3;
  const canRequestRefundFor = (record: PurchasedPlanRecord): boolean => {
    if (refundedRecordIds.has(record.id)) return false;
    if (record.status === "cancelled" || record.status === "expired") return false;
    if (!record.created_at) return false;
    const daysSince = Math.floor((Date.now() - new Date(record.created_at).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince < REFUND_WINDOW_DAYS;
  };

  const [activeTab, setActiveTab] = useState<"info" | "subscription" | "settings">("info");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    full_name: userProfile?.full_name || "",
    job_title: userProfile?.job_title || "",
    company_name: userProfile?.company_name || "",
    industry: userProfile?.industry || "",
    country: userProfile?.country || "",
    city: userProfile?.city || "",
    bio: userProfile?.bio || "",
    phone_number: (userProfile as any)?.phone_number || "",
    linkedin_url: (userProfile as any)?.linkedin_url || "",
  });

  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState<boolean>(
    (userProfile as any)?.email_notifications_enabled ?? true
  );
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState<boolean>(
    (userProfile as any)?.push_notifications_enabled ?? true
  );
  const [profileVisibility, setProfileVisibility] = useState<"public" | "private">(
    (userProfile as any)?.profile_visibility ?? "public"
  );

  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [purchasedPlans, setPurchasedPlans] = useState<PurchasedPlanRecord[]>([]);
  const [learningAnalytics, setLearningAnalytics] = useState<LearningAnalytics | null>(null);
  const [analyticsLocked, setAnalyticsLocked] = useState(false);
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [preferences, setPreferences] = useState<any>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [refundModalRecord, setRefundModalRecord] = useState<PurchasedPlanRecord | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundReasonError, setRefundReasonError] = useState(false);
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
  const [refundedRecordIds, setRefundedRecordIds] = useState<Set<string>>(new Set());

  const isArabic = language === "ar";

  const t = {
    title: isArabic ? "الملف الشخصي" : "Profile",
    info: isArabic ? "معلوماتي" : "My Info",
    subscription: isArabic ? "الاشتراك" : "Subscription",
    settings: isArabic ? "الإعدادات" : "Settings",
    save: isArabic ? "حفظ" : "Save",
    cancel: isArabic ? "إلغاء" : "Cancel",
    edit: isArabic ? "تعديل" : "Edit",
    saving: isArabic ? "جاري الحفظ..." : "Saving...",
    saved: isArabic ? "تم الحفظ بنجاح" : "Saved successfully",
    error: isArabic ? "حدث خطأ" : "An error occurred",
    fullName: isArabic ? "الاسم الكامل" : "Full Name",
    email: isArabic ? "البريد الإلكتروني" : "Email",
    jobTitle: isArabic ? "المسمى الوظيفي" : "Job Title",
    company: isArabic ? "الشركة" : "Company",
    industry: isArabic ? "القطاع" : "Industry",
    country: isArabic ? "الدولة" : "Country",
    city: isArabic ? "المدينة" : "City",
    bio: isArabic ? "نبذة عني" : "Bio",
    phone: isArabic ? "رقم الهاتف" : "Phone Number",
    linkedin: isArabic ? "رابط LinkedIn" : "LinkedIn URL",
    currentPlan: isArabic ? "خطتك الحالية" : "Current Plan",
    planDetails: isArabic ? "تفاصيل الخطة" : "Plan Details",
    status: isArabic ? "الحالة" : "Status",
    billingCycle: isArabic ? "دورة الفوترة" : "Billing Cycle",
    nextBilling: isArabic ? "الدفعة القادمة" : "Next Billing",
    daysRemaining: isArabic ? "أيام متبقية" : "Days Remaining",
    manage: isArabic ? "إدارة" : "Manage",
    viewPlans: isArabic ? "عرض الخطط" : "View Plans",
    noSubscription: isArabic ? "لا يوجد اشتراك نشط" : "No active subscription",
    freePlan: isArabic ? "الخطة المجانية" : "Free Plan",
    usage: isArabic ? "الاستخدام" : "Usage",
    thisMonth: isArabic ? "هذا الشهر" : "This Month",
    pathsAccessed: isArabic ? "المسارات المستخدمة" : "Paths Accessed",
    aiRequests: isArabic ? "طلبات الذكاء الاصطناعي" : "AI Requests",
    downloads: isArabic ? "التنزيلات" : "Downloads",
    learningHours: isArabic ? "ساعات التعلم" : "Learning Hours",
    unlimited: isArabic ? "غير محدود" : "Unlimited",
    active: isArabic ? "نشط" : "Active",
    trial: isArabic ? "تجريبي" : "Trial",
    paused: isArabic ? "متوقف" : "Paused",
    monthly: isArabic ? "شهري" : "Monthly",
    yearly: isArabic ? "سنوي" : "Yearly",
    avatar: isArabic ? "الصورة الشخصية" : "Avatar",
    changeAvatar: isArabic ? "تغيير الصورة" : "Change Avatar",
    onboarding: isArabic ? "بيانات التسجيل" : "Onboarding Data",
    learningGoals: isArabic ? "أهداف التعلم" : "Learning Goals",
    learningStyle: isArabic ? "أسلوب التعلم" : "Learning Style",
    experienceLevel: isArabic ? "مستوى الخبرة" : "Experience Level",
    erpProvider: isArabic ? "مزود ERP" : "ERP Provider",
    weeklyHours: isArabic ? "ساعات أسبوعية" : "Weekly Hours",
    careerTimeline: isArabic ? "الجدول الزمني المهني" : "Career Timeline",
    requestRefund: isArabic ? "طلب استرداد" : "Request Refund",
    requestingRefund: isArabic ? "جاري الإرسال..." : "Requesting...",
    refundRequested: isArabic ? "تم إرسال الطلب" : "Refund Requested",
    refundModalTitle: isArabic ? "طلب استرداد" : "Request a Refund",
    refundPolicyNote: isArabic
      ? "يمكن طلب الاسترداد خلال 3 أيام من الشراء فقط. يتم إرجاع المبلغ إلى وسيلة الدفع الأصلية، بعد خصم أي رسوم معالجة."
      : "Refunds can only be requested within 3 days of purchase. Approved refunds are issued back to your original payment method, minus any processing fees.",
    refundReasonLabel: isArabic ? "سبب طلب الاسترداد" : "Reason for refund",
    refundReasonPlaceholder: isArabic
      ? "أخبرنا بسبب رغبتك في استرداد هذه الخطة..."
      : "Tell us why you'd like a refund for this plan...",
    refundReasonRequiredError: isArabic
      ? "يرجى كتابة سبب لتقديم طلب الاسترداد."
      : "Please provide a reason to submit your refund request.",
    submitRefundRequest: isArabic ? "إرسال الطلب" : "Submit Request",
    cancellationCycle: isArabic ? "دورة الإلغاء" : "Cancellation Cycle",
    cancelAtPeriodEnd: isArabic ? "سيتم الإلغاء في نهاية الفترة الحالية" : "Will cancel at end of current period",
    willRenew: isArabic ? "سيتم التجديد تلقائياً" : "Will renew automatically",
    notifications: isArabic ? "الإشعارات" : "Notifications",
    emailNotifications: isArabic ? "إشعارات البريد الإلكتروني" : "Email Notifications",
    pushNotifications: isArabic ? "الإشعارات الفورية" : "Push Notifications",
    privacy: isArabic ? "الخصوصية" : "Privacy",
    profileVisibility: isArabic ? "ظهور الملف الشخصي" : "Profile Visibility",
    profileVisibilityHint: isArabic
      ? "الملفات الخاصة لا تظهر في لوحة الترتيب، ولن تظهر في اقتراحات الشركات مستقبلاً."
      : "Private profiles are hidden from public rankings and, in the future, from company suggestions.",
    notificationWarning: isArabic
      ? "الإشعارات تُبقيك على اطلاع بالدروس الجديدة والشهادات ونشاط حسابك. ننصح بإبقائها مفعّلة حتى لا يفوتك شيء مهم."
      : "Notifications keep you informed about new lessons, certificates, and account activity. We recommend keeping them on so you don't miss anything important.",
    subscribeNow: isArabic ? "اشترك الآن" : "Subscribe Now",
    viewPricing: isArabic ? "عرض الأسعار" : "View Pricing",
    goToCheckout: isArabic ? "الذهاب إلى الدفع" : "Go to Checkout",
    purchasedPlans: isArabic ? "الخطط المشتراة" : "Purchased Plans",
    purchasedPlansCount: isArabic ? "عدد الخطط المشتراة" : "Purchased Plans Count",
    noPurchasedPlans: isArabic ? "لا توجد خطط مدفوعة مشتراة بعد" : "No paid plans purchased yet",
    purchasedOn: isArabic ? "تاريخ الشراء" : "Purchased On",
    oneTime: isArabic ? "دفعة واحدة" : "One-Time",
    learningAnalytics: isArabic ? "تحليلات التعلم المتقدمة" : "Advanced Learning Analytics",
    analyticsLocked: isArabic
      ? "متاحة فقط في الخطط التي تشمل تحليلات متقدمة."
      : "Only available on plans that include advanced analytics.",
    analyticsEmpty: isArabic
      ? "أكمل أول نقطة تفتيش لرؤية تحليلاتك."
      : "Complete your first checkpoint to see your analytics.",
    compositeScore: isArabic ? "النتيجة المركبة" : "Composite Score",
    checkpointsPassed: isArabic ? "نقاط التفتيش المجتازة" : "Checkpoints Passed",
    avgBestScore: isArabic ? "متوسط أفضل الدرجات" : "Avg. Best Score",
    badgesEarned: isArabic ? "الأوسمة المكتسبة" : "Badges Earned",
  };

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    // Fetch available plans for upgrade
    async function fetchPlans() {
      const supabase = createClient();
      const { data } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      
      if (data) {
        setAvailablePlans(data);
      }
    }

    fetchPlans();
    fetchPurchasedPlans();
    fetchOnboardingData();
    fetchPreferences();
    fetchLearningAnalytics();
  }, [user, router]);

  const fetchLearningAnalytics = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/profile/learning-analytics");
      const json = await res.json();
      setAnalyticsLocked(!!json.data?.locked);
      setLearningAnalytics(json.data?.analytics ?? null);
    } catch {
      setAnalyticsLocked(false);
      setLearningAnalytics(null);
    }
  };

  const fetchPurchasedPlans = async () => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("user_subscriptions")
      .select(`
        id,
        status,
        created_at,
        current_period_end,
        subscription_plans (
          id,
          name,
          display_name_en,
          display_name_ar,
          price_monthly_egp,
          price_yearly_egp,
          price_one_time_egp,
          payment_type
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!data) {
      setPurchasedPlans([]);
      return;
    }

    const normalizedRecords: PurchasedPlanRecord[] = (data as PurchasedPlanQueryRow[]).map((record) => {
      const planRelation = record.subscription_plans;
      const normalizedPlan = Array.isArray(planRelation)
        ? planRelation[0] ?? null
        : planRelation ?? null;

      return {
        ...record,
        subscription_plans: normalizedPlan,
      };
    });

    const paidPlans = normalizedRecords.filter((record) => {
      const planData = record.subscription_plans;
      if (!planData) return false;
      const monthly = planData.price_monthly_egp ?? 0;
      const yearly = planData.price_yearly_egp ?? 0;
      const oneTime = planData.price_one_time_egp ?? 0;
      return monthly > 0 || yearly > 0 || oneTime > 0;
    });

    setPurchasedPlans(paidPlans);
  };

  const fetchOnboardingData = async () => {
    if (!user) return;
    const supabase = createClient();
    
    // Fetch user profile
    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    // Also try to get onboarding data from localStorage (as fallback)
    let localStorageData = null;
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('onboarding_form_data');
        if (saved) {
          localStorageData = JSON.parse(saved);
        }
      } catch (e) {
        console.error('Failed to load localStorage data:', e);
      }
    }
    
    // Merge profile data with localStorage data
    setOnboardingData({
      ...profileData,
      ...localStorageData, // localStorage data takes precedence for preferences not in DB
    });
  };

  const fetchPreferences = async () => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("user_path_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (data) {
      setPreferences(data);
    }
  };

  const handleNotificationToggle = async (
    field: "email_notifications_enabled" | "push_notifications_enabled",
    value: boolean
  ) => {
    if (!user) return;
    if (field === "email_notifications_enabled") setEmailNotificationsEnabled(value);
    else setPushNotificationsEnabled(value);
    const supabase = createClient();
    await supabase.from("user_profiles").update({ [field]: value }).eq("id", user.id);
    setSuccess(t.saved);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleVisibilityChange = async (value: "public" | "private") => {
    if (!user) return;
    setProfileVisibility(value);
    const supabase = createClient();
    await supabase.from("user_profiles").update({ profile_visibility: value }).eq("id", user.id);
    setSuccess(t.saved);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleAvatarChange = async (avatarUrl: string) => {
    if (!user || !userProfile) return;
    setIsUploadingAvatar(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("user_profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);
      
      if (!error) {
        await fetchOnboardingData();
        // userProfile is guaranteed non-null here
        setUserProfile({ ...userProfile, avatar_url: avatarUrl });
        setShowAvatarPicker(false);
        setSuccess(isArabic ? "تم تحديث الصورة الشخصية" : "Avatar updated");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update avatar");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("user_profiles")
        .update({
          job_title: formData.job_title || null,
          company_name: formData.company_name || null,
          industry: formData.industry || null,
          country: formData.country || null,
          city: formData.city || null,
          bio: formData.bio || null,
          phone_number: formData.phone_number || null,
          linkedin_url: formData.linkedin_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (data) {
        setUserProfile(data);
        setSuccess(t.saved);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || t.error);
    } finally {
      setIsSaving(false);
    }
  };

  const openRefundModal = (record: PurchasedPlanRecord) => {
    setRefundModalRecord(record);
    setRefundReason("");
    setRefundReasonError(false);
  };

  const closeRefundModal = () => {
    if (isSubmittingRefund) return;
    setRefundModalRecord(null);
  };

  const handleSubmitRefund = async () => {
    if (!refundModalRecord) return;
    const trimmedReason = refundReason.trim();
    if (!trimmedReason) {
      setRefundReasonError(true);
      return;
    }

    setIsSubmittingRefund(true);
    setError(null);
    try {
      const res = await fetch("/api/subscription/refund-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription_id: refundModalRecord.id, reason: trimmedReason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t.error);

      setRefundedRecordIds((prev) => new Set(prev).add(refundModalRecord.id));
      setRefundModalRecord(null);
      setSuccess(
        isArabic
          ? "تم إرسال طلب الاسترداد. سنتواصل معك قريباً."
          : "Refund request submitted. We'll be in touch soon."
      );
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || t.error);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString(isArabic ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getPlanDisplayName = (plan: SubscriptionPlan | null) => {
    if (!plan) return t.freePlan;
    return isArabic ? plan.display_name_ar : plan.display_name_en;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return t.active;
      case "trial":
        return t.trial;
      case "paused":
        return t.paused;
      case "pending":
        return isArabic ? "قيد المعالجة" : "Pending";
      case "cancelled":
        return isArabic ? "ملغي" : "Cancelled";
      case "expired":
        return isArabic ? "منتهي" : "Expired";
      default:
        return status;
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">{t.title}</h1>
          <p className="text-slate-600">
            {isArabic 
              ? "إدارة معلوماتك الشخصية والاشتراك والإعدادات"
              : "Manage your personal information, subscription, and settings"}
          </p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("info")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "info"
                ? "text-[#429874] border-b-2 border-[#429874]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.info}
          </button>
          <button
            onClick={() => setActiveTab("subscription")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "subscription"
                ? "text-[#429874] border-b-2 border-[#429874]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.subscription}
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "settings"
                ? "text-[#429874] border-b-2 border-[#429874]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.settings}
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          {/* My Info Tab */}
          {activeTab === "info" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">{t.info}</h2>
              
              {/* Avatar Section */}
              <div className="border-b border-slate-200 pb-6">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  {t.avatar}
                </label>
                <div className="flex items-center gap-4">
                  {userProfile?.avatar_url ? (
                    <img 
                      src={userProfile.avatar_url} 
                      alt="Avatar" 
                      className="w-24 h-24 rounded-full border-2 border-slate-200"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-[#d4ede3] text-[#285c46] flex items-center justify-center text-2xl font-medium border-2 border-slate-200">
                      {userProfile?.full_name?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                  <button
                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    disabled={isUploadingAvatar}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    {isUploadingAvatar ? (isArabic ? "جاري التحميل..." : "Uploading...") : t.changeAvatar}
                  </button>
                </div>
                {showAvatarPicker && (
                  <div className="mt-4">
                    <AvatarPicker
                      selectedAvatar={userProfile?.avatar_url || ""}
                      onSelect={handleAvatarChange}
                      gender={onboardingData?.gender}
                    />
                  </div>
                )}
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t.fullName}
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    disabled
                    readOnly
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {isArabic ? "الاسم من حساب Google الخاص بك" : "Name from your Google account"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t.email}
                  </label>
                  <input
                    type="email"
                    value={user.email || ""}
                    disabled
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {isArabic ? "لا يمكن تغيير البريد الإلكتروني" : "Email cannot be changed"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t.jobTitle}
                  </label>
                  <input
                    type="text"
                    name="job_title"
                    value={formData.job_title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t.company}
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t.industry}
                  </label>
                  <input
                    type="text"
                    name="industry"
                    value={formData.industry}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t.country}
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t.city}
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t.phone}
                  </label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t.linkedin}
                  </label>
                  <input
                    type="url"
                    name="linkedin_url"
                    value={formData.linkedin_url}
                    onChange={handleInputChange}
                    placeholder={isArabic ? "https://linkedin.com/in/yourprofile" : "https://linkedin.com/in/yourprofile"}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t.bio}
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="px-6 py-2 bg-[#429874] text-white rounded-lg font-medium hover:bg-[#357a5d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? t.saving : t.save}
                </button>
              </div>
            </div>
          )}

          {/* Subscription Tab */}
          {activeTab === "subscription" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">{t.subscription}</h2>
              
              {subLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#429874]"></div>
                </div>
              ) : (
                <>
                  {/* Current Plan */}
                  <div className="bg-gradient-to-br from-[#429874] to-[#357a5d] rounded-xl p-6 text-white">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold mb-2">{t.currentPlan}</h3>
                        <p className="text-3xl font-bold">{getPlanDisplayName(plan)}</p>
                      </div>
                      {subscription && (
                        <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                          {getStatusLabel(subscription.status)}
                        </span>
                      )}
                    </div>

                    {subscription && (
                      <div className="grid md:grid-cols-2 gap-4 mt-4 text-sm">
                        <div>
                          <p className="text-white/80 mb-1">{t.billingCycle}</p>
                          <p className="font-semibold">
                            {subscription.billing_cycle === "monthly" ? t.monthly : t.yearly}
                          </p>
                        </div>
                        {subscription.current_period_end && (
                          <div>
                            <p className="text-white/80 mb-1">{t.nextBilling}</p>
                            <p className="font-semibold">{formatDate(subscription.current_period_end)}</p>
                          </div>
                        )}
                        {daysRemaining !== null && (
                          <div>
                            <p className="text-white/80 mb-1">{t.daysRemaining}</p>
                            <p className="font-semibold">{daysRemaining} {isArabic ? "يوم" : "days"}</p>
                          </div>
                        )}
                        {/* Cancellation Cycle */}
                        <div className="md:col-span-2">
                          <p className="text-white/80 mb-1">{t.cancellationCycle}</p>
                          <p className="font-semibold">
                            {subscription.cancelled_at 
                              ? t.cancelAtPeriodEnd 
                              : t.willRenew}
                          </p>
                          {subscription.cancelled_at && (
                            <p className="text-white/70 text-xs mt-1">
                              {isArabic ? "تاريخ الإلغاء:" : "Cancelled on:"} {formatDate(subscription.cancelled_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {!subscription && (
                      <p className="text-white/90 mt-2">{t.freePlan}</p>
                    )}
                  </div>

                  {/* Usage Stats */}
                  {usage && plan && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-sm text-slate-600 mb-1">{t.pathsAccessed}</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {usage.paths_accessed} / {plan.limitations.max_paths === -1 ? t.unlimited : plan.limitations.max_paths}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-sm text-slate-600 mb-1">{t.aiRequests}</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {usage.ai_requests} / {plan.limitations.ai_requests === -1 ? t.unlimited : plan.limitations.ai_requests}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-sm text-slate-600 mb-1">{t.downloads}</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {usage.downloads} / {plan.limitations.downloads === -1 ? t.unlimited : plan.limitations.downloads}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-sm text-slate-600 mb-1">{t.learningHours}</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {Math.floor(usage.learning_minutes / 60)} / {plan.limitations.monthly_hours === -1 ? t.unlimited : plan.limitations.monthly_hours}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Advanced Learning Analytics — gated behind the "advanced_progress" plan feature */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">{t.learningAnalytics}</h3>
                    {analyticsLocked ? (
                      <p className="text-sm text-slate-500">{t.analyticsLocked}</p>
                    ) : !learningAnalytics ? (
                      <p className="text-sm text-slate-500">{t.analyticsEmpty}</p>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-white rounded-lg p-4 border border-slate-200">
                            <p className="text-sm text-slate-600 mb-1">{t.compositeScore}</p>
                            <p className="text-2xl font-bold text-slate-900">
                              {learningAnalytics.finalScore} <span className="text-sm font-medium text-[#429874]">{learningAnalytics.tier}</span>
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-4 border border-slate-200">
                            <p className="text-sm text-slate-600 mb-1">{t.checkpointsPassed}</p>
                            <p className="text-2xl font-bold text-slate-900">
                              {learningAnalytics.checkpointsPassed} / {learningAnalytics.checkpointsAttempted}
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-4 border border-slate-200">
                            <p className="text-sm text-slate-600 mb-1">{t.avgBestScore}</p>
                            <p className="text-2xl font-bold text-slate-900">{learningAnalytics.avgBestScore}%</p>
                          </div>
                          <div className="bg-white rounded-lg p-4 border border-slate-200">
                            <p className="text-sm text-slate-600 mb-1">{t.badgesEarned}</p>
                            <p className="text-2xl font-bold text-slate-900">{learningAnalytics.badges.length}</p>
                          </div>
                        </div>
                        {learningAnalytics.badges.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {learningAnalytics.badges.map((badge) => (
                              <span
                                key={badge}
                                className="px-3 py-1 bg-[#429874]/10 text-[#2f6a51] rounded-full text-xs font-semibold"
                              >
                                🏅 {badge}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Purchased Plans Summary */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">{t.purchasedPlans}</h3>
                      <span className="px-3 py-1 bg-[#429874]/10 text-[#2f6a51] rounded-full text-sm font-semibold">
                        {t.purchasedPlansCount}: {purchasedPlans.length}
                      </span>
                    </div>

                    {purchasedPlans.length === 0 ? (
                      <p className="text-sm text-slate-600">{t.noPurchasedPlans}</p>
                    ) : (
                      <div className="space-y-3">
                        {purchasedPlans.map((record) => {
                          const purchasedPlan = record.subscription_plans;
                          if (!purchasedPlan) return null;
                          const purchasedPlanName = isArabic
                            ? purchasedPlan.display_name_ar
                            : purchasedPlan.display_name_en;
                          const billingType =
                            purchasedPlan.payment_type === "one_time" ||
                            (purchasedPlan.price_one_time_egp &&
                              (purchasedPlan.price_monthly_egp ?? 0) === 0 &&
                              (purchasedPlan.price_yearly_egp ?? 0) === 0)
                              ? t.oneTime
                              : record.status === "active" || record.status === "trial" || record.status === "paused"
                              ? subscription?.billing_cycle === "yearly"
                                ? t.yearly
                                : t.monthly
                              : "-";

                          const showRefundButton = canRequestRefundFor(record);
                          const alreadyRefunded = refundedRecordIds.has(record.id);

                          return (
                            <div
                              key={record.id}
                              className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-slate-900">{purchasedPlanName || purchasedPlan.name}</p>
                                  <p className="text-sm text-slate-500">
                                    {t.purchasedOn}: {formatDate(record.created_at)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                                    {billingType}
                                  </span>
                                  <span className="px-2.5 py-1 rounded-full bg-[#429874]/10 text-[#2f6a51] text-xs font-semibold">
                                    {getStatusLabel(record.status)}
                                  </span>
                                </div>
                              </div>

                              {/* Refund request — only within the 3-day window, per plan */}
                              {showRefundButton && (
                                <div className="pt-3 border-t border-slate-100">
                                  <button
                                    type="button"
                                    onClick={() => openRefundModal(record)}
                                    className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                                  >
                                    {t.requestRefund}
                                  </button>
                                  <p className="mt-1.5 text-xs text-slate-400">{t.refundPolicyNote}</p>
                                </div>
                              )}
                              {alreadyRefunded && (
                                <div className="pt-3 border-t border-slate-100">
                                  <span className="text-xs font-medium text-amber-600">{t.refundRequested}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-200 mt-6">
                    {/* Show Subscribe Now if no active subscription */}
                    {(!subscription || subscription.status === "cancelled" || subscription.status === "expired") && (
                      <>
                        <Link
                          href="/plans"
                          className="px-6 py-3 bg-[#429874] text-white rounded-lg font-medium hover:bg-[#357a5d] transition-colors shadow-md hover:shadow-lg"
                        >
                          {t.subscribeNow}
                        </Link>
                        <Link
                          href="/plans"
                          className="px-6 py-3 bg-white border-2 border-[#429874] text-[#429874] rounded-lg font-medium hover:bg-[#f0f9f6] transition-colors"
                        >
                          {t.viewPricing}
                        </Link>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">{t.settings}</h2>
              
              <div className="space-y-8">
                {/* Onboarding Preferences */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">{t.onboarding}</h3>
                  {(!onboardingData || Object.keys(onboardingData).length === 0) ? (
                    <div className="text-slate-500 text-sm mb-4">
                      {isArabic ? "لا توجد بيانات تسجيل محفوظة" : "No onboarding data saved"}
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {onboardingData?.experience_level && (
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            {t.experienceLevel}
                          </label>
                          <p className="text-slate-900 capitalize">{onboardingData.experience_level}</p>
                        </div>
                      )}
                      {onboardingData?.learning_style && (
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            {t.learningStyle}
                          </label>
                          <p className="text-slate-900 capitalize">{onboardingData.learning_style}</p>
                        </div>
                      )}
                      {onboardingData?.weekly_hours && (
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            {t.weeklyHours}
                          </label>
                          <p className="text-slate-900">{onboardingData.weekly_hours}</p>
                        </div>
                      )}
                      {onboardingData?.career_timeline && (
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            {t.careerTimeline}
                          </label>
                          <p className="text-slate-900 capitalize">{onboardingData.career_timeline}</p>
                        </div>
                      )}
                      {onboardingData?.erp_provider && (
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            {t.erpProvider}
                          </label>
                          <p className="text-slate-900">{onboardingData.erp_provider}</p>
                        </div>
                      )}
                      {onboardingData?.erp_tool && onboardingData.erp_tool !== "explore" && (
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            {isArabic ? "أداة ERP" : "ERP Tool"}
                          </label>
                          <p className="text-slate-900">{onboardingData.erp_tool}</p>
                        </div>
                      )}
                      {onboardingData?.career_focus && (
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            {isArabic ? "التركيز المهني" : "Career Focus"}
                          </label>
                          <p className="text-slate-900 capitalize">{onboardingData.career_focus}</p>
                        </div>
                      )}
                      {onboardingData?.budget_range && (
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            {isArabic ? "نطاق الميزانية" : "Budget Range"}
                          </label>
                          <p className="text-slate-900 capitalize">{onboardingData.budget_range}</p>
                        </div>
                      )}
                      {onboardingData?.referral_source && (
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            {isArabic ? "مصدر الإحالة" : "Referral Source"}
                          </label>
                          <p className="text-slate-900 capitalize">{onboardingData.referral_source}</p>
                        </div>
                      )}
                      {onboardingData?.student_status && (
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            {isArabic ? "حالة الطالب" : "Student Status"}
                          </label>
                          <p className="text-slate-900 capitalize">{onboardingData.student_status}</p>
                        </div>
                      )}
                      {onboardingData?.gender && (
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            {isArabic ? "الجنس" : "Gender"}
                          </label>
                          <p className="text-slate-900 capitalize">{onboardingData.gender}</p>
                        </div>
                      )}
                      {Array.isArray(onboardingData?.learning_goals) && onboardingData.learning_goals.length > 0 && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            {t.learningGoals}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {onboardingData.learning_goals.map((goal: string, idx: number) => (
                              <span key={idx} className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-sm capitalize">
                                {goal}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {Array.isArray(onboardingData?.current_erp_experience) && onboardingData.current_erp_experience.length > 0 && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            {isArabic ? "خبرة ERP الحالية" : "Current ERP Experience"}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {onboardingData.current_erp_experience.map((exp: string, idx: number) => (
                              <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm capitalize">
                                {exp}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {Array.isArray(onboardingData?.certification_interest) && onboardingData.certification_interest.length > 0 && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            {isArabic ? "اهتمامات الشهادات" : "Certification Interests"}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {onboardingData.certification_interest.map((cert: string, idx: number) => (
                              <span key={idx} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm capitalize">
                                {cert}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {preferences?.primary_goal && (
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            {isArabic ? "الهدف الأساسي (من المسار)" : "Primary Goal (from Path Finder)"}
                          </label>
                          <p className="text-slate-900 capitalize">{preferences.primary_goal}</p>
                        </div>
                      )}
                      {preferences?.time_commitment && (
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            {isArabic ? "الالتزام الزمني" : "Time Commitment"}
                          </label>
                          <p className="text-slate-900 capitalize">{preferences.time_commitment}</p>
                        </div>
                      )}
                      {preferences?.target_role && (
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">
                            {isArabic ? "الدور المستهدف" : "Target Role"}
                          </label>
                          <p className="text-slate-900 capitalize">{preferences.target_role}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <Link
                    href="/onboarding"
                    className="mt-4 inline-block text-sm text-[#429874] hover:text-[#357a5d] font-medium"
                  >
                    {isArabic ? "تعديل بيانات التسجيل" : "Edit Onboarding Data"}
                  </Link>
                </div>

                {/* Notifications Settings */}
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">{t.notifications}</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailNotificationsEnabled}
                        onChange={(e) => handleNotificationToggle("email_notifications_enabled", e.target.checked)}
                        className="w-5 h-5 text-[#429874] border-slate-300 rounded focus:ring-[#429874]"
                      />
                      <span className="text-slate-700">{t.emailNotifications}</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pushNotificationsEnabled}
                        onChange={(e) => handleNotificationToggle("push_notifications_enabled", e.target.checked)}
                        className="w-5 h-5 text-[#429874] border-slate-300 rounded focus:ring-[#429874]"
                      />
                      <span className="text-slate-700">{t.pushNotifications}</span>
                    </label>
                  </div>
                  {(!emailNotificationsEnabled || !pushNotificationsEnabled) && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      <span>{t.notificationWarning}</span>
                    </div>
                  )}
                </div>

                {/* Privacy Settings */}
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">{t.privacy}</h3>
                  <div>
                    <label htmlFor="profile-visibility" className="block text-sm font-medium text-slate-700 mb-2">
                      {t.profileVisibility}
                    </label>
                    <select
                      id="profile-visibility"
                      value={profileVisibility}
                      onChange={(e) => handleVisibilityChange(e.target.value as "public" | "private")}
                      className="w-full md:max-w-xs px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
                    >
                      <option value="public">{isArabic ? "عام" : "Public"}</option>
                      <option value="private">{isArabic ? "خاص" : "Private"}</option>
                    </select>
                    <p className="mt-2 text-xs text-slate-500">{t.profileVisibilityHint}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {refundModalRecord && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/45 p-4"
          dir={isArabic ? "rtl" : "ltr"}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">{t.refundModalTitle}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {isArabic
                ? refundModalRecord.subscription_plans?.display_name_ar
                : refundModalRecord.subscription_plans?.display_name_en}
            </p>

            <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs leading-relaxed text-amber-800">
              {t.refundPolicyNote}
            </p>

            <div className="mt-4">
              <label htmlFor="refund-reason" className="mb-1 block text-sm font-medium text-slate-800">
                {t.refundReasonLabel} <span className="text-red-500">*</span>
              </label>
              <textarea
                id="refund-reason"
                value={refundReason}
                onChange={(e) => {
                  setRefundReason(e.target.value);
                  if (refundReasonError) setRefundReasonError(false);
                }}
                rows={4}
                disabled={isSubmittingRefund}
                className={`w-full rounded-lg border px-3 py-2 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-60 ${
                  refundReasonError ? "border-red-400 focus:border-red-500" : "border-slate-300 focus:border-teal-500"
                }`}
                placeholder={t.refundReasonPlaceholder}
              />
              {refundReasonError && (
                <p className="mt-1 text-xs text-red-600">{t.refundReasonRequiredError}</p>
              )}
            </div>

            <div className={`mt-5 flex items-center gap-2 ${isArabic ? "flex-row-reverse" : "justify-end"}`}>
              <button
                type="button"
                onClick={closeRefundModal}
                disabled={isSubmittingRefund}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleSubmitRefund}
                disabled={isSubmittingRefund}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {isSubmittingRefund ? t.requestingRefund : t.submitRefundRequest}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

