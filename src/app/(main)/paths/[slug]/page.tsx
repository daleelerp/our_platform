import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { PathDetailContent } from "@/components/PathDetailContent";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PathDetailPage({ params }: Props) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch the path details
  const { data: path, error } = await supabase
    .from("learning_paths")
    .select(`
      *,
      erp_modules (
        *,
        erp_systems (*)
      )
    `)
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error || !path) {
    redirect("/paths");
  }

  // Fetch milestones for this path
  const { data: milestones } = await supabase
    .from("path_milestones")
    .select("*")
    .eq("learning_path_id", path.id)
    .eq("is_active", true)
    .order("milestone_number");

  // Fetch enrollment if user is logged in
  let enrollment = null;
  if (user) {
    const { data: enrollmentData } = await supabase
      .from("path_enrollments")
      .select("*")
      .eq("user_id", user.id)
      .eq("learning_path_id", path.id)
      .maybeSingle();
    
    enrollment = enrollmentData;
  }

  return (
    <PathDetailContent 
      path={path}
      milestones={milestones || []}
      isLoggedIn={!!user}
      userId={user?.id || null}
      enrollment={enrollment}
    />
  );
}

