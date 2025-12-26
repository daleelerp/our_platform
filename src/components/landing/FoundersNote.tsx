"use client";

import Image from "next/image";
import { useTranslation } from "@/hooks/useTranslation";
import founderImage from "../../../public/Founder/Magdy Image.jpg";

export function FoundersNote() {
  const { t } = useTranslation();

  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-50 to-[#f0f9f6]/30 rounded-3xl p-8 md:p-12 border border-slate-200">
          <div className="flex items-start gap-4 mb-6">
            <Image 
              src={founderImage} 
              alt="Founder" 
              width={64} 
              height={64} 
              className="flex-shrink-0 rounded-full object-cover w-16 h-16 border-2 border-white shadow-lg" 
            />
            <div>
              <h3 className="text-xl font-bold text-slate-900">{t("founder.title")}</h3>
              <p className="text-slate-500">{t("founder.subtitle")}</p>
            </div>
          </div>

          <div className="space-y-4 text-slate-700 leading-relaxed">
            <p>
              <span className="text-2xl mr-2">👋</span>
              {t("founder.paragraph1")}
            </p>
            
            <p>
              <strong className="text-slate-900">{t("founder.highlight")}</strong>
            </p>

            <p>{t("founder.paragraph2")}</p>

            <p>{t("founder.paragraph3")}</p>

            <p>{t("founder.paragraph4")}</p>

            <p className="text-[#285c46] font-medium">
              {t("founder.paragraph5")}
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">{t("founder.teamName")}</p>
              <p className="text-sm text-slate-500">{t("founder.teamTagline")}</p>
            </div>
            <div className="flex gap-3">
              <a
                href="https://www.linkedin.com/in/mohamed-magdy-0a305924a?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3Bks6YKhmITj%2BLGCN3HBK5%2Bg%3D%3D"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-[#d4ede3] hover:text-[#429874] transition"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
              <a
                href="https://www.instagram.com/the.magdy/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-[#d4ede3] hover:text-[#429874] transition"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5A4.25 4.25 0 0 0 20.5 16.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5zm4.25 3.25a5.25 5.25 0 1 1 0 10.5 5.25 5.25 0 0 1 0-10.5zm0 1.5A3.75 3.75 0 1 0 15.75 12 3.75 3.75 0 0 0 12 8.25zm5-1a1 1 0 1 1-1 1 1 1 0 0 1 1-1z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
