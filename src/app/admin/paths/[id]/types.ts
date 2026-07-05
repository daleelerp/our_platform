export interface LearningPath {
    id: string;
    title: string;
    title_ar: string;
    description: string;
    description_ar: string;
    category: string;
    difficulty_level: string;
    target_audience: string;
    career_focus?: string | null;
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
    // checkpoint_type: string;
    // checkpoint_description: string;
    // checkpoint_description_ar: string;
    // job_skills_unlocked: string[];
    // is_optional: boolean;
}

// export interface VideoContent {
//     id: string;
//     milestone_id: string;
//     youtube_video_id: string;
//     youtube_url: string;
//     title: string;
//     title_ar: string;
//     primary_language: "en" | "ar";
//     is_active: boolean;
// }
// types.ts (or wherever you define your types)

export interface VideoContent {
  id: string;
  youtube_video_id: string;
  youtube_url: string;
  channel_name?: string | null;
  channel_id?: string | null;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  view_count?: number | null;
  like_count?: number | null;
  published_at?: string | null;
  milestone_id?: string | null;
  /** Multiple playlists in one milestone: 0, 1, 2… */
  playlist_slot?: number | null;
  source_youtube_playlist_id?: string | null;
  video_order?: number | null;
  content_tier?: string | null;
  title: string;
  title_ar?: string | null;
  description?: string | null;
  description_ar?: string | null;
  difficulty_level?: string | null;
  primary_language?: string | null;
  has_arabic_subtitles?: boolean;
  has_english_subtitles?: boolean;
  has_auto_captions?: boolean;
  transcript_url?: string | null;
  transcript_text?: string | null;
  content_quality_score?: number | null;
  average_completion_rate?: number | null;
  average_rating?: number | null;
  total_ratings?: number | null;
  key_topics?: any;
  learning_objectives?: any;
  learning_objectives_ar?: any;
  tools_covered?: any;
  prerequisites?: any;
  ai_summary?: string | null;
  ai_summary_ar?: string | null;
  ai_key_takeaways?: any;
  ai_key_takeaways_ar?: any;
  requires_subscription?: boolean;
  is_embedded_allowed?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  last_synced_at?: string | null;
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

export interface QuizQuestion {
    id: string;
    quiz_id: string;
    question_type: "multiple_choice" | "true_false" | "multiple_select";
    question_text: string;
    question_text_ar: string | null;
    options: Array<{ id: string; text: string; text_ar?: string }> | null;
    correct_answers: string[];
    explanation: string | null;
    explanation_ar: string | null;
    points: number;
    question_order: number;
    image_url?: string | null;
}

export interface GeneratedQuestion {
    question_type: "multiple_choice" | "true_false" | "multiple_select";
    question_text: string;
    question_text_ar: string;
    options: Array<{ id: string; text: string; text_ar: string }> | null;
    correct_answers: string[];
    explanation: string;
    explanation_ar: string;
    points: number;
    status: "pending" | "approved" | "rejected";
}