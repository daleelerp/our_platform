"use client";

import { useAppStore } from "@/store/useAppStore";

export default function RoadmapPage() {
  const language = useAppStore((state) => state.language);
  const isArabic = language === "ar";

  const t = {
    title: isArabic ? "خارطة الطريق" : "Roadmap",
    subtitle: isArabic 
      ? "اكتشف ما نعمل عليه وما هو قادم في دليل"
      : "See what we're working on and what's coming next in Daleel",
    comingSoon: isArabic ? "قريباً" : "Coming Soon",
    inProgress: isArabic ? "قيد التطوير" : "In Progress",
    completed: isArabic ? "مكتمل" : "Completed",
    planned: isArabic ? "مخطط له" : "Planned",
  };

  const roadmapItems = [
    {
      status: "completed",
      quarter: isArabic ? "نوفمبر 2025" : "November 2025",
      items: isArabic 
        ? [
            "بداية التطوير",
            "بناء المنصة الأساسية",
            "مسارات تعليمية لـ Oracle ERP",
            "نظام الاشتراكات والدفع",
            "واجهة المستخدم ثنائية اللغة",
          ]
        : [
            "Development Start",
            "Building core platform",
            "Oracle ERP learning paths",
            "Subscription and payment system",
            "Bilingual user interface",
          ],
    },
    {
      status: "inProgress",
      quarter: isArabic ? "يناير 2026" : "January 2026",
      items: isArabic
        ? [
            "إطلاق المنصة",
            "مسارات Oracle ERP كاملة",
            "نظام المستخدمين والاشتراكات",
            "واجهة المستخدم ثنائية اللغة",
          ]
        : [
            "Platform Launch",
            "Complete Oracle ERP paths",
            "User and subscription system",
            "Bilingual user interface",
          ],
    },
    {
      status: "planned",
      quarter: isArabic ? "2026 - المرحلة الأولى" : "2026 - Phase 1",
      items: isArabic
        ? [
            "زيادة كل مجالات ERP (SAP، Microsoft Dynamics، Odoo، NetSuite، وغيرها)",
            "بناء كوميونيتي كامل",
            "إضافة شركات توظيف",
            "محاضرات مغلقة",
            "تغطية كامل أنظمة ERP",
          ]
        : [
            "Expand all ERP domains (SAP, Microsoft Dynamics, Odoo, NetSuite, and more)",
            "Build complete community",
            "Add recruitment companies",
            "Private lectures",
            "Cover all ERP systems",
          ],
    },
    {
      status: "planned",
      quarter: isArabic ? "2026-2027 - المرحلة الثانية" : "2026-2027 - Phase 2",
      items: isArabic
        ? [
            "إضافة محتوى خارج نطاق ERP",
            "توسيع المنصة لتشمل مجالات أخرى",
            "ميزات متقدمة للتعلم",
            "شهادات معتمدة",
            "تكامل مع منصات التوظيف",
          ]
        : [
            "Add content beyond ERP",
            "Expand platform to include other domains",
            "Advanced learning features",
            "Certified credentials",
            "Integration with recruitment platforms",
          ],
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "inProgress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "planned":
        return "bg-slate-100 text-slate-800 border-slate-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return t.completed;
      case "inProgress":
        return t.inProgress;
      case "planned":
        return t.planned;
      default:
        return t.planned;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            {t.title}
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            {t.subtitle}
          </p>
        </div>

        {/* Roadmap Items */}
        <div className="space-y-8">
          {roadmapItems.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-900">
                  {item.quarter}
                </h2>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                    item.status
                  )}`}
                >
                  {getStatusLabel(item.status)}
                </span>
              </div>
              <ul className="space-y-3">
                {item.items.map((roadmapItem, itemIndex) => (
                  <li
                    key={itemIndex}
                    className="flex items-start gap-3 text-slate-700"
                  >
                    <svg
                      className="w-5 h-5 text-[#429874] mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>{roadmapItem}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Note */}
        <div className="mt-12 p-6 bg-[#f0f9f6] rounded-xl border border-[#429874]/20">
          <p className="text-slate-700 text-center">
            {isArabic
              ? "هذه الخارطة قابلة للتغيير بناءً على ملاحظات المستخدمين وأولويات السوق. نرحب بملاحظاتك!"
              : "This roadmap is subject to change based on user feedback and market priorities. We welcome your input!"}
          </p>
        </div>
      </div>
    </div>
  );
}

