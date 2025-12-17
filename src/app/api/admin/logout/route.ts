import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearAdminSession } from "@/utils/admin-auth";

export async function POST() {
  await clearAdminSession();
  return NextResponse.json({ success: true });
}

