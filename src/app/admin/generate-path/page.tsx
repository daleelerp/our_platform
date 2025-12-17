import { getAdminSession } from "@/utils/admin-auth";
import { redirect } from "next/navigation";
import { PathGenerator } from "@/components/PathGenerator";

export default async function AdminGeneratePathPage() {
  // Enforce admin auth at the page level
  const adminSession = await getAdminSession();

  if (!adminSession) {
    redirect("/admin/login?error=unauthorized");
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Generate Learning Path</h1>
        <p className="mt-2 text-slate-600">
          Create personalized Oracle ERP learning paths with AI-powered generation
        </p>
      </div>
      <PathGenerator />
    </div>
  );
}

