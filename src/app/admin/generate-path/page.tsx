import { getAdminSession } from "@/utils/admin-auth";
import { redirect } from "next/navigation";
import { AIContentWizard } from "@/components/AIContentWizard";

export default async function AdminGeneratePathPage() {
  const adminSession = await getAdminSession();

  if (!adminSession) {
    redirect("/admin/login?error=unauthorized");
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">AI Content Generator</h1>
        <p className="mt-2 text-slate-600">
          Follow the steps below to set up an ERP, create a plan, and generate a complete learning path with AI.
        </p>
      </div>
      <AIContentWizard />
    </div>
  );
}

