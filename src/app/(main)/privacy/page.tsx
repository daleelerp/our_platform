"use client";

import { useAppStore } from "@/store/useAppStore";

export default function PrivacyPolicyPage() {
  const language = useAppStore((state) => state.language);
  const isArabic = language === "ar";

  const content = isArabic
    ? {
        title: "سياسة الخصوصية",
        lastUpdated: "آخر تحديث: ديسمبر 2024",
        sections: [
          {
            title: "1. مقدمة",
            content:
              "نحن في دليل (Daleel) ملتزمون بحماية خصوصيتك. توضح سياسة الخصوصية هذه كيفية جمع واستخدام وحماية معلوماتك الشخصية عند استخدام منصتنا.",
          },
          {
            title: "2. المعلومات التي نجمعها",
            content:
              "نجمع المعلومات التالية:\n- معلومات الحساب (الاسم، البريد الإلكتروني)\n- معلومات الملف الشخصي (المنصب، الشركة، الخبرة)\n- معلومات الاستخدام (المسارات المكتملة، الوقت المستغرق)\n- معلومات الدفع (معالجة من خلال مزودي دفع آمنين)",
          },
          {
            title: "3. كيفية استخدام المعلومات",
            content:
              "نستخدم معلوماتك لـ:\n- تقديم وتحسين خدماتنا\n- معالجة المدفوعات والاشتراكات\n- إرسال تحديثات مهمة عن حسابك\n- تحليل الاستخدام لتحسين المنصة",
          },
          {
            title: "4. مشاركة المعلومات",
            content:
              "لا نبيع معلوماتك الشخصية. قد نشارك معلومات محدودة مع:\n- مزودي الخدمات الذين يساعدوننا في تشغيل المنصة\n- السلطات القانونية عند الحاجة بموجب القانون",
          },
          {
            title: "5. أمان البيانات",
            content:
              "نستخدم تدابير أمان قياسية في الصناعة لحماية معلوماتك، بما في ذلك التشفير ومراجعات الأمان المنتظمة.",
          },
          {
            title: "6. حقوقك",
            content:
              "لديك الحق في:\n- الوصول إلى معلوماتك الشخصية\n- تصحيح المعلومات غير الدقيقة\n- حذف حسابك وبياناتك\n- الاعتراض على معالجة بياناتك",
          },
          {
            title: "7. ملفات تعريف الارتباط",
            content:
              "نستخدم ملفات تعريف الارتباط لتحسين تجربتك. يمكنك إدارة تفضيلات ملفات تعريف الارتباط من خلال إعدادات المتصفح.",
          },
          {
            title: "8. التغييرات على هذه السياسة",
            content:
              "قد نحدث سياسة الخصوصية هذه من وقت لآخر. سنخطرك بأي تغييرات مهمة عبر البريد الإلكتروني.",
          },
          {
            title: "9. الاتصال بنا",
            content:
              "إذا كان لديك أي أسئلة حول سياسة الخصوصية هذه، يرجى الاتصال بنا على: daleel.erp.site@gmail.com",
          },
        ],
      }
    : {
        title: "Privacy Policy",
        lastUpdated: "Last Updated: December 2024",
        sections: [
          {
            title: "1. Introduction",
            content:
              "At Daleel, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our platform.",
          },
          {
            title: "2. Information We Collect",
            content:
              "We collect the following information:\n- Account information (name, email)\n- Profile information (job title, company, experience)\n- Usage information (completed paths, time spent)\n- Payment information (processed through secure payment providers)",
          },
          {
            title: "3. How We Use Information",
            content:
              "We use your information to:\n- Provide and improve our services\n- Process payments and subscriptions\n- Send important updates about your account\n- Analyze usage to improve the platform",
          },
          {
            title: "4. Information Sharing",
            content:
              "We do not sell your personal information. We may share limited information with:\n- Service providers who help us operate the platform\n- Legal authorities when required by law",
          },
          {
            title: "5. Data Security",
            content:
              "We use industry-standard security measures to protect your information, including encryption and regular security reviews.",
          },
          {
            title: "6. Your Rights",
            content:
              "You have the right to:\n- Access your personal information\n- Correct inaccurate information\n- Delete your account and data\n- Object to processing of your data",
          },
          {
            title: "7. Cookies",
            content:
              "We use cookies to enhance your experience. You can manage cookie preferences through your browser settings.",
          },
          {
            title: "8. Changes to This Policy",
            content:
              "We may update this Privacy Policy from time to time. We will notify you of any significant changes via email.",
          },
          {
            title: "9. Contact Us",
            content:
              "If you have any questions about this Privacy Policy, please contact us at: daleel.erp.site@gmail.com",
          },
        ],
      };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            {content.title}
          </h1>
          <p className="text-slate-600">{content.lastUpdated}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 md:p-12 space-y-8">
          {content.sections.map((section, index) => (
            <div key={index}>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                {section.title}
              </h2>
              <div className="text-slate-700 leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

