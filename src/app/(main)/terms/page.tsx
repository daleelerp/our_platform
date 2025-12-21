"use client";

import { useAppStore } from "@/store/useAppStore";

export default function TermsOfServicePage() {
  const language = useAppStore((state) => state.language);
  const isArabic = language === "ar";

  const content = isArabic
    ? {
        title: "شروط الخدمة",
        lastUpdated: "آخر تحديث: ديسمبر 2024",
        sections: [
          {
            title: "1. قبول الشروط",
            content:
              "من خلال الوصول إلى واستخدام منصة دليل (Daleel)، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على هذه الشروط، يرجى عدم استخدام خدماتنا.",
          },
          {
            title: "2. استخدام الخدمة",
            content:
              "يمكنك استخدام منصتنا للأغراض التعليمية والشخصية فقط. يُحظر:\n- نسخ أو توزيع المحتوى دون إذن\n- استخدام الخدمة لأغراض غير قانونية\n- محاولة الوصول غير المصرح به إلى النظام\n- إزعاج أو إيذاء المستخدمين الآخرين",
          },
          {
            title: "3. الحسابات والاشتراكات",
            content:
              "- أنت مسؤول عن الحفاظ على أمان حسابك\n- يجب أن تكون المعلومات المقدمة دقيقة ومحدثة\n- الاشتراكات قابلة للإلغاء في أي وقت\n- المدفوعات غير قابلة للاسترداد إلا كما هو محدد في سياسة الاسترداد",
          },
          {
            title: "4. المحتوى والملكية الفكرية",
            content:
              "- جميع المحتوى على المنصة محمي بحقوق الطبع والنشر\n- المحتوى مخصص للاستخدام الشخصي فقط\n- لا يجوز إعادة نشر أو بيع المحتوى\n- نحتفظ بجميع حقوق الملكية الفكرية",
          },
          {
            title: "5. سياسة الاسترداد",
            content:
              "لا يوجد استرداد للأموال تحت أي ظرف من الظروف. جميع المدفوعات نهائية وغير قابلة للاسترداد.",
          },
          {
            title: "6. إخلاء المسؤولية",
            content:
              "نقدم المحتوى 'كما هو' دون أي ضمانات. لا نضمن دقة أو اكتمال أو فائدة أي محتوى. استخدامك للمنصة على مسؤوليتك الخاصة.",
          },
          {
            title: "7. الحد من المسؤولية",
            content:
              "لن نكون مسؤولين عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام أو عدم القدرة على استخدام خدماتنا.",
          },
          {
            title: "8. الإنهاء",
            content:
              "قد ننهي أو نعلق وصولك إلى الخدمة في أي وقت، مع أو بدون إشعار، لأي سبب من الأسباب، بما في ذلك انتهاك هذه الشروط.",
          },
          {
            title: "9. التغييرات على الشروط",
            content:
              "قد نحدث هذه الشروط من وقت لآخر. سيتم إشعارك بأي تغييرات مهمة. الاستمرار في استخدام الخدمة بعد التغييرات يشكل قبولك للشروط المحدثة.",
          },
          {
            title: "10. القانون الحاكم",
            content:
              "تخضع هذه الشروط وتحكمها قوانين جمهورية مصر العربية. أي نزاعات سيتم حلها في محاكم مصر.",
          },
          {
            title: "11. الاتصال بنا",
            content:
              "إذا كان لديك أي أسئلة حول هذه الشروط، يرجى الاتصال بنا على: daleel.erp.site@gmail.com",
          },
        ],
      }
    : {
        title: "Terms of Service",
        lastUpdated: "Last Updated: December 2024",
        sections: [
          {
            title: "1. Acceptance of Terms",
            content:
              "By accessing and using the Daleel platform, you agree to be bound by these terms and conditions. If you do not agree to these terms, please do not use our services.",
          },
          {
            title: "2. Use of Service",
            content:
              "You may use our platform for educational and personal purposes only. Prohibited activities include:\n- Copying or distributing content without permission\n- Using the service for illegal purposes\n- Attempting unauthorized access to the system\n- Harassing or harming other users",
          },
          {
            title: "3. Accounts and Subscriptions",
            content:
              "- You are responsible for maintaining the security of your account\n- Information provided must be accurate and up-to-date\n- Subscriptions can be cancelled at any time\n- Payments are non-refundable except as specified in refund policy",
          },
          {
            title: "4. Content and Intellectual Property",
            content:
              "- All content on the platform is protected by copyright\n- Content is for personal use only\n- Content may not be republished or resold\n- We retain all intellectual property rights",
          },
          {
            title: "5. Refund Policy",
            content:
              "There is no refund under any circumstances. All payments are final and non-refundable.",
          },
          {
            title: "6. Disclaimer",
            content:
              "We provide content 'as is' without any warranties. We do not guarantee the accuracy, completeness, or usefulness of any content. Your use of the platform is at your own risk.",
          },
          {
            title: "7. Limitation of Liability",
            content:
              "We shall not be liable for any direct or indirect damages arising from the use or inability to use our services.",
          },
          {
            title: "8. Termination",
            content:
              "We may terminate or suspend your access to the service at any time, with or without notice, for any reason, including violation of these terms.",
          },
          {
            title: "9. Changes to Terms",
            content:
              "We may update these terms from time to time. You will be notified of any significant changes. Continued use of the service after changes constitutes acceptance of the updated terms.",
          },
          {
            title: "10. Governing Law",
            content:
              "These terms are governed by the laws of the Arab Republic of Egypt. Any disputes will be resolved in Egyptian courts.",
          },
          {
            title: "11. Contact Us",
            content:
              "If you have any questions about these terms, please contact us at: daleel.erp.site@gmail.com",
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

