"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Props = {
  adminRole: string;
  permissions: string[];
};

const menuItems = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: "📊",
    permission: null, // Everyone can see
  },
  {
    name: "Learning Paths",
    href: "/admin/paths",
    icon: "🗺️",
    permission: "manage_paths",
  },
  // {
  //   name: "Generate Path",
  //   href: "/admin/generate-path",
  //   icon: "✨",
  //   permission: "manage_paths",
  // },
  {
    name: "Resources",
    href: "/admin/resources",
    icon: "📚",
    permission: "manage_resources",
  },
  {
    name: "Countries",
    href: "/admin/countries",
    icon: "🌍",
    permission: "manage_taxonomies",
  },
  {
    name: "Providers",
    href: "/admin/providers",
    icon: "🏭",
    permission: "manage_erp",
  },
  {
    name: "Career Roadmaps",
    href: "/admin/erp-systems",
    icon: "🧩",
    permission: "manage_erp",
  },
  {
    name: "Modules || Courses",
    href: "/admin/modules",
    icon: "📦",
    permission: "manage_erp",
  },
  {
    name: "Content Tiers",
    href: "/admin/content-tiers",
    icon: "💎",
    permission: "manage_taxonomies",
  },
  {
    name: "Skills",
    href: "/admin/skills",
    icon: "🧠",
    permission: "manage_jobs",
  },
  {
    name: "Job Roles",
    href: "/admin/job-roles",
    icon: "💼",
    permission: "manage_jobs",
  },
  {
    name: "Salary Ranges",
    href: "/admin/salary-ranges",
    icon: "💰",
    permission: "manage_jobs",
  },
  {
    name: "Scraper",
    href: "/admin/scraper",
    icon: "🔍",
    permission: "scrape_resources",
  },
  {
    name: "Users",
    href: "/admin/users",
    icon: "👥",
    permission: "manage_users",
  },
  {
    name: "Plans",
    href: "/admin/plans",
    icon: "💳",
    permission: "manage_users",
  },
  {
    name: "Subscriptions",
    href: "/admin/subscriptions",
    icon: "📋",
    permission: "manage_users",
  },
  {
    name: "Discounts",
    href: "/admin/discounts",
    icon: "🎟️",
    permission: "manage_users",
  },
  {
    name: "Analytics",
    href: "/admin/analytics",
    icon: "📈",
    permission: "view_analytics",
  },
  {
    name: "Waitlist",
    href: "/admin/waitlist",
    icon: "📝",
    permission: "view_analytics",
  },
];

export function AdminSidebar({ adminRole, permissions }: Props) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const hasPermission = (permission: string | null) => {
    if (!permission) return true;
    // Treat "*" as full-access wildcard
    if (permissions.includes("*")) return true;
    return permissions.includes(permission) || adminRole === "super_admin";
  };

  const visibleItems = menuItems.filter((item) => hasPermission(item.permission));

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛠️</span>
          <span className="font-semibold text-white">Admin Panel</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-white p-2"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed top-0 left-0 z-40 h-screen w-64 bg-slate-900 transform transition-transform duration-300
        lg:translate-x-0 flex flex-col
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-6 border-b border-slate-700 flex-shrink-0">
          <span className="text-2xl">🛠️</span>
          <div>
            <span className="font-semibold text-white">Daleel Admin</span>
            <span className="block text-xs text-slate-400 capitalize">{adminRole.replace("_", " ")}</span>
          </div>
        </div>

        {/* Navigation (scrollable) */}
        <nav className="mt-6 px-3 flex-1 overflow-y-auto min-h-0">
          <ul className="space-y-1 pb-24">
            {visibleItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== "/admin" && pathname.startsWith(item.href));
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${isActive 
                        ? "bg-teal-600 text-white" 
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"}
                    `}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-slate-700">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            Back to App
          </Link>
        </div>
      </aside>

      {/* Spacer for mobile */}
      <div className="lg:hidden h-14" />
    </>
  );
}

