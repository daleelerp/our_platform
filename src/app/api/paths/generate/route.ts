import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";
import { generatePersonalizedPath, PathGenerationRequest } from "@/services/pathGenerator";

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
    const {
      language = "en",
      experienceLevel,
      targetRole,
      focusArea,
      budgetTier,
      estimatedBudget,
      oracleModule,
      careerGoals,
      timeCommitment,
    } = body;

    // Validate required fields
    if (!experienceLevel || !budgetTier) {
      return NextResponse.json(
        { error: "Missing required fields: experienceLevel and budgetTier" },
        { status: 400 }
      );
    }

    // Use admin supabase client
    const supabase = getAdminSupabaseClient();

    // Build generation request
    const generationRequest: PathGenerationRequest = {
      userPreferences: {
        language: language as "en" | "ar",
        experienceLevel: experienceLevel as any,
        targetRole,
        focusArea: focusArea as any,
        budgetTier: budgetTier as any,
        estimatedBudget,
      },
      oracleModule,
      careerGoals,
      timeCommitment,
    };

    // Generate the path
    const generatedPath = await generatePersonalizedPath(generationRequest);

    // Save to database (optional - can be saved as draft or published)
    // Note: We use adminId for tracking, but paths don't have a created_by field
    const savedPath = await saveGeneratedPathToDatabase(
      supabase,
      adminSession.adminId,
      generatedPath,
      generationRequest
    );

    return NextResponse.json({
      success: true,
      path: generatedPath,
      savedPathId: savedPath?.id,
    });

  } catch (error: any) {
    console.error("Path generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate path",
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Save generated path to database
 */
async function saveGeneratedPathToDatabase(
  supabase: any,
  adminId: string,
  generatedPath: any,
  request: PathGenerationRequest
) {
  try {
    // First, get or create Oracle ERP system
    const { data: oracleSystem } = await supabase
      .from("erp_systems")
      .select("id")
      .eq("name", "Oracle ERP")
      .single();

    if (!oracleSystem) {
      console.error("Oracle ERP system not found in database");
      return null;
    }

    // Create the learning path
    const slug = generateSlug(generatedPath.path.title);
    
    const { data: path, error: pathError } = await supabase
      .from("learning_paths")
      .insert({
        erp_module_id: null, // Can be set if oracleModule is specified
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
        is_published: false, // Start as draft
      })
      .select()
      .single();

    if (pathError) {
      console.error("Error creating path:", pathError);
      return null;
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

    const { error: milestonesError } = await supabase
      .from("path_milestones")
      .insert(milestones);

    if (milestonesError) {
      console.error("Error creating milestones:", milestonesError);
    }

    // Save resources and quizzes for each milestone
    for (const milestone of generatedPath.milestones) {
      const milestoneData = milestones.find(
        (m: any) => m.milestone_number === milestone.milestone_number
      );
      
      if (!milestoneData) continue;

      // Create quiz/exam if checkpoint type is quiz
      if (milestone.checkpoint.type === "quiz") {
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
          })
          .select()
          .single();

        if (quiz) {
          console.log(`Created quiz for milestone ${milestone.milestone_number}`);
        }
      }

      // Get or create platform
      const platformMap = new Map<string, string>();
      
      for (const resource of milestone.resources) {
        // Normalize platform name (fallback to 'Other' if missing)
        const platformName: string = resource.platform || "Other";

        // Get or create platform
        let platformId: string | undefined = platformMap.get(platformName);
        
        if (!platformId) {
          const { data: platform } = await supabase
            .from("resource_platforms")
            .select("id")
            .eq("name", platformName)
            .single();

          if (platform) {
            // platform.id is guaranteed to be a string here
            platformId = platform.id;
            platformMap.set(platformName, platform.id);
          } else {
            // Create new platform
            const { data: newPlatform } = await supabase
              .from("resource_platforms")
              .insert({
                name: platformName,
                name_ar: resource.platform_ar,
                platform_type: getPlatformType(platformName),
                is_free: resource.is_free,
                supports_arabic: resource.language === "ar" || resource.language === "both",
              })
              .select()
              .single();
            
            if (newPlatform) {
              platformId = newPlatform.id;
              platformMap.set(platformName, newPlatform.id);
            }
          }
        }

        // Skip if we couldn't get/create platform
        if (!platformId) {
          console.warn(`Could not get or create platform for resource: ${resource.title}`);
          continue;
        }

        // Create resource
        const { data: learningResource } = await supabase
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

    return path;
  } catch (error) {
    console.error("Error saving path to database:", error);
    return null;
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
  };
  return platformMap[platformName] || "learning_platform";
}

