"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type LearningPath = {
  id: string;
  title: string;
  title_ar: string | null;
  slug: string;
  description: string | null;
  description_ar: string | null;
  target_audience: string | null;
  estimated_duration_hours: number | null;
  difficulty_level: string | null;
  is_published: boolean;
};

type Milestone = {
  id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  milestone_number: number;
  estimated_hours: number | null;
  learning_objectives: string[] | null;
  learning_objectives_ar: string[] | null;
  checkpoint_type: string | null;
  checkpoint_description: string | null;
  checkpoint_description_ar: string | null;
  job_skills_unlocked: string[] | null;
  is_optional: boolean;
};

type MilestoneResource = {
  id: string;
  resource_id: string;
  resource_title: string;
  url: string;
};

type LearningResource = {
  id: string;
  title: string;
  title_ar: string | null;
  url: string;
  resource_type: string;
};

type VideoContent = {
  id: string;
  youtube_url: string;
  youtube_video_id: string;
  title: string;
  title_ar?: string | null;
  content_tier: string | null;
  primary_language?: string | null;
};

type Quiz = {
  id: string;
  title: string;
  title_ar: string | null;
  quiz_type: string;
  passing_score: number;
  description: string | null;
  description_ar: string | null;
  time_limit_minutes: number | null;
  max_attempts: number | null;
  is_required: boolean;
  is_active: boolean;
};

type NewMilestone = {
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  milestone_number: number | "";
  estimated_hours: number | "";
  learning_objectives: string[];
  learning_objectives_ar: string[];
  checkpoint_type: string;
  checkpoint_description: string;
  checkpoint_description_ar: string;
  job_skills_unlocked: string[];
  is_optional: boolean;
};

