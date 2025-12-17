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
      quarter: isArabic ? "Q4 2024" : "Q4 2024",
      items: isArabic 
        ? [
            "إطلاق المنصة الأساسية",
            "مسارات تعليمية لـ Oracle ERP",
            "نظام الاشتراكات والدفع",
            "واجهة المستخدم ثنائية اللغة",
          ]
        : [
            "Core platform launch",
            "Oracle ERP learning paths",
            "Subscription and payment system",
            "Bilingual user interface",
          ],
    },
    {
      status: "inProgress",
      quarter: isArabic ? "Q1 2025" : "Q1 2025",
      items: isArabic
        ? [
            "مسارات SAP S/4HANA",
            "مسارات Microsoft Dynamics 365",
            "نظام الفريق والاشتراكات المؤسسية",
            "تطبيق الهاتف المحمول",
            "منتدى المجتمع",
          ]
        : [
            "SAP S/4HANA paths",
            "Microsoft Dynamics 365 paths",
            "Team and enterprise subscriptions",
            "Mobile app",
            "Community forum",
          ],
    },
    {
      status: "planned",
      quarter: isArabic ? "Q2 2025" : "Q2 2025",
      items: isArabic
        ? [
            "مسارات Odoo و NetSuite",
            "ميزات الذكاء الاصطناعي المتقدمة",
            "التعلم التكيفي",
            "شهادات معتمدة",
            "تكامل مع LinkedIn",
          ]
        : [
            "Odoo and NetSuite paths",
            "Advanced AI features",
            "Adaptive learning",
            "Certified credentials",
            "LinkedIn integration",
          ],
    },
    {
      status: "planned",
      quarter: isArabic ? "Q3-Q4 2025" : "Q3-Q4 2025",
      items: isArabic
        ? [
            "مسارات إضافية لأنظمة ERP",
            "منصة للمدربين",
            "ميزات التعلم الاجتماعي",
            "تحليلات متقدمة للتقدم",
            "واجهات برمجة التطبيقات (APIs)",
          ]
        : [
            "Additional ERP system paths",
            "Instructor platform",
            "Social learning features",
            "Advanced progress analytics",
            "API access",
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

