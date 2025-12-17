"use client";

import { useEffect } from "react";

// Separate layout for login page to prevent redirect loops
// This layout doesn't check for admin session
// IMPORTANT: This layout takes precedence over /admin/layout.tsx
// Next.js will use this layout instead of the parent admin layout
export default function AdminLoginLayout({
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

  // Just render children - no session checks, no redirects
  // This prevents any redirect loops
  return <>{children}</>;
}

