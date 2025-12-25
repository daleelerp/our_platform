import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Create Supabase client with service role to bypass RLS
    // Admin credentials table requires service role access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseServiceKey) {
      console.error("SUPABASE_SERVICE_ROLE_KEY not set - admin login will fail");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }
    
    // Use service role client to bypass RLS
    const { createClient: createServiceClient } = await import("@supabase/supabase-js");
    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Fetch admin credentials from database
    // Note: We need service role to bypass RLS, but for now we'll use regular client
    // If RLS blocks this, we'll need to use service role client
    const { data: adminCred, error: fetchError } = await supabase
      .from("admin_credentials")
      .select("*")
      .eq("username", username)
      .eq("is_active", true)
      .single();

    if (fetchError) {
      console.error("Admin login fetch error:", fetchError);
      // If it's an RLS error, provide more helpful message
      if (fetchError.code === "PGRST116" || fetchError.message?.includes("permission denied")) {
        return NextResponse.json(
          { error: "Database access denied. Check RLS policies." },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    if (!adminCred) {
      console.log("Admin user not found:", username);
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (adminCred.locked_until && new Date(adminCred.locked_until) > new Date()) {
      return NextResponse.json(
        { error: "Account is temporarily locked. Please try again later." },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, adminCred.password_hash);

    if (!isValidPassword) {
      // Increment failed login attempts
      const failedAttempts = (adminCred.failed_login_attempts || 0) + 1;
      const updateData: any = {
        failed_login_attempts: failedAttempts,
      };

      // Lock account after 5 failed attempts for 30 minutes
      if (failedAttempts >= 5) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 30);
        updateData.locked_until = lockUntil.toISOString();
      }

      await supabase
        .from("admin_credentials")
        .update(updateData)
        .eq("id", adminCred.id);

      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Reset failed attempts and update last login
    await supabase
      .from("admin_credentials")
      .update({
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: new Date().toISOString(),
      })
      .eq("id", adminCred.id);

    // Create admin session - 1 day duration
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // 1 day session

    // Store session in database for security
    const { error: sessionError } = await supabase
      .from("admin_sessions")
      .insert({
        session_token: sessionToken,
        admin_id: adminCred.id,
        username: username,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      });

    if (sessionError) {
      console.error("Failed to create admin session:", sessionError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    // Store session in cookie
    const response = NextResponse.json({ success: true });
    
    response.cookies.set("admin_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day (86400 seconds)
      path: "/",
    });

    response.cookies.set("admin_username", username, {
      httpOnly: false, // Allow client-side access for display
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day (86400 seconds)
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}

