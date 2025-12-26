import { getAdminSupabaseClient } from "@/utils/admin-supabase";
import { getAdminSession } from "@/utils/admin-auth";
import { redirect } from "next/navigation";
import { WaitlistTable } from "@/components/admin/WaitlistTable";

export default async function WaitlistPage() {
  const adminSession = await getAdminSession();

  if (!adminSession) {
    redirect("/admin/login?error=unauthorized");
  }

  const supabase = getAdminSupabaseClient();

  // Fetch all waitlist entries
  const { data: waitlistEntries, error } = await supabase
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching waitlist:", error);
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Waitlist</h1>
        <p className="text-slate-600 mt-1">
          Manage waitlist entries and contact form submissions
        </p>
      </div>

      <WaitlistTable initialData={waitlistEntries || []} />
    </div>
  );
}

