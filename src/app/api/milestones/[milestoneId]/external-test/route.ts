/**
 * API Route for External Test Integration
 * 
 * Allows external testing systems to report test results
 * POST /api/milestones/[milestoneId]/external-test
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { recordExternalTestResult } from "@/utils/milestoneProgress";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ milestoneId: string }> }
) {
  try {
    const { milestoneId } = await params;
    const body = await request.json();

    // Validate required fields
    const { userId, testId, testName, score, passingScore, isPassed, completedAt } = body;

    if (!userId || !testId || !testName || score === undefined || passingScore === undefined || isPassed === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: userId, testId, testName, score, passingScore, isPassed" },
        { status: 400 }
      );
    }

    // Verify user exists and is authenticated (if using auth token)
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    // If user is authenticated, verify they match the userId in request
    // Otherwise, allow external systems to report results (with proper security)
    if (user && user.id !== userId) {
      return NextResponse.json(
        { error: "Unauthorized: User ID mismatch" },
        { status: 403 }
      );
    }

    // Record the external test result (pass server-side supabase client)
    const success = await recordExternalTestResult(
      userId, 
      milestoneId, 
      {
        testId,
        testName,
        score: parseFloat(score),
        passingScore: parseFloat(passingScore),
        isPassed: Boolean(isPassed),
        completedAt: completedAt || new Date().toISOString(),
        externalSystem: body.externalSystem || null,
        certificateUrl: body.certificateUrl || null,
        metadata: body.metadata || null,
      },
      supabase // Pass server-side client
    );

    if (!success) {
      return NextResponse.json(
        { error: "Failed to record test result. Check if external_test_results table exists." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "External test result recorded successfully",
    });

  } catch (error: any) {
    console.error("Error recording external test:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

