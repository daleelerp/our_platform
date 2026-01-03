export interface LearningPath {
    id: string;
    title: string;
    title_ar: string;
    description: string;
    description_ar: string;
    category: string;
    difficulty_level: string;
    target_audience: string;
    level?: string;
    estimated_duration_hours: number | string | null;
    image_url: string;
    is_active: boolean;
    is_published: boolean;
    slug?: string;
    created_at?: string;
}

export interface Milestone {
    id: string;
    learning_path_id: string;
    title: string;
    title_ar: string;
    description: string;
    description_ar: string;
    milestone_number: number;
    estimated_hours: number | string;
    learning_objectives: string[];
    learning_objectives_ar: string[];
    checkpoint_type: string;
    checkpoint_description: string;
    checkpoint_description_ar: string;
    job_skills_unlocked: string[];
    is_optional: boolean;
}

export interface NewMilestone {
    title: string;
    title_ar: string;
    description: string;
    description_ar: string;
    milestone_number: number | string;
    estimated_hours: number | string;
    learning_objectives: string[];
    learning_objectives_ar: string[];
    checkpoint_type: string;
    checkpoint_description: string;
    checkpoint_description_ar: string;
    job_skills_unlocked: string[];
    is_optional: boolean;
}

export interface VideoContent {
    id: string;
    milestone_id: string;
    youtube_video_id: string;
    youtube_url: string;
    title: string;
    title_ar: string;
    primary_language: "en" | "ar";
    is_active: boolean;
}

export interface MilestoneResource {
    id: string;
    resource_id: string;
    resource_title: string;
    url: string;
}

export interface LearningResource {
    id: string;
    title: string;
    title_ar: string;
    resource_type: string;
    url: string;
}

export interface Quiz {
    id: string;
    milestone_id: string;
    title: string;
    title_ar: string;
    description: string;
    description_ar: string;
    quiz_type: string;
    passing_score: number;
    time_limit_minutes: number | null;
    max_attempts: number | null;
    is_required: boolean;
    is_active: boolean;
}