export default function EditPathPage() {
  const params = useParams();
  const router = useRouter();
  const pathId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const [path, setPath] = useState<LearningPath | null>(null);
  const [formData, setFormData] = useState<Partial<LearningPath>>({});

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [videosByMilestone, setVideosByMilestone] = useState<
    Record<string, VideoContent[]>
  >({});
  const [resourcesByMilestone, setResourcesByMilestone] = useState<
    Record<string, MilestoneResource[]>
  >({});
  const [quizzesByMilestone, setQuizzesByMilestone] = useState<
    Record<string, Quiz[]>
  >({});

  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
  
  const [newMilestone, setNewMilestone] = useState<NewMilestone>({
    title: "",
    title_ar: "",
    description: "",
    description_ar: "",
    milestone_number: "",
    estimated_hours: "",
    learning_objectives: [],
    learning_objectives_ar: [],
    checkpoint_type: "quiz",
    checkpoint_description: "",
    checkpoint_description_ar: "",
    job_skills_unlocked: [],
    is_optional: false,
  });

  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<NewMilestone | null>(null);

  const [allResources, setAllResources] = useState<LearningResource[]>([]);
  const [resourceSearch, setResourceSearch] = useState<
    Record<string, string>
  >({});

  const [newVideo, setNewVideo] = useState<
    Record<
      string,
      {
        youtube_url: string;
        title: string;
        title_ar: string;
        language: "en" | "ar";
      }
    >
  >({});
  const [newResource, setNewResource] = useState<
    Record<
      string,
      {
        resource_id: string;
      }
    >
  >({});

  const [newQuiz, setNewQuiz] = useState<
    Record<
      string,
      {
        title: string;
        title_ar: string;
        description: string;
        description_ar: string;
        quiz_type: string;
        passing_score: number | "";
        time_limit_minutes: number | "";
        max_attempts: number | "";
        is_required: boolean;
      }
    >
  >({});

  const [newArticle, setNewArticle] = useState<
    Record<
      string,
      {
        title: string;
        title_ar: string;
        description: string;
        description_ar: string;
        url: string;
        platform: string;
        language: string;
        is_free: boolean;
      }
    >
  >({});

  const [scrapingArticle, setScrapingArticle] = useState<
    Record<string, { query: string; source: string; isScraping: boolean }>
  >({});

  useEffect(() => {
    const loadData = async () => {
      if (!pathId) return;
      setLoading(true);
      setError("");

      try {
        // Fetch learning path
        const pathRes = await fetch(
          `/api/admin/data?table=learning_paths&id=${encodeURIComponent(
            pathId
          )}`
        );
        const pathJson = await pathRes.json();
        if (!pathRes.ok) {
          throw new Error(pathJson.error || "Failed to load path");
        }

        const lp: LearningPath = pathJson.data;
        setPath(lp);
        setFormData(lp);

        // Fetch milestones for this path
        const milestonesRes = await fetch(
          `/api/admin/data?table=path_milestones&filterColumn=learning_path_id&filterValue=${encodeURIComponent(
            pathId
          )}&limit=100`
        );
        const milestonesJson = await milestonesRes.json();
        if (!milestonesRes.ok) {
          throw new Error(
            milestonesJson.error || "Failed to load milestones"
          );
        }
        const ms: Milestone[] = (milestonesJson.data || []).sort(
          (a: Milestone, b: Milestone) =>
            (a.milestone_number || 0) - (b.milestone_number || 0)
        );
        setMilestones(ms);

        // Fetch all learning resources once for linking (for search dropdown)
        const resourcesAllRes = await fetch(
          `/api/admin/data?table=learning_resources&limit=500`
        );
        const resourcesAllJson = await resourcesAllRes.json();
        if (resourcesAllRes.ok) {
          setAllResources(resourcesAllJson.data || []);
        } else {
          console.error(
            "Failed to load learning resources list",
            resourcesAllJson.error
          );
        }

        // Fetch videos, resources, and quizzes for each milestone
        const videosMap: Record<string, VideoContent[]> = {};
        const resourcesMap: Record<string, MilestoneResource[]> = {};
        const quizzesMap: Record<string, Quiz[]> = {};
        await Promise.all(
          ms.map(async (m) => {
            const videosRes = await fetch(
              `/api/admin/data?table=video_content&filterColumn=milestone_id&filterValue=${encodeURIComponent(
                m.id
              )}&limit=100`
            );
            const videosJson = await videosRes.json();
            if (videosRes.ok) {
              videosMap[m.id] = videosJson.data || [];
            } else {
              console.error(
                "Failed to load videos for milestone",
                m.id,
                videosJson.error
              );
              videosMap[m.id] = [];
            }

            // Fetch milestone resources joined with learning_resources
            const resourcesRes = await fetch(
              `/api/admin/data?table=milestone_resources_view&filterColumn=milestone_id&filterValue=${encodeURIComponent(
                m.id
              )}&limit=100`
            );
            const resourcesJson = await resourcesRes.json();
            if (resourcesRes.ok) {
              resourcesMap[m.id] = (resourcesJson.data || []).map((r: any) => ({
                id: r.id,
                resource_id: r.resource_id,
                resource_title: r.resource_title || r.title || "Untitled",
                url: r.url,
              }));
            } else {
              resourcesMap[m.id] = [];
            }

            // Fetch quizzes for this milestone
            const quizzesRes = await fetch(
              `/api/admin/data?table=quizzes&filterColumn=milestone_id&filterValue=${encodeURIComponent(
                m.id
              )}&limit=100`
            );
            const quizzesJson = await quizzesRes.json();
            if (quizzesRes.ok) {
              quizzesMap[m.id] = quizzesJson.data || [];
            } else {
              console.error(
                "Failed to load quizzes for milestone",
                m.id,
                quizzesJson.error
              );
              quizzesMap[m.id] = [];
            }
          })
        );
        setVideosByMilestone(videosMap);
        setResourcesByMilestone(resourcesMap);
        setQuizzesByMilestone(quizzesMap);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [pathId]);

  const handlePathSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pathId) return;

    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/data?table=learning_paths&id=${encodeURIComponent(
          pathId
        )}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            estimated_duration_hours: formData.estimated_duration_hours
              ? Number(formData.estimated_duration_hours)
              : null,
          }),
        }
      );

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Failed to update path");
      }

      setPath(json.data);
      setFormData(json.data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  // Calculate next milestone number automatically
  const getNextMilestoneNumber = () => {
    if (milestones.length === 0) return 1;
    const maxNumber = Math.max(...milestones.map(m => m.milestone_number || 0));
    return maxNumber + 1;
  };

  const handleOpenAddMilestoneModal = () => {
    // Auto-calculate milestone number
    const nextNumber = getNextMilestoneNumber();
    setNewMilestone(prev => ({
      ...prev,
      milestone_number: nextNumber,
    }));
    setShowAddMilestoneModal(true);
  };

  const handleCloseAddMilestoneModal = () => {
    setShowAddMilestoneModal(false);
    setNewMilestone({
      title: "",
      title_ar: "",
      description: "",
      description_ar: "",
      milestone_number: "",
      estimated_hours: "",
      learning_objectives: [],
      learning_objectives_ar: [],
      checkpoint_type: "quiz",
      checkpoint_description: "",
      checkpoint_description_ar: "",
      job_skills_unlocked: [],
      is_optional: false,
    });
  };

  const handleAddMilestone = async () => {
    if (!pathId) return;
    if (!newMilestone.title.trim()) {
      alert("Please enter a title.");
      return;
    }

    // Auto-calculate milestone number if not set
    const milestoneNumber = newMilestone.milestone_number || getNextMilestoneNumber();

    try {
      const res = await fetch("/api/admin/data?table=path_milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          learning_path_id: pathId,
          title: newMilestone.title.trim(),
          title_ar: newMilestone.title_ar.trim() || null,
          description: newMilestone.description.trim() || null,
          description_ar: newMilestone.description_ar.trim() || null,
          milestone_number: milestoneNumber,
          estimated_hours: newMilestone.estimated_hours
            ? Number(newMilestone.estimated_hours)
            : null,
          learning_objectives: newMilestone.learning_objectives.length > 0
            ? newMilestone.learning_objectives
            : null,
          learning_objectives_ar: newMilestone.learning_objectives_ar.length > 0
            ? newMilestone.learning_objectives_ar
            : null,
          checkpoint_type: newMilestone.checkpoint_type || null,
          checkpoint_description: newMilestone.checkpoint_description.trim() || null,
          checkpoint_description_ar: newMilestone.checkpoint_description_ar.trim() || null,
          job_skills_unlocked: newMilestone.job_skills_unlocked.length > 0
            ? newMilestone.job_skills_unlocked
            : null,
          is_optional: newMilestone.is_optional || false,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to add milestone");
      }

      const created: Milestone = json.data;
      setMilestones((prev) =>
        [...prev, created].sort(
          (a, b) =>
            (a.milestone_number || 0) - (b.milestone_number || 0)
        )
      );
      setVideosByMilestone((prev) => ({ ...prev, [created.id]: [] }));
      setResourcesByMilestone((prev) => ({ ...prev, [created.id]: [] }));
      setQuizzesByMilestone((prev) => ({ ...prev, [created.id]: [] }));
      handleCloseAddMilestoneModal();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to add milestone");
    }
  };

  const handleEditMilestone = (milestone: Milestone) => {
    setEditingMilestoneId(milestone.id);
    setEditingMilestone({
      title: milestone.title || "",
      title_ar: milestone.title_ar || "",
      description: milestone.description || "",
      description_ar: milestone.description_ar || "",
      milestone_number: milestone.milestone_number,
      estimated_hours: milestone.estimated_hours || "",
      learning_objectives: milestone.learning_objectives || [],
      learning_objectives_ar: milestone.learning_objectives_ar || [],
      checkpoint_type: milestone.checkpoint_type || "quiz",
      checkpoint_description: milestone.checkpoint_description || "",
      checkpoint_description_ar: milestone.checkpoint_description_ar || "",
      job_skills_unlocked: milestone.job_skills_unlocked || [],
      is_optional: milestone.is_optional || false,
    });
  };

  const handleCancelEdit = () => {
    setEditingMilestoneId(null);
    setEditingMilestone(null);
  };

  const handleUpdateMilestone = async (milestoneId: string) => {
    if (!editingMilestone) return;
    if (!editingMilestone.title.trim() || !editingMilestone.milestone_number) {
      alert("Please enter a title and milestone number.");
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/data?table=path_milestones&id=${encodeURIComponent(milestoneId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editingMilestone.title.trim(),
            title_ar: editingMilestone.title_ar.trim() || null,
            description: editingMilestone.description.trim() || null,
            description_ar: editingMilestone.description_ar.trim() || null,
            milestone_number: Number(editingMilestone.milestone_number),
            estimated_hours: editingMilestone.estimated_hours
              ? Number(editingMilestone.estimated_hours)
              : null,
            learning_objectives: editingMilestone.learning_objectives.length > 0
              ? editingMilestone.learning_objectives
              : null,
            learning_objectives_ar: editingMilestone.learning_objectives_ar.length > 0
              ? editingMilestone.learning_objectives_ar
              : null,
            checkpoint_type: editingMilestone.checkpoint_type || null,
            checkpoint_description: editingMilestone.checkpoint_description.trim() || null,
            checkpoint_description_ar: editingMilestone.checkpoint_description_ar.trim() || null,
            job_skills_unlocked: editingMilestone.job_skills_unlocked.length > 0
              ? editingMilestone.job_skills_unlocked
              : null,
            is_optional: editingMilestone.is_optional || false,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update milestone");
      }

      // Reload milestones
      const milestonesRes = await fetch(
        `/api/admin/data?table=path_milestones&filterColumn=learning_path_id&filterValue=${encodeURIComponent(
          pathId!
        )}&limit=100`
      );
      const milestonesJson = await milestonesRes.json();
      if (milestonesRes.ok) {
        const ms: Milestone[] = (milestonesJson.data || []).sort(
          (a: Milestone, b: Milestone) =>
            (a.milestone_number || 0) - (b.milestone_number || 0)
        );
        setMilestones(ms);
      }

      setEditingMilestoneId(null);
      setEditingMilestone(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update milestone");
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!confirm("Are you sure you want to delete this milestone? This will also delete all associated videos and resources.")) {
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/data?table=path_milestones&id=${encodeURIComponent(milestoneId)}`,
        {
          method: "DELETE",
        }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete milestone");
      }

      // Remove from state
      setMilestones((prev) => prev.filter((m) => m.id !== milestoneId));
      setVideosByMilestone((prev) => {
        const updated = { ...prev };
        delete updated[milestoneId];
        return updated;
      });
      setResourcesByMilestone((prev) => {
        const updated = { ...prev };
        delete updated[milestoneId];
        return updated;
      });
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to delete milestone");
    }
  };

  const handleAddResource = async (
    milestoneId: string,
    resourceId?: string
  ) => {
    const idToUse =
      resourceId || newResource[milestoneId]?.resource_id || "";
    if (!idToUse) {
      alert("Please choose a resource from the list or enter an ID first.");
      return;
    }

    try {
      const res = await fetch("/api/admin/data?table=milestone_resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestone_id: milestoneId,
          resource_id: idToUse,
          is_primary: true,
          is_required: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to add resource");
      }
      // Reload resources for this milestone
      const resourcesRes = await fetch(
        `/api/admin/data?table=milestone_resources_view&filterColumn=milestone_id&filterValue=${encodeURIComponent(
          milestoneId
        )}&limit=100`
      );
      const resourcesJson = await resourcesRes.json();
      if (resourcesRes.ok) {
        setResourcesByMilestone((prev) => ({
          ...prev,
          [milestoneId]: (resourcesJson.data || []).map((r: any) => ({
            id: r.id,
            resource_id: r.resource_id,
            resource_title: r.resource_title || r.title || "Untitled",
            url: r.url,
          })),
        }));
      }
      setNewResource((prev) => ({
        ...prev,
        [milestoneId]: { resource_id: "" },
      }));
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to add resource");
    }
  };

  const handleDeleteResource = async (milestoneId: string, id: string) => {
    if (!confirm("Are you sure you want to unlink this resource?")) return;
    try {
      const params = new URLSearchParams({
        table: "milestone_resources",
        id,
      });
      const res = await fetch(`/api/admin/data?${params.toString()}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete resource");
      }
      setResourcesByMilestone((prev) => ({
        ...prev,
        [milestoneId]: (prev[milestoneId] || []).filter((r) => r.id !== id),
      }));
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to delete resource");
    }
  };

  const parseYouTubeId = (url: string): string | null => {
    try {
      const short = /youtu\.be\/([^?]+)/;
      const long = /v=([^&]+)/;
      const embed = /youtube\.com\/embed\/([^?]+)/;

      if (short.test(url)) return url.match(short)?.[1] || null;
      if (long.test(url)) return url.match(long)?.[1] || null;
      if (embed.test(url)) return url.match(embed)?.[1] || null;

      return null;
    } catch {
      return null;
    }
  };

  const handleAddVideo = async (milestoneId: string) => {
    const videoData = newVideo[milestoneId];
    if (!videoData || !videoData.youtube_url || !videoData.title) {
      alert("Please provide both YouTube URL and title");
      return;
    }

    if (!videoData.language) {
      alert("Please select a language (English or Arabic)");
      return;
    }

    const youtubeId = parseYouTubeId(videoData.youtube_url);
    if (!youtubeId) {
      alert("Could not detect YouTube video ID from URL");
      return;
    }

    try {
      const response = await fetch("/api/admin/data?table=video_content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtube_video_id: youtubeId,
          youtube_url: videoData.youtube_url,
          title: videoData.language === "en" ? videoData.title : "",
          title_ar: videoData.language === "ar" ? videoData.title : (videoData.title_ar || ""),
          milestone_id: milestoneId,
          primary_language: videoData.language,
          is_active: true,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Failed to add video");
      }

      setVideosByMilestone((prev) => ({
        ...prev,
        [milestoneId]: [...(prev[milestoneId] || []), json.data],
      }));
      setNewVideo((prev) => ({
        ...prev,
        [milestoneId]: { youtube_url: "", title: "", title_ar: "", language: "en" },
      }));
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to add video");
    }
  };

  const handleDeleteVideo = async (milestoneId: string, videoId: string) => {
    if (!confirm("Are you sure you want to delete this video?")) return;

    try {
      const response = await fetch(
        `/api/admin/data?table=video_content&id=${encodeURIComponent(
          videoId
        )}`,
        {
          method: "DELETE",
        }
      );

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Failed to delete video");
      }

      setVideosByMilestone((prev) => ({
        ...prev,
        [milestoneId]: (prev[milestoneId] || []).filter(
          (v) => v.id !== videoId
        ),
      }));
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to delete video");
    }
  };

  const handleAddQuiz = async (milestoneId: string) => {
    const quizData = newQuiz[milestoneId];
    if (!quizData || !quizData.title.trim()) {
      alert("Please provide a quiz title");
      return;
    }

    try {
      const response = await fetch("/api/admin/data?table=quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestone_id: milestoneId,
          title: quizData.title.trim(),
          title_ar: quizData.title_ar.trim() || null,
          description: quizData.description.trim() || null,
          description_ar: quizData.description_ar.trim() || null,
          quiz_type: quizData.quiz_type || "checkpoint",
          passing_score: quizData.passing_score ? Number(quizData.passing_score) : 70.0,
          time_limit_minutes: quizData.time_limit_minutes ? Number(quizData.time_limit_minutes) : null,
          max_attempts: quizData.max_attempts ? Number(quizData.max_attempts) : null,
          is_required: quizData.is_required || false,
          is_active: true,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Failed to add quiz");
      }

      setQuizzesByMilestone((prev) => ({
        ...prev,
        [milestoneId]: [...(prev[milestoneId] || []), json.data],
      }));
      setNewQuiz((prev) => ({
        ...prev,
        [milestoneId]: {
          title: "",
          title_ar: "",
          description: "",
          description_ar: "",
          quiz_type: "checkpoint",
          passing_score: 70,
          time_limit_minutes: "",
          max_attempts: "",
          is_required: false,
        },
      }));
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to add quiz");
    }
  };

  const handleDeleteQuiz = async (milestoneId: string, quizId: string) => {
    if (!confirm("Are you sure you want to delete this quiz? This will also delete all questions in this quiz.")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/data?table=quizzes&id=${encodeURIComponent(quizId)}`,
        {
          method: "DELETE",
        }
      );

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Failed to delete quiz");
      }

      setQuizzesByMilestone((prev) => ({
        ...prev,
        [milestoneId]: (prev[milestoneId] || []).filter(
          (q) => q.id !== quizId
        ),
      }));
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to delete quiz");
    }
  };

  const handleScrapeArticle = async (milestoneId: string) => {
    const scrapeData = scrapingArticle[milestoneId];
    if (!scrapeData || !scrapeData.query.trim()) {
      alert("Please enter a search query");
      return;
    }

    setScrapingArticle((prev) => ({
      ...prev,
      [milestoneId]: { ...prev[milestoneId]!, isScraping: true },
    }));

    try {
      const response = await fetch("/api/admin/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_type: scrapeData.source === "oracle_docs" ? "oracle_docs" : "youtube",
          search_query: scrapeData.query,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Failed to scrape articles");
      }

      // Wait a bit for scraping to complete, then check staging
      setTimeout(async () => {
        const stagingRes = await fetch(
          `/api/admin/data?table=scraped_resources_staging&filterColumn=scrape_job_id&filterValue=${encodeURIComponent(
            json.job_id
          )}&limit=20`
        );
        const stagingJson = await stagingRes.json();

        if (stagingRes.ok && stagingJson.data && stagingJson.data.length > 0) {
          // Filter for articles/documentation
          const articles = stagingJson.data.filter(
            (r: any) => r.resource_type === "article" || r.resource_type === "documentation"
          );

          if (articles.length > 0) {
            // Auto-add first article
            await handleAddScrapedArticle(milestoneId, articles[0]);
            alert(`Found ${articles.length} article(s). Added the first one.`);
          } else {
            alert("No articles found. Try a different search query.");
          }
        } else {
          alert("Scraping completed but no articles found. Try a different search query.");
        }
      }, 2000);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to scrape articles");
    } finally {
      setScrapingArticle((prev) => ({
        ...prev,
        [milestoneId]: { ...prev[milestoneId]!, isScraping: false },
      }));
    }
  };

  const handleAddScrapedArticle = async (milestoneId: string, scrapedData: any) => {
    try {
      // First create the resource
      const resourceRes = await fetch("/api/admin/data?table=learning_resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: scrapedData.title,
          title_ar: null,
          description: scrapedData.description || null,
          description_ar: null,
          url: scrapedData.url,
          resource_type: "article",
          language: scrapedData.language || "en",
          is_free: true,
          is_active: true,
        }),
      });

      const resourceJson = await resourceRes.json();
      if (!resourceRes.ok) {
        throw new Error(resourceJson.error || "Failed to create article resource");
      }

      // Then link it to milestone
      await handleAddResource(milestoneId, resourceJson.data.id);
      
      // Clear scraping state
      setScrapingArticle((prev) => ({
        ...prev,
        [milestoneId]: { query: "", source: "oracle_docs", isScraping: false },
      }));
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to add scraped article");
    }
  };

  const handleAddArticle = async (milestoneId: string) => {
    const articleData = newArticle[milestoneId];
    if (!articleData || !articleData.title.trim()) {
      alert("Please provide at least a title");
      return;
    }

    try {
      // First create the resource
      const resourceRes = await fetch("/api/admin/data?table=learning_resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: articleData.title.trim(),
          title_ar: articleData.title_ar.trim() || null,
          description: articleData.description.trim() || null,
          description_ar: articleData.description_ar.trim() || null,
          url: articleData.url.trim() || "",
          resource_type: "article",
          language: articleData.language || "en",
          is_free: articleData.is_free !== false,
          is_active: true,
        }),
      });

      const resourceJson = await resourceRes.json();
      if (!resourceRes.ok) {
        throw new Error(resourceJson.error || "Failed to create article");
      }

      // Then link it to milestone
      await handleAddResource(milestoneId, resourceJson.data.id);
      
      // Clear form
      setNewArticle((prev) => ({
        ...prev,
        [milestoneId]: {
          title: "",
          title_ar: "",
          description: "",
          description_ar: "",
          url: "",
          platform: "",
          language: "en",
          is_free: true,
        },
      }));
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to add article");
    }
  };

  if (loading) {
    return (
      <div>
        <div className="mb-4">
          <Link
            href="/admin/paths"
            className="text-teal-600 hover:text-teal-700"
          >
            ← Back to Paths
          </Link>
        </div>
        <p className="text-slate-500">Loading path...</p>
      </div>
    );
  }

  if (!path) {
    return (
      <div>
        <div className="mb-4">
          <Link
            href="/admin/paths"
            className="text-teal-600 hover:text-teal-700"
          >
            ← Back to Paths
          </Link>
        </div>
        <p className="text-red-600">
          {error || "Path not found or you are not authorized."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/paths"
          className="text-teal-600 hover:text-teal-700 mb-2 inline-block"
        >
          ← Back to Paths
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">
          Edit Learning Path
        </h1>
        <p className="text-slate-500">
          Update path details and manage learning content (YouTube videos).
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Path basic info */}
      <form
        onSubmit={handlePathSubmit}
        className="bg-white rounded-xl shadow-sm p-6 space-y-6 mb-8"
      >
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          Path Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Title (English) *
            </label>
            <input
              type="text"
              required
              value={formData.title || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Title (Arabic)
            </label>
            <input
              type="text"
              value={formData.title_ar || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title_ar: e.target.value }))
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Slug *
            </label>
            <input
              type="text"
              required
              value={formData.slug || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  slug: e.target.value
                    .toLowerCase()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9\-]/g, ""),
                }))
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Difficulty Level *
            </label>
            <select
              required
              value={formData.difficulty_level || "beginner"}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  difficulty_level: e.target.value,
                }))
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Target Audience
            </label>
            <select
              value={formData.target_audience || "beginners"}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  target_audience: e.target.value,
                }))
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="beginners">Beginners</option>
              <option value="experienced professionals">
                Experienced Professionals
              </option>
              <option value="career-switchers">Career Switchers</option>
              <option value="technical professionals">
                Technical Professionals
              </option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Estimated Duration (hours)
            </label>
            <input
              type="number"
              min="0"
              value={
                formData.estimated_duration_hours !== null &&
                formData.estimated_duration_hours !== undefined
                  ? String(formData.estimated_duration_hours)
                  : ""
              }
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  estimated_duration_hours: e.target.value
                    ? Number(e.target.value)
                    : null,
                }))
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_published"
              checked={!!formData.is_published}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  is_published: e.target.checked,
                }))
              }
              className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
            />
            <label
              htmlFor="is_published"
              className="ml-2 text-sm text-slate-700"
            >
              Published
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Description (English)
          </label>
          <textarea
            rows={4}
            value={formData.description || ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Description (Arabic)
          </label>
          <textarea
            rows={4}
            value={formData.description_ar || ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                description_ar: e.target.value,
              }))
            }
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        <div className="flex gap-4 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/paths")}
            className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Milestones, videos & resources */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          Milestones, Videos & Resources
        </h2>
        <p className="text-sm text-slate-500 mb-2">
          For each milestone, you can attach YouTube videos and external
          resources (Udacity, courses, docs). Videos are added by URL, resources
          are linked by Resource ID from the Resources admin page.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-blue-800 font-medium mb-1">
            💰 About Budget/Price:
          </p>
          <p className="text-[11px] text-blue-700">
            Budget and price are set when you <strong>create resources</strong> in the{" "}
            <Link href="/admin/resources" className="underline hover:text-blue-900">
              Resources admin page
            </Link>
            . When you link resources to milestones below, they will show as Free or Paid based on how you created them.
          </p>
        </div>

        {/* Add new milestone button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={handleOpenAddMilestoneModal}
            className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 font-medium"
          >
            + Add new milestone
          </button>
        </div>

        {/* Add Milestone Modal */}
        {showAddMilestoneModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Add new milestone</h2>
                <button
                  type="button"
                  onClick={handleCloseAddMilestoneModal}
                  className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              
              <div className="p-6">
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    💡 Budget/Price is set when adding resources below, not here
                  </p>
                </div>
          
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Title (English) *
                </label>
                <input
                  type="text"
                  required
                  value={newMilestone.title}
                  onChange={(e) =>
                    setNewMilestone((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="e.g. Understand ERP basics"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Title (Arabic)
                </label>
                <input
                  type="text"
                  value={newMilestone.title_ar}
                  onChange={(e) =>
                    setNewMilestone((prev) => ({
                      ...prev,
                      title_ar: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="مثل: فهم أساسيات ERP"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Milestone number (Auto-calculated)
                </label>
                <input
                  type="number"
                  min={1}
                  value={newMilestone.milestone_number}
                  onChange={(e) =>
                    setNewMilestone((prev) => ({
                      ...prev,
                      milestone_number: e.target.value
                        ? Number(e.target.value)
                        : getNextMilestoneNumber(),
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-slate-50"
                  placeholder="Auto"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Automatically set to {getNextMilestoneNumber()}. You can change it if needed.
                </p>
              </div>
            </div>

            {/* Descriptions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Description (English)
                </label>
                <textarea
                  value={newMilestone.description}
                  onChange={(e) =>
                    setNewMilestone((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Detailed description of this milestone"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Description (Arabic)
                </label>
                <textarea
                  value={newMilestone.description_ar}
                  onChange={(e) =>
                    setNewMilestone((prev) => ({
                      ...prev,
                      description_ar: e.target.value,
                    }))
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="وصف تفصيلي لهذا المعلم"
                />
              </div>
            </div>

            {/* Estimated Hours & Optional */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Estimated hours (optional)
                </label>
                <input
                  type="number"
                  min={0}
                  value={newMilestone.estimated_hours}
                  onChange={(e) =>
                    setNewMilestone((prev) => ({
                      ...prev,
                      estimated_hours: e.target.value
                        ? Number(e.target.value)
                        : "",
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="e.g. 4"
                />
              </div>
              <div className="flex items-start pt-6">
                <input
                  type="checkbox"
                  id="is_optional"
                  checked={newMilestone.is_optional}
                  onChange={(e) =>
                    setNewMilestone((prev) => ({
                      ...prev,
                      is_optional: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 mt-0.5"
                />
                <div className="ml-2">
                  <label htmlFor="is_optional" className="text-xs font-medium text-slate-700 block">
                    Optional milestone
                  </label>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Check if students can skip this milestone
                  </p>
                </div>
              </div>
            </div>

            {/* Learning Objectives */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Learning Objectives (English)
                </label>
                <p className="text-[10px] text-slate-500 mb-1.5">
                  What will students learn? List one goal per line
                </p>
                <textarea
                  value={newMilestone.learning_objectives.join("\n")}
                  onChange={(e) =>
                    setNewMilestone((prev) => ({
                      ...prev,
                      learning_objectives: e.target.value
                        .split("\n")
                        .filter((line) => line.trim()),
                    }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Example: Understand GL structure (press Enter for new line)"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Learning Objectives (Arabic)
                </label>
                <p className="text-[10px] text-slate-500 mb-1.5">
                  ماذا سيتعلم الطلاب؟ اذكر هدفًا واحدًا في كل سطر
                </p>
                <textarea
                  value={newMilestone.learning_objectives_ar.join("\n")}
                  onChange={(e) =>
                    setNewMilestone((prev) => ({
                      ...prev,
                      learning_objectives_ar: e.target.value
                        .split("\n")
                        .filter((line) => line.trim()),
                    }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="مثال: فهم هيكل GL (اضغط Enter للسطر الجديد)"
                />
              </div>
            </div>

            {/* Checkpoint */}
            <div className="border-t border-slate-200 pt-3 mt-2">
              <p className="text-[10px] font-medium text-slate-600 mb-2">
                Checkpoint (Assessment/Test)
              </p>
              <p className="text-[10px] text-slate-500 mb-3">
                How will students prove they completed this milestone?
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Type
                  </label>
                  <select
                    value={newMilestone.checkpoint_type}
                    onChange={(e) =>
                      setNewMilestone((prev) => ({
                        ...prev,
                        checkpoint_type: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">None</option>
                    <option value="quiz">Quiz (Test/Exam)</option>
                    <option value="project">Project (Practical Work)</option>
                    <option value="certification">Certification (Official Certificate)</option>
                    <option value="peer_review">Peer Review (Other Students Review)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Description (English)
                  </label>
                  <input
                    type="text"
                    value={newMilestone.checkpoint_description}
                    onChange={(e) =>
                      setNewMilestone((prev) => ({
                        ...prev,
                        checkpoint_description: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="e.g. Complete quiz on fundamentals"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Description (Arabic)
                  </label>
                  <input
                    type="text"
                    value={newMilestone.checkpoint_description_ar}
                    onChange={(e) =>
                      setNewMilestone((prev) => ({
                        ...prev,
                        checkpoint_description_ar: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="مثل: إكمال اختبار على الأساسيات"
                  />
                </div>
              </div>
            </div>

            {/* Job Skills Unlocked */}
            <div className="border-t border-slate-200 pt-3 mt-2">
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Job Skills Unlocked
              </label>
              <p className="text-[10px] text-slate-500 mb-1.5">
                What job skills will students gain? (Shown on their profile) - One skill per line
              </p>
              <textarea
                value={newMilestone.job_skills_unlocked.join("\n")}
                onChange={(e) =>
                  setNewMilestone((prev) => ({
                    ...prev,
                    job_skills_unlocked: e.target.value
                      .split("\n")
                      .filter((line) => line.trim()),
                  }))
                }
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Example: Oracle GL Configuration (press Enter for new line)"
              />
            </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-4">
                  <button
                    type="button"
                    onClick={handleCloseAddMilestoneModal}
                    className="px-4 py-2 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 font-medium"
                  >
                    Add Milestone
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {milestones.length === 0 ? (
          <p className="text-slate-500 text-sm">
            No milestones found for this path yet. Use the form above to add
            your first milestone.
          </p>
        ) : (
          <div className="space-y-6">
            {milestones.map((m) => (
              <div
                key={m.id}
                className="border border-slate-200 rounded-lg p-4"
              >
                {editingMilestoneId === m.id && editingMilestone ? (
                  // Edit Form
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-700">Edit Milestone</h3>
                      <button
                        onClick={handleCancelEdit}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                    
                    {/* Same form structure as new milestone */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Title (English) *
                        </label>
                        <input
                          type="text"
                          required
                          value={editingMilestone.title}
                          onChange={(e) =>
                            setEditingMilestone((prev) =>
                              prev ? { ...prev, title: e.target.value } : null
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Title (Arabic)
                        </label>
                        <input
                          type="text"
                          value={editingMilestone.title_ar}
                          onChange={(e) =>
                            setEditingMilestone((prev) =>
                              prev ? { ...prev, title_ar: e.target.value } : null
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Milestone number *
                        </label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={editingMilestone.milestone_number}
                          onChange={(e) =>
                            setEditingMilestone((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    milestone_number: e.target.value
                                      ? Number(e.target.value)
                                      : "",
                                  }
                                : null
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Description (English)
                        </label>
                        <textarea
                          value={editingMilestone.description}
                          onChange={(e) =>
                            setEditingMilestone((prev) =>
                              prev ? { ...prev, description: e.target.value } : null
                            )
                          }
                          rows={2}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Description (Arabic)
                        </label>
                        <textarea
                          value={editingMilestone.description_ar}
                          onChange={(e) =>
                            setEditingMilestone((prev) =>
                              prev ? { ...prev, description_ar: e.target.value } : null
                            )
                          }
                          rows={2}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Estimated hours
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={editingMilestone.estimated_hours}
                          onChange={(e) =>
                            setEditingMilestone((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    estimated_hours: e.target.value
                                      ? Number(e.target.value)
                                      : "",
                                  }
                                : null
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                      <div className="flex items-start pt-6">
                        <input
                          type="checkbox"
                          id={`edit_is_optional_${m.id}`}
                          checked={editingMilestone.is_optional}
                          onChange={(e) =>
                            setEditingMilestone((prev) =>
                              prev ? { ...prev, is_optional: e.target.checked } : null
                            )
                          }
                          className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 mt-0.5"
                        />
                        <label
                          htmlFor={`edit_is_optional_${m.id}`}
                          className="ml-2 text-xs font-medium text-slate-700"
                        >
                          Optional milestone
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Learning Objectives (English)
                        </label>
                        <textarea
                          value={editingMilestone.learning_objectives.join("\n")}
                          onChange={(e) =>
                            setEditingMilestone((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    learning_objectives: e.target.value
                                      .split("\n")
                                      .filter((line) => line.trim()),
                                  }
                                : null
                            )
                          }
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Learning Objectives (Arabic)
                        </label>
                        <textarea
                          value={editingMilestone.learning_objectives_ar.join("\n")}
                          onChange={(e) =>
                            setEditingMilestone((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    learning_objectives_ar: e.target.value
                                      .split("\n")
                                      .filter((line) => line.trim()),
                                  }
                                : null
                            )
                          }
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-3">
                      <p className="text-[10px] font-medium text-slate-600 mb-2">Checkpoint</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Type
                          </label>
                          <select
                            value={editingMilestone.checkpoint_type}
                            onChange={(e) =>
                              setEditingMilestone((prev) =>
                                prev ? { ...prev, checkpoint_type: e.target.value } : null
                              )
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          >
                            <option value="">None</option>
                            <option value="quiz">Quiz</option>
                            <option value="project">Project</option>
                            <option value="certification">Certification</option>
                            <option value="peer_review">Peer Review</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Description (English)
                          </label>
                          <input
                            type="text"
                            value={editingMilestone.checkpoint_description}
                            onChange={(e) =>
                              setEditingMilestone((prev) =>
                                prev ? { ...prev, checkpoint_description: e.target.value } : null
                              )
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Description (Arabic)
                          </label>
                          <input
                            type="text"
                            value={editingMilestone.checkpoint_description_ar}
                            onChange={(e) =>
                              setEditingMilestone((prev) =>
                                prev
                                  ? { ...prev, checkpoint_description_ar: e.target.value }
                                  : null
                              )
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-3">
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Job Skills Unlocked
                      </label>
                      <textarea
                        value={editingMilestone.job_skills_unlocked.join("\n")}
                        onChange={(e) =>
                          setEditingMilestone((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  job_skills_unlocked: e.target.value
                                    .split("\n")
                                    .filter((line) => line.trim()),
                                }
                              : null
                          )
                        }
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateMilestone(m.id)}
                        className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  // Display Mode
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-xs text-slate-500">
                          Milestone {m.milestone_number}
                        </div>
                        <div className="font-medium text-slate-900">
                          {m.title}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditMilestone(m)}
                          className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteMilestone(m.id)}
                          className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                {/* Existing videos */}
                {(videosByMilestone[m.id] || []).length > 0 ? (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-slate-500 mb-1">
                      Existing videos
                    </div>
                    <div className="space-y-2">
                      {videosByMilestone[m.id].map((v: any) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-slate-800">
                                {v.title || v.title_ar || "Untitled"}
                              </div>
                              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                {v.primary_language === "ar" ? "AR" : v.primary_language === "en" ? "EN" : "Mixed"}
                              </span>
                            </div>
                            <a
                              href={v.youtube_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-teal-600 hover:text-teal-700 break-all"
                            >
                              {v.youtube_url}
                            </a>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteVideo(m.id, v.id)
                            }
                            className="ml-4 text-xs text-red-600 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mb-3">
                    No videos added yet for this milestone.
                  </p>
                )}

                {/* Add new video */}
                <div className="mt-2 border-t border-slate-100 pt-3">
                  <div className="text-xs font-medium text-slate-500 mb-1">
                    Add YouTube video (AR or EN)
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="YouTube URL"
                        value={newVideo[m.id]?.youtube_url || ""}
                        onChange={(e) =>
                          setNewVideo((prev) => ({
                            ...prev,
                            [m.id]: {
                              youtube_url: e.target.value,
                              title: prev[m.id]?.title || "",
                              title_ar: prev[m.id]?.title_ar || "",
                              language: prev[m.id]?.language || "en",
                            },
                          }))
                        }
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                      <select
                        value={newVideo[m.id]?.language || "en"}
                        onChange={(e) =>
                          setNewVideo((prev) => ({
                            ...prev,
                            [m.id]: {
                              youtube_url: prev[m.id]?.youtube_url || "",
                              title: prev[m.id]?.title || "",
                              title_ar: prev[m.id]?.title_ar || "",
                              language: e.target.value as "en" | "ar",
                            },
                          }))
                        }
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      >
                        <option value="en">English (EN)</option>
                        <option value="ar">Arabic (AR)</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      placeholder={newVideo[m.id]?.language === "ar" ? "Video title (Arabic)" : "Video title (English)"}
                      value={newVideo[m.id]?.title || ""}
                      onChange={(e) =>
                        setNewVideo((prev) => ({
                          ...prev,
                          [m.id]: {
                            youtube_url: prev[m.id]?.youtube_url || "",
                            title: e.target.value,
                            title_ar: prev[m.id]?.title_ar || "",
                            language: prev[m.id]?.language || "en",
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => handleAddVideo(m.id)}
                      className="text-xs px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Add Video ({newVideo[m.id]?.language === "ar" ? "AR" : "EN"})
                    </button>
                  </div>
                </div>

                {/* Existing resources */}
                <div className="mt-4">
                  <div className="text-xs font-medium text-slate-500 mb-1">
                    Linked resources
                  </div>
                  {(resourcesByMilestone[m.id] || []).length > 0 ? (
                    <div className="space-y-2">
                      {resourcesByMilestone[m.id].map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-slate-800">
                              {r.resource_title}
                            </div>
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-teal-600 hover:text-teal-700 break-all"
                            >
                              {r.url}
                            </a>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteResource(m.id, r.id)}
                            className="ml-3 text-[11px] text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      No resources linked yet for this milestone.
                    </p>
                  )}
                </div>

                {/* Add new resource */}
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <div className="text-xs font-medium text-slate-500 mb-1">
                    Link resource
                  </div>
                  <div className="flex flex-col md:flex-row gap-2 items-center">
                    <select
                      value={newResource[m.id]?.resource_id || ""}
                      onChange={(e) =>
                        setNewResource((prev) => ({
                          ...prev,
                          [m.id]: {
                            resource_id: e.target.value,
                          },
                        }))
                      }
                      className="w-full md:flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                    >
                      <option value="">Select a resource...</option>
                      {allResources.map((res) => (
                        <option key={res.id} value={res.id}>
                          {res.title || res.title_ar || "Untitled"} —{" "}
                          {res.resource_type}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleAddResource(m.id)}
                      className="px-3 py-2 bg-teal-600 text-white text-xs rounded-lg hover:bg-teal-700 whitespace-nowrap"
                    >
                      Add Resource
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    The list shows all resources from the Resources admin page.
                  </p>
                </div>

                {/* Add Article Manually */}
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <div className="text-xs font-medium text-slate-500 mb-1">
                    Add Article Manually
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Article title (English)"
                        value={newArticle[m.id]?.title || ""}
                        onChange={(e) =>
                          setNewArticle((prev) => ({
                            ...prev,
                            [m.id]: {
                              title: e.target.value,
                              title_ar: prev[m.id]?.title_ar || "",
                              description: prev[m.id]?.description || "",
                              description_ar: prev[m.id]?.description_ar || "",
                              url: prev[m.id]?.url || "",
                              platform: prev[m.id]?.platform || "",
                              language: prev[m.id]?.language || "en",
                              is_free: prev[m.id]?.is_free !== false,
                            },
                          }))
                        }
                        className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                      <input
                        type="text"
                        placeholder="Article title (Arabic)"
                        value={newArticle[m.id]?.title_ar || ""}
                        onChange={(e) =>
                          setNewArticle((prev) => ({
                            ...prev,
                            [m.id]: {
                              title: prev[m.id]?.title || "",
                              title_ar: e.target.value,
                              description: prev[m.id]?.description || "",
                              description_ar: prev[m.id]?.description_ar || "",
                              url: prev[m.id]?.url || "",
                              platform: prev[m.id]?.platform || "",
                              language: prev[m.id]?.language || "en",
                              is_free: prev[m.id]?.is_free !== false,
                            },
                          }))
                        }
                        className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                    <input
                      type="url"
                      placeholder="Article URL (optional)"
                      value={newArticle[m.id]?.url || ""}
                      onChange={(e) =>
                        setNewArticle((prev) => ({
                          ...prev,
                          [m.id]: {
                            title: prev[m.id]?.title || "",
                            title_ar: prev[m.id]?.title_ar || "",
                            description: prev[m.id]?.description || "",
                            description_ar: prev[m.id]?.description_ar || "",
                            url: e.target.value,
                            platform: prev[m.id]?.platform || "",
                            language: prev[m.id]?.language || "en",
                            is_free: prev[m.id]?.is_free !== false,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <textarea
                        placeholder="Description (English, optional)"
                        value={newArticle[m.id]?.description || ""}
                        onChange={(e) =>
                          setNewArticle((prev) => ({
                            ...prev,
                            [m.id]: {
                              title: prev[m.id]?.title || "",
                              title_ar: prev[m.id]?.title_ar || "",
                              description: e.target.value,
                              description_ar: prev[m.id]?.description_ar || "",
                              url: prev[m.id]?.url || "",
                              platform: prev[m.id]?.platform || "",
                              language: prev[m.id]?.language || "en",
                              is_free: prev[m.id]?.is_free !== false,
                            },
                          }))
                        }
                        rows={2}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                      <textarea
                        placeholder="Description (Arabic, optional)"
                        value={newArticle[m.id]?.description_ar || ""}
                        onChange={(e) =>
                          setNewArticle((prev) => ({
                            ...prev,
                            [m.id]: {
                              title: prev[m.id]?.title || "",
                              title_ar: prev[m.id]?.title_ar || "",
                              description: prev[m.id]?.description || "",
                              description_ar: e.target.value,
                              url: prev[m.id]?.url || "",
                              platform: prev[m.id]?.platform || "",
                              language: prev[m.id]?.language || "en",
                              is_free: prev[m.id]?.is_free !== false,
                            },
                          }))
                        }
                        rows={2}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                    <div className="flex gap-2 items-center">
                      <select
                        value={newArticle[m.id]?.language || "en"}
                        onChange={(e) =>
                          setNewArticle((prev) => ({
                            ...prev,
                            [m.id]: {
                              title: prev[m.id]?.title || "",
                              title_ar: prev[m.id]?.title_ar || "",
                              description: prev[m.id]?.description || "",
                              description_ar: prev[m.id]?.description_ar || "",
                              url: prev[m.id]?.url || "",
                              platform: prev[m.id]?.platform || "",
                              language: e.target.value,
                              is_free: prev[m.id]?.is_free !== false,
                            },
                          }))
                        }
                        className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      >
                        <option value="en">English</option>
                        <option value="ar">Arabic</option>
                        <option value="both">Both</option>
                      </select>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`article_free_${m.id}`}
                          checked={newArticle[m.id]?.is_free !== false}
                          onChange={(e) =>
                            setNewArticle((prev) => ({
                              ...prev,
                              [m.id]: {
                                title: prev[m.id]?.title || "",
                                title_ar: prev[m.id]?.title_ar || "",
                                description: prev[m.id]?.description || "",
                                description_ar: prev[m.id]?.description_ar || "",
                                url: prev[m.id]?.url || "",
                                platform: prev[m.id]?.platform || "",
                                language: prev[m.id]?.language || "en",
                                is_free: e.target.checked,
                              },
                            }))
                          }
                          className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                        />
                        <label htmlFor={`article_free_${m.id}`} className="text-xs text-slate-600">
                          Free
                        </label>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddArticle(m.id)}
                      className="text-xs px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Add Article
                    </button>
                  </div>
                </div>

                {/* Scrape Articles */}
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <div className="text-xs font-medium text-slate-500 mb-1">
                    Scrape Articles (Oracle Docs, Medium, etc.)
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Search query (e.g., 'Oracle GL setup')"
                        value={scrapingArticle[m.id]?.query || ""}
                        onChange={(e) =>
                          setScrapingArticle((prev) => ({
                            ...prev,
                            [m.id]: {
                              query: e.target.value,
                              source: prev[m.id]?.source || "oracle_docs",
                              isScraping: false,
                            },
                          }))
                        }
                        className="md:col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        disabled={scrapingArticle[m.id]?.isScraping}
                      />
                      <select
                        value={scrapingArticle[m.id]?.source || "oracle_docs"}
                        onChange={(e) =>
                          setScrapingArticle((prev) => ({
                            ...prev,
                            [m.id]: {
                              query: prev[m.id]?.query || "",
                              source: e.target.value,
                              isScraping: false,
                            },
                          }))
                        }
                        className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        disabled={scrapingArticle[m.id]?.isScraping}
                      >
                        <option value="oracle_docs">Oracle Docs</option>
                        <option value="medium">Medium</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleScrapeArticle(m.id)}
                      disabled={scrapingArticle[m.id]?.isScraping}
                      className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {scrapingArticle[m.id]?.isScraping ? "Scraping..." : "Scrape & Add Article"}
                    </button>
                    <p className="text-[10px] text-slate-400">
                      This will search for articles and automatically add the first result to this milestone.
                    </p>
                  </div>
                </div>

                {/* Existing quizzes */}
                <div className="mt-4">
                  <div className="text-xs font-medium text-slate-500 mb-1">
                    Quizzes/Tests
                  </div>
                  {(quizzesByMilestone[m.id] || []).length > 0 ? (
                    <div className="space-y-2">
                      {quizzesByMilestone[m.id].map((q) => (
                        <div
                          key={q.id}
                          className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded border border-slate-200"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-slate-800">
                              {q.title || q.title_ar || "Untitled Quiz"}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Type: {q.quiz_type} | Passing: {q.passing_score}% | 
                              {q.is_required ? " Required" : " Optional"}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuiz(m.id, q.id)}
                            className="ml-3 text-[11px] text-red-600 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      No quizzes added yet for this milestone.
                    </p>
                  )}
                </div>

                {/* Add new quiz */}
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <div className="text-xs font-medium text-slate-500 mb-1">
                    Add Quiz/Test
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Quiz title (English)"
                        value={newQuiz[m.id]?.title || ""}
                        onChange={(e) =>
                          setNewQuiz((prev) => ({
                            ...prev,
                            [m.id]: {
                              title: e.target.value,
                              title_ar: prev[m.id]?.title_ar || "",
                              description: prev[m.id]?.description || "",
                              description_ar: prev[m.id]?.description_ar || "",
                              quiz_type: prev[m.id]?.quiz_type || "checkpoint",
                              passing_score: prev[m.id]?.passing_score || 70,
                              time_limit_minutes: prev[m.id]?.time_limit_minutes || "",
                              max_attempts: prev[m.id]?.max_attempts || "",
                              is_required: prev[m.id]?.is_required || false,
                            },
                          }))
                        }
                        className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                      <input
                        type="text"
                        placeholder="Quiz title (Arabic)"
                        value={newQuiz[m.id]?.title_ar || ""}
                        onChange={(e) =>
                          setNewQuiz((prev) => ({
                            ...prev,
                            [m.id]: {
                              title: prev[m.id]?.title || "",
                              title_ar: e.target.value,
                              description: prev[m.id]?.description || "",
                              description_ar: prev[m.id]?.description_ar || "",
                              quiz_type: prev[m.id]?.quiz_type || "checkpoint",
                              passing_score: prev[m.id]?.passing_score || 70,
                              time_limit_minutes: prev[m.id]?.time_limit_minutes || "",
                              max_attempts: prev[m.id]?.max_attempts || "",
                              is_required: prev[m.id]?.is_required || false,
                            },
                          }))
                        }
                        className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <select
                        value={newQuiz[m.id]?.quiz_type || "checkpoint"}
                        onChange={(e) =>
                          setNewQuiz((prev) => ({
                            ...prev,
                            [m.id]: {
                              title: prev[m.id]?.title || "",
                              title_ar: prev[m.id]?.title_ar || "",
                              description: prev[m.id]?.description || "",
                              description_ar: prev[m.id]?.description_ar || "",
                              quiz_type: e.target.value,
                              passing_score: prev[m.id]?.passing_score || 70,
                              time_limit_minutes: prev[m.id]?.time_limit_minutes || "",
                              max_attempts: prev[m.id]?.max_attempts || "",
                              is_required: prev[m.id]?.is_required || false,
                            },
                          }))
                        }
                        className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      >
                        <option value="checkpoint">Checkpoint</option>
                        <option value="practice">Practice</option>
                        <option value="final">Final</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Passing score (%)"
                        value={newQuiz[m.id]?.passing_score || ""}
                        onChange={(e) =>
                          setNewQuiz((prev) => ({
                            ...prev,
                            [m.id]: {
                              title: prev[m.id]?.title || "",
                              title_ar: prev[m.id]?.title_ar || "",
                              description: prev[m.id]?.description || "",
                              description_ar: prev[m.id]?.description_ar || "",
                              quiz_type: prev[m.id]?.quiz_type || "checkpoint",
                              passing_score: e.target.value ? Number(e.target.value) : "",
                              time_limit_minutes: prev[m.id]?.time_limit_minutes || "",
                              max_attempts: prev[m.id]?.max_attempts || "",
                              is_required: prev[m.id]?.is_required || false,
                            },
                          }))
                        }
                        className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`quiz_required_${m.id}`}
                          checked={newQuiz[m.id]?.is_required || false}
                          onChange={(e) =>
                            setNewQuiz((prev) => ({
                              ...prev,
                              [m.id]: {
                                title: prev[m.id]?.title || "",
                                title_ar: prev[m.id]?.title_ar || "",
                                description: prev[m.id]?.description || "",
                                description_ar: prev[m.id]?.description_ar || "",
                                quiz_type: prev[m.id]?.quiz_type || "checkpoint",
                                passing_score: prev[m.id]?.passing_score || 70,
                                time_limit_minutes: prev[m.id]?.time_limit_minutes || "",
                                max_attempts: prev[m.id]?.max_attempts || "",
                                is_required: e.target.checked,
                              },
                            }))
                          }
                          className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                        />
                        <label htmlFor={`quiz_required_${m.id}`} className="text-xs text-slate-600">
                          Required
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="Time limit (minutes, optional)"
                        value={newQuiz[m.id]?.time_limit_minutes || ""}
                        onChange={(e) =>
                          setNewQuiz((prev) => ({
                            ...prev,
                            [m.id]: {
                              title: prev[m.id]?.title || "",
                              title_ar: prev[m.id]?.title_ar || "",
                              description: prev[m.id]?.description || "",
                              description_ar: prev[m.id]?.description_ar || "",
                              quiz_type: prev[m.id]?.quiz_type || "checkpoint",
                              passing_score: prev[m.id]?.passing_score || 70,
                              time_limit_minutes: e.target.value ? Number(e.target.value) : "",
                              max_attempts: prev[m.id]?.max_attempts || "",
                              is_required: prev[m.id]?.is_required || false,
                            },
                          }))
                        }
                        className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Max attempts (optional)"
                        value={newQuiz[m.id]?.max_attempts || ""}
                        onChange={(e) =>
                          setNewQuiz((prev) => ({
                            ...prev,
                            [m.id]: {
                              title: prev[m.id]?.title || "",
                              title_ar: prev[m.id]?.title_ar || "",
                              description: prev[m.id]?.description || "",
                              description_ar: prev[m.id]?.description_ar || "",
                              quiz_type: prev[m.id]?.quiz_type || "checkpoint",
                              passing_score: prev[m.id]?.passing_score || 70,
                              time_limit_minutes: prev[m.id]?.time_limit_minutes || "",
                              max_attempts: e.target.value ? Number(e.target.value) : "",
                              is_required: prev[m.id]?.is_required || false,
                            },
                          }))
                        }
                        className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <textarea
                        placeholder="Description (English, optional)"
                        value={newQuiz[m.id]?.description || ""}
                        onChange={(e) =>
                          setNewQuiz((prev) => ({
                            ...prev,
                            [m.id]: {
                              title: prev[m.id]?.title || "",
                              title_ar: prev[m.id]?.title_ar || "",
                              description: e.target.value,
                              description_ar: prev[m.id]?.description_ar || "",
                              quiz_type: prev[m.id]?.quiz_type || "checkpoint",
                              passing_score: prev[m.id]?.passing_score || 70,
                              time_limit_minutes: prev[m.id]?.time_limit_minutes || "",
                              max_attempts: prev[m.id]?.max_attempts || "",
                              is_required: prev[m.id]?.is_required || false,
                            },
                          }))
                        }
                        rows={2}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                      <textarea
                        placeholder="Description (Arabic, optional)"
                        value={newQuiz[m.id]?.description_ar || ""}
                        onChange={(e) =>
                          setNewQuiz((prev) => ({
                            ...prev,
                            [m.id]: {
                              title: prev[m.id]?.title || "",
                              title_ar: prev[m.id]?.title_ar || "",
                              description: prev[m.id]?.description || "",
                              description_ar: e.target.value,
                              quiz_type: prev[m.id]?.quiz_type || "checkpoint",
                              passing_score: prev[m.id]?.passing_score || 70,
                              time_limit_minutes: prev[m.id]?.time_limit_minutes || "",
                              max_attempts: prev[m.id]?.max_attempts || "",
                              is_required: prev[m.id]?.is_required || false,
                            },
                          }))
                        }
                        rows={2}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => handleAddQuiz(m.id)}
                        className="text-xs px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                      >
                        Add Quiz
                      </button>
                    </div>
                  </div>
                </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


