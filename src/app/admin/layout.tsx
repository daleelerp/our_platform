"use client";

import { useEffect } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

/**
 * Admin Layout
 *
 * NOTE: We no longer perform any auth checks here.
 * All admin authentication is enforced inside each admin page
 * using `getAdminSession()` and `redirect()` in the server components.
 *
 * This layout is purely for UI chrome (sidebar + content area).
 * Admin pages are always LTR (English only).
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Force LTR for admin pages (admin is English only)
  useEffect(() => {
    document.documentElement.dir = "ltr";
    document.documentElement.lang = "en";
    
    // Cleanup: restore on unmount if needed (though admin should stay LTR)
    return () => {
      // Don't restore - admin should always be LTR
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-100" dir="ltr">
      <AdminSidebar adminRole="admin" permissions={["*"]} />
      <div className="lg:pl-64">
        <main className="py-6 px-4 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

