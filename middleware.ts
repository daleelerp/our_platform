import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const SCRAPER_UA_PATTERNS = [
  /python-requests/i,
  /curl/i,
  /wget/i,
  /httpclient/i,
  /scrapy/i,
  /beautifulsoup/i,
  /selenium/i,
  /playwright/i,
  /puppeteer/i,
  /headlesschrome/i,
  /go-http-client/i,
];

function isLikelyScraper(userAgent: string): boolean {
  if (!userAgent) return true;
  return SCRAPER_UA_PATTERNS.some((pattern) => pattern.test(userAgent));
}

function isRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = rateLimitStore.get(key);
  if (!existing || now > existing.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  existing.count += 1;
  rateLimitStore.set(key, existing);
  return existing.count > maxRequests;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const userAgent = request.headers.get("user-agent") || "";
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const ip = forwardedFor.split(",")[0]?.trim() || "unknown";

  // Basic anti-scraping controls for frequently scraped routes.
  const protectedScrapeTargets =
    pathname.startsWith("/paths") ||
    pathname.startsWith("/plans") ||
    pathname.startsWith("/api/");

  if (protectedScrapeTargets && isLikelyScraper(userAgent)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (protectedScrapeTargets) {
    const key = `${ip}:${pathname}`;
    if (isRateLimited(key, 120, 60_000)) {
      return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
    }
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Support both variable names (new Supabase uses PUBLISHABLE_DEFAULT_KEY)
  const supabaseKey = 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  // If Supabase env vars are missing, skip auth checks and continue
  if (!supabaseUrl || !supabaseKey) {
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
  } catch (error: any) {
    // If auth fails, continue without user
    // Keep middleware silent in production to avoid leaking internals.
  }

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
    }
  }

  // If user is logged in and tries to access home page, redirect to dashboard
  // This ensures logged-in users always go to their dashboard when returning to the site
  if (user && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
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

