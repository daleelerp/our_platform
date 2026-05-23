import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";
import { GeneratedPath, GeneratedQuizQuestion } from "@/services/pathGenerator";

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { path: generatedPath, pathId, planId } = body as {
      path: GeneratedPath;
      pathId?: string;
      planId?: string;
    };

    if (!generatedPath) {
      return NextResponse.json(
        { error: "Path data is required" },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabaseClient();

    // Create or update the learning path
    const slug = generateSlug(generatedPath.path.title);
    
    let path;
    if (pathId) {
      // Update existing path
      const { data: updatedPath, error: updateError } = await supabase
        .from("learning_paths")
        .update({
          title: generatedPath.path.title,
          title_ar: generatedPath.path.title_ar,
          slug: slug,
          description: generatedPath.path.description,
          description_ar: generatedPath.path.description_ar,
          target_audience: generatedPath.path.target_audience,
          estimated_duration_hours: generatedPath.path.estimated_duration_hours,
          difficulty_level: generatedPath.path.difficulty_level,
          prerequisites: generatedPath.path.prerequisites,
          learning_outcomes: generatedPath.path.learning_outcomes,
          career_outcomes: generatedPath.path.career_outcomes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pathId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }
      path = updatedPath;
    } else {
      // Create new path
      const { data: newPath, error: pathError } = await supabase
        .from("learning_paths")
        .insert({
          erp_module_id: null,
          title: generatedPath.path.title,
          title_ar: generatedPath.path.title_ar,
          slug: slug,
          description: generatedPath.path.description,
          description_ar: generatedPath.path.description_ar,
          target_audience: generatedPath.path.target_audience,
          estimated_duration_hours: generatedPath.path.estimated_duration_hours,
          difficulty_level: generatedPath.path.difficulty_level,
          prerequisites: generatedPath.path.prerequisites,
          learning_outcomes: generatedPath.path.learning_outcomes,
          career_outcomes: generatedPath.path.career_outcomes,
          is_published: false,
        })
        .select()
        .single();

      if (pathError) {
        throw pathError;
      }
      path = newPath;
    }

    // Delete existing milestones if updating
    if (pathId) {
      await supabase.from("path_milestones").delete().eq("learning_path_id", path.id);
    }

    // Create milestones
    const milestones = generatedPath.milestones.map((milestone: any) => ({
      learning_path_id: path.id,
      title: milestone.title,
      title_ar: milestone.title_ar,
      description: milestone.description,
      description_ar: milestone.description_ar,
      milestone_number: milestone.milestone_number,
      estimated_hours: milestone.estimated_hours,
      learning_objectives: milestone.learning_objectives,
      learning_objectives_ar: milestone.learning_objectives_ar,
      checkpoint_type: milestone.checkpoint.type,
      checkpoint_description: milestone.checkpoint.description,
      checkpoint_description_ar: milestone.checkpoint.description_ar,
      job_skills_unlocked: milestone.skills_gained,
    }));

    const { data: createdMilestones, error: milestonesError } = await supabase
      .from("path_milestones")
      .insert(milestones)
      .select();

    if (milestonesError) {
      throw milestonesError;
    }

    // Save resources and quizzes for each milestone
    const platformMap = new Map<string, string>();

    for (const milestone of generatedPath.milestones) {
      // Find the corresponding milestone data by milestone_number
      const milestoneData = createdMilestones?.find(
        (m: any) => m.milestone_number === milestone.milestone_number
      );

      if (!milestoneData) continue;

      // Create quiz and questions if checkpoint type is quiz
      if (milestone.checkpoint.type === "quiz") {
        const questions: GeneratedQuizQuestion[] = milestone.quiz_questions || [];
        const { data: quiz } = await supabase
          .from("quizzes")
          .insert({
            milestone_id: milestoneData.id,
            quiz_type: "checkpoint",
            title: `Checkpoint Quiz: ${milestone.title}`,
            title_ar: milestone.title_ar ? `اختبار: ${milestone.title_ar}` : null,
            description: milestone.checkpoint.description,
            description_ar: milestone.checkpoint.description_ar,
            passing_score: 70.0,
            is_required: true,
            difficulty_level: milestone.difficulty_level,
            question_count: questions.length,
            total_points: questions.reduce((sum, q) => sum + q.points, 0),
          })
          .select()
          .single();

        if (quiz && questions.length > 0) {
          const questionRows = questions.map((q, idx) => ({
            quiz_id: quiz.id,
            question_type: q.question_type,
            question_text: q.question_text,
            question_text_ar: q.question_text_ar,
            options: q.options,
            correct_answers: [q.correct_answer_index],
            explanation: q.explanation,
            explanation_ar: q.explanation_ar,
            difficulty_level: q.difficulty_level,
            points: q.points,
            question_order: idx + 1,
          }));
          await supabase.from("quiz_questions").insert(questionRows);
        }
      }

      // Save resources (articles, courses, videos, etc.)
      for (const resource of milestone.resources) {
        // Get or create platform
        let platformId = platformMap.get(resource.platform);

        if (!platformId) {
          const { data: platform } = await supabase
            .from("resource_platforms")
            .select("id")
            .eq("name", resource.platform)
            .single();

          if (platform) {
            platformId = platform.id;
            platformMap.set(resource.platform, platform.id);
          } else {
            // Create new platform
            const { data: newPlatform } = await supabase
              .from("resource_platforms")
              .insert({
                name: resource.platform,
                name_ar: resource.platform_ar,
                platform_type: getPlatformType(resource.platform),
                is_free: resource.is_free,
                supports_arabic: resource.language === "ar" || resource.language === "both",
              })
              .select()
              .single();

            if (newPlatform) {
              platformId = newPlatform.id;
              platformMap.set(resource.platform, newPlatform.id);
            }
          }
        }

        // Create or update resource
        // Check if resource with same URL exists
        const { data: existingResource } = await supabase
          .from("learning_resources")
          .select("id")
          .eq("url", resource.url)
          .single();

        let learningResource;
        if (existingResource) {
          // Update existing resource
          const { data: updated } = await supabase
            .from("learning_resources")
            .update({
              title: resource.title,
              title_ar: resource.title_ar,
              description: resource.selection_reason,
              description_ar: resource.selection_reason_ar,
              resource_type: resource.resource_type,
              platform_id: platformId,
              language: resource.language,
              difficulty_level: resource.difficulty_level,
              estimated_duration_minutes: resource.estimated_duration_minutes,
              is_free: resource.is_free,
              price: resource.price_egp,
              price_currency: resource.price_currency || "EGP",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingResource.id)
            .select()
            .single();
          learningResource = updated;
        } else {
          // Create new resource
          const { data: newResource } = await supabase
            .from("learning_resources")
            .insert({
              title: resource.title,
              title_ar: resource.title_ar,
              description: resource.selection_reason,
              description_ar: resource.selection_reason_ar,
              url: resource.url,
              resource_type: resource.resource_type,
              platform_id: platformId,
              language: resource.language,
              difficulty_level: resource.difficulty_level,
              estimated_duration_minutes: resource.estimated_duration_minutes,
              is_free: resource.is_free,
              price: resource.price_egp,
              price_currency: resource.price_currency || "EGP",
            })
            .select()
            .single();
          learningResource = newResource;
        }

        if (learningResource) {
          // Link resource to milestone
          await supabase
            .from("milestone_resources")
            .insert({
              milestone_id: milestoneData.id,
              resource_id: learningResource.id,
              resource_order: milestone.resources.indexOf(resource) + 1,
              is_primary: true,
              is_required: true,
              selection_reason: resource.selection_reason,
              selection_reason_ar: resource.selection_reason_ar,
            });
        }
      }
    }

    // Link path to plan if planId provided
    if (planId && path?.id) {
      const { data: existingLink } = await supabase
        .from("plan_paths")
        .select("id")
        .eq("plan_id", planId)
        .eq("learning_path_id", path.id)
        .single();

      if (!existingLink) {
        await supabase.from("plan_paths").insert({
          plan_id: planId,
          learning_path_id: path.id,
          is_featured: false,
          sort_order: 0,
        });
      }
    }

    return NextResponse.json({
      success: true,
      pathId: path.id,
      message: pathId ? "Path updated successfully" : "Path saved successfully",
    });
  } catch (error: any) {
    console.error("Error saving path:", error);
    return NextResponse.json(
      {
        error: "Failed to save path",
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getPlatformType(platformName: string): string {
  const platformMap: Record<string, string> = {
    "YouTube": "video",
    "Udemy": "learning_platform",
    "Coursera": "learning_platform",
    "Oracle Documentation": "documentation",
    "Oracle University": "official",
    "LinkedIn Learning": "learning_platform",
    "SkillShare": "learning_platform",
    "Medium": "community",
    "Custom": "learning_platform",
  };
  return platformMap[platformName] || "learning_platform";
}

