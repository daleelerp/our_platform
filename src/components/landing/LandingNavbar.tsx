"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { LoginButton } from "../auth/LoginButton";
import { useTranslation } from "@/hooks/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import { createClient } from "@/utils/supabase/client";
import logo from "../../../public/Logos/2.svg";

export function LandingNavbar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const language = useAppStore((state) => state.language);
  const user = useAppStore((state) => state.user);
  const userProfile = useAppStore((state) => state.userProfile);
  const setUser = useAppStore((state) => state.setUser);
  const setUserProfile = useAppStore((state) => state.setUserProfile);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const supabase = createClient();

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setUser(authUser);
        
        if (authUser) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", authUser.id)
            .single();
          
          if (profile) {
            setUserProfile(profile);
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        // Always set loading to false, even on error
        setIsLoading(false);
      }
    };

    checkAuth();
    
    // Fallback: ensure loading state doesn't block forever
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000); // 5 second timeout
    
    return () => clearTimeout(timeout);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT") {
          setUser(null);
          setUserProfile(null);
        } else if (session?.user) {
          setUser(session.user);
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          setUserProfile(profile);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setShowUserMenu(false);
    setIsMobileMenuOpen(false);
    
    try {
      // Clear state first for immediate UI update
      setUser(null);
      setUserProfile(null);
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Force a hard refresh to clear all cached data
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      // Still redirect even on error
      window.location.href = "/";
    }
  };

  // Home link should go to dashboard if user is logged in, otherwise to homepage
  const homeHref = user ? "/dashboard" : "/";
  
  const navLinks = [
    { href: homeHref, label: t("nav.home"), exact: true },
    { href: "/paths", label: t("nav.paths"), exact: false },
    { href: "/path-finder", label: language === "ar" ? "اكتشف مسارك" : "Find Your Path", exact: true },
    // Only show plans, job roles and salary ranges for logged-in users
    ...(user ? [
      { href: "/plans", label: language === "ar" ? "الخطط" : "Plans", exact: true },
      { href: "/job-roles", label: language === "ar" ? "الأدوار الوظيفية" : "Job Roles", exact: true },
      { href: "/salary-ranges", label: language === "ar" ? "نطاقات الرواتب" : "Salary Ranges", exact: true },
    ] : []),
  ];

  // Check if link is active
  const isActive = (href: string, exact: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={homeHref} className="flex items-center gap-2">
            <Image src={logo} alt="Daleel" width={36} height={36} />
            <span className="text-xl font-bold text-slate-900">Daleel</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = isActive(link.href, link.exact);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 text-sm font-medium transition ${
                    active 
                      ? "text-[#429874]" 
                      : "text-slate-600 hover:text-[#429874]"
                  }`}
                >
                  {link.label}
                  {/* Active indicator line */}
                  {active && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#429874] rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Desktop Right side */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse pointer-events-none" />
            ) : user ? (
              <div className="relative z-[55]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUserMenu(!showUserMenu);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer relative z-[55]"
                  type="button"
                  aria-label="User menu"
                >
                  {userProfile?.avatar_url ? (
                    <img 
                      src={userProfile.avatar_url} 
                      alt="" 
                      className="w-8 h-8 rounded-full pointer-events-none"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#d4ede3] text-[#285c46] flex items-center justify-center text-sm font-medium pointer-events-none">
                      {userProfile?.full_name?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* User dropdown menu */}
                {showUserMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-[45]" 
                      onClick={() => setShowUserMenu(false)} 
                    />
                    <div className={`absolute top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-[60] ${language === "ar" ? "left-0" : "right-0"}`}>
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {userProfile?.full_name || (language === "ar" ? "مستخدم" : "User")}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                      <Link
                        href="/dashboard"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {language === "ar" ? "لوحة التحكم" : "Dashboard"}
                      </Link>
                      <Link
                        href="/paths"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {language === "ar" ? "مساراتي" : "My Paths"}
                      </Link>
                      <Link
                        href="/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {language === "ar" ? "الملف الشخصي" : "Profile"}
                      </Link>
                      <hr className="my-2 border-slate-100" />
                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full text-start px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {isLoggingOut 
                          ? (language === "ar" ? "جاري الخروج..." : "Logging out...")
                          : (language === "ar" ? "تسجيل الخروج" : "Logout")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <LoginButton />
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMobileMenuOpen(!isMobileMenuOpen);
              }}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer relative z-[55]"
              type="button"
              aria-label="Toggle mobile menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200">
            <div className="space-y-1">
              {navLinks.map((link) => {
                const active = isActive(link.href, link.exact);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-4 py-2.5 rounded-lg transition ${
                      active
                        ? "bg-[#f0f9f6] text-[#285c46] font-medium border-s-4 border-[#429874]"
                        : "text-slate-600 hover:text-[#429874] hover:bg-slate-50"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-200 px-4">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 mb-3">
                    {userProfile?.avatar_url ? (
                      <img src={userProfile.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#d4ede3] text-[#285c46] flex items-center justify-center font-medium">
                        {userProfile?.full_name?.[0] || "U"}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-slate-900">{userProfile?.full_name || "User"}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full text-center py-2 bg-[#429874] text-white rounded-lg font-medium"
                  >
                    {language === "ar" ? "لوحة التحكم" : "Dashboard"}
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="block w-full text-center py-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                  >
                    {isLoggingOut 
                      ? (language === "ar" ? "جاري الخروج..." : "Logging out...")
                      : (language === "ar" ? "تسجيل الخروج" : "Logout")}
                  </button>
                </div>
              ) : (
                <LoginButton className="w-full justify-center" />
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
