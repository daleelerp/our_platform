import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/OnboardingForm";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { OnboardingWelcome } from "@/components/OnboardingWelcome";
import Image from "next/image";
import logo from "../../../../public/Logos/2.svg";

export default async function OnboardingPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Check if onboarding is already complete
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Minimal header with logo and language switcher */}
      <div className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src={logo} alt="Daleel" width={28} height={28} />
            <span className="text-xl font-bold text-slate-900">Daleel</span>
          </div>
          <div>
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        <OnboardingWelcome />

        <OnboardingForm
          initialData={{
            full_name: profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "",
            avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || "",
            job_title: profile?.job_title || "",
            experience_level: profile?.experience_level || "",
            company_name: profile?.company_name || "",
            industry: profile?.industry || "",
            country: profile?.country || "",
            city: profile?.city || "",
            student_status: profile?.student_status || "",
          }}
          isNameFromGoogle={!!(user.user_metadata?.full_name || user.user_metadata?.name)}
        />
      </div>
    </main>
  );
}

