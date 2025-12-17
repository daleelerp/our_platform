"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "@/hooks/useTranslation";
import logo from "../../../public/Logos/2.svg";

export function LandingFooter() {
  const { t } = useTranslation();

  return (
    <footer className="bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Image src={logo} alt="Daleel" width={40} height={40} />
              <span className="text-xl font-bold text-slate-900">
                Daleel <span className="text-[#429874] font-normal">دليل</span>
              </span>
            </div>
            <p className="text-slate-600 max-w-md mb-4">
              {t("footer.tagline")}
            </p>
            <p className="text-slate-500 text-sm">
              {t("footer.madeWith")}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">{t("footer.product")}</h4>
            <ul className="space-y-2">
              <li>
                <a href="#how-it-works" className="text-slate-600 hover:text-[#429874] transition">
                  {t("nav.howItWorks")}
                </a>
              </li>
              <li>
                <Link href="/paths" className="text-slate-600 hover:text-[#429874] transition">
                  {t("nav.paths")}
                </Link>
              </li>
              <li>
                <Link href="/roadmap" className="text-slate-600 hover:text-[#429874] transition">
                  {t("footer.roadmap")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-4">{t("footer.company")}</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-slate-600 hover:text-[#429874] transition">
                  {t("nav.about")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-slate-600 hover:text-[#429874] transition">
                  {t("nav.contact")}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-slate-600 hover:text-[#429874] transition">
                  {t("footer.privacyPolicy")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-slate-600 hover:text-[#429874] transition">
                  {t("footer.termsOfService")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <p className="text-slate-500 text-sm text-center">
            © {new Date().getFullYear()} Daleel. {t("footer.allRightsReserved")}
          </p>
        </div>
      </div>
    </footer>
  );
}
