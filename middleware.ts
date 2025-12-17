import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase env vars are missing, skip auth checks and continue
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables in middleware");
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
  } catch (error) {
    // If auth fails, continue without user
    console.error("Auth error in middleware:", error);
  }

  const pathname = request.nextUrl.pathname;

  // Public routes - anyone can access
  const publicRoutes = ["/", "/auth/callback", "/about", "/plans", "/paths"];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname === route || pathname.startsWith(route + "/")
  );

  // Protected routes - require authentication
  const protectedRoutes = ["/dashboard", "/onboarding"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname === route || pathname.startsWith(route + "/")
  );

  // NOTE: We no longer handle /admin auth in middleware.
  // Admin authentication is enforced in the server components (admin pages).
  // This avoids redirect loops and simplifies middleware.

  if (isProtectedRoute && !user) {
    // Redirect to home if trying to access protected route without auth
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If user is logged in and tries to access onboarding but has completed it, redirect to dashboard
  if (user && pathname.startsWith("/onboarding")) {
    try {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();

      if (profile?.onboarding_completed) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } catch (error) {
      // If profile fetch fails, continue
      console.error("Profile fetch error in middleware:", error);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

