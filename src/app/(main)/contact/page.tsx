"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAppStore } from "@/store/useAppStore";

export default function ContactPage() {
  const language = useAppStore((state) => state.language);
  const user = useAppStore((state) => state.user);
  const userProfile = useAppStore((state) => state.userProfile);
  const isArabic = language === "ar";

  const [formData, setFormData] = useState({
    name: userProfile?.full_name || "",
    email: user?.email || "",
    requestTitle: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = {
    title: isArabic ? "اتصل بنا" : "Contact Us",
    subtitle: isArabic
      ? "نحن هنا للمساعدة! أرسل لنا رسالة وسنعود إليك قريباً."
      : "We're here to help! Send us a message and we'll get back to you soon.",
    name: isArabic ? "الاسم" : "Name",
    email: isArabic ? "البريد الإلكتروني" : "Email",
    requestTitle: isArabic ? "عنوان الطلب" : "Request Title",
    requestTitlePlaceholder: isArabic
      ? "مثال: سؤال عن الاشتراكات، مشكلة تقنية، اقتراح..."
      : "e.g., Question about subscriptions, Technical issue, Suggestion...",
    message: isArabic ? "الرسالة" : "Message",
    messagePlaceholder: isArabic
      ? "اكتب رسالتك هنا..."
      : "Write your message here...",
    submit: isArabic ? "إرسال" : "Send",
    submitting: isArabic ? "جاري الإرسال..." : "Sending...",
    success: isArabic
      ? "شكراً لك! تم إرسال رسالتك بنجاح. سنعود إليك قريباً."
      : "Thank you! Your message has been sent successfully. We'll get back to you soon.",
    error: isArabic
      ? "حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى."
      : "An error occurred while sending your message. Please try again.",
    required: isArabic ? "مطلوب" : "Required",
    contactInfo: isArabic ? "معلومات الاتصال" : "Contact Information",
    emailUs: isArabic ? "راسلنا على" : "Email us at",
    address: isArabic ? "العنوان" : "Address",
    phone: isArabic ? "الهاتف" : "Phone",
    responseTime: isArabic
      ? "نرد عادة خلال 24-48 ساعة"
      : "We typically respond within 24-48 hours",
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setIsSuccess(false);

    try {
      const supabase = createClient();

      // Insert into waitlist table
      // Store request title in referral_source since request_title column may not exist
      const { error: insertError } = await supabase.from("waitlist").insert({
        email: formData.email,
        full_name: formData.name || null,
        referral_source: formData.requestTitle 
          ? `contact_form: ${formData.requestTitle}${formData.message ? ` | ${formData.message.substring(0, 100)}` : ''}` 
          : "contact_form",
        status: "pending",
      });

      if (insertError) {
        // If email already exists, try to update instead
        if (insertError.code === "23505") {
          const { error: updateError } = await supabase
            .from("waitlist")
            .update({
              full_name: formData.name || null,
              referral_source: formData.requestTitle 
                ? `contact_form: ${formData.requestTitle}${formData.message ? ` | ${formData.message.substring(0, 100)}` : ''}` 
                : "contact_form",
            })
            .eq("email", formData.email);

          if (updateError) throw updateError;
        } else {
          throw insertError;
        }
      }

      // Store the message in a separate way or extend the table
      // For now, we'll add it as a note. You might want to create a separate contact_messages table
      // But per user's request, we're using the waitlist table

      setIsSuccess(true);
      setFormData({
        name: userProfile?.full_name || "",
        email: user?.email || "",
        requestTitle: "",
        message: "",
      });
    } catch (err: any) {
      setError(err.message || t.error);
    } finally {
      setIsSubmitting(false);
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

        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
              {isSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#d4ede3] flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-[#429874]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {t.success}
                  </h3>
                  <button
                    onClick={() => setIsSuccess(false)}
                    className="mt-4 text-[#429874] hover:text-[#357a5d] font-medium"
                  >
                    {isArabic ? "إرسال رسالة أخرى" : "Send another message"}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {t.name} {!user && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required={!user}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {t.email} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      disabled={!!user}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874] disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {t.requestTitle} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="requestTitle"
                      value={formData.requestTitle}
                      onChange={handleInputChange}
                      required
                      placeholder={t.requestTitlePlaceholder}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {t.message}
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows={6}
                      placeholder={t.messagePlaceholder}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
                    />
                  </div>

                  {error && (
                    <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full px-6 py-4 bg-[#429874] text-white rounded-lg font-semibold text-lg hover:bg-[#357a5d] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? t.submitting : t.submit}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                {t.contactInfo}
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">{t.emailUs}</p>
                  <a
                    href="mailto:daleel.erp.site@gmail.com"
                    className="text-[#429874] hover:text-[#357a5d] font-medium break-all"
                  >
                    daleel.erp.site@gmail.com
                  </a>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600 mb-1">{t.address}</p>
                  <p className="text-[#429874] font-medium">
                    {isArabic ? "القاهرة، مصر" : "Cairo, Egypt"}
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600 mb-1">{t.phone}</p>
                  <a
                    href="tel:+201008285889"
                    className="text-[#429874] hover:text-[#357a5d] font-medium"
                  >
                    01008285889
                  </a>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600">{t.responseTime}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

