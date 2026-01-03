"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LearningPath,
  Milestone,
  MilestoneResource,
  LearningResource,
  VideoContent,
  Quiz,
  NewMilestone,
} from "./types";
import { parseYouTubeId } from "./utils";
import PathDetailsForm from "./components/PathDetailsForm";
import AddMilestoneModal from "./components/AddMilestoneModal";
import MilestoneItem from "./components/MilestoneItem";
import MilestoneModal from "./components/MilestoneModal";

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
  const [openMilestoneModal, setOpenMilestoneModal] = useState<string | null>(
    null
  );

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

  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(
    null
  );
  const [editingMilestone, setEditingMilestone] =
    useState<NewMilestone | null>(null);

  const [allResources, setAllResources] = useState<LearningResource[]>([]);

  const [newVideo, setNewVideo] = useState<Record<string, any>>({});
  const [newResource, setNewResource] = useState<Record<string, any>>({});
  const [newQuiz, setNewQuiz] = useState<Record<string, any>>({});

  const [showAddArticleModal, setShowAddArticleModal] = useState<string | null>(
    null
  );
  const [newArticle, setNewArticle] = useState<Record<string, any>>({});
  const [scrapingArticle, setScrapingArticle] = useState<Record<string, any>>(
    {}
  );

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
          throw new Error(milestonesJson.error || "Failed to load milestones");
        }
        const ms: Milestone[] = (milestonesJson.data || []).sort(
          (a: Milestone, b: Milestone) =>
            (a.milestone_number || 0) - (b.milestone_number || 0)
        );
        setMilestones(ms);

        // Fetch all learning resources once for linking
        const resourcesAllRes = await fetch(
          `/api/admin/data?table=learning_resources&limit=500`
        );
        const resourcesAllJson = await resourcesAllRes.json();
        if (resourcesAllRes.ok) {
          setAllResources(resourcesAllJson.data || []);
        }

        // Fetch videos, resources, and quizzes for each milestone
        const videosMap: Record<string, VideoContent[]> = {};
        const resourcesMap: Record<string, MilestoneResource[]> = {};
        const quizzesMap: Record<string, Quiz[]> = {};
        const newVideoMap: Record<string, any> = {};
        const newResourceMap: Record<string, any> = {};
        const newQuizMap: Record<string, any> = {};
        const scrapMap: Record<string, any> = {};
        const newArticleMap: Record<string, any> = {};

        await Promise.all(
          ms.map(async (m) => {
            newArticleMap[m.id] = {
              title: "",
              title_ar: "",
              url: "",
              content: "",
              content_ar: "",
              language: "en",
              is_free: false,
            };
            newVideoMap[m.id] = {
              youtube_url: "",
              title: "",
              title_ar: "",
              language: "en",
            };
            newResourceMap[m.id] = { resource_id: "" };
            newQuizMap[m.id] = {
              title: "",
              title_ar: "",
              description: "",
              description_ar: "",
              quiz_type: "checkpoint",
              passing_score: 70,
              time_limit_minutes: "",
              max_attempts: "",
              is_required: false,
            };
            scrapMap[m.id] = {
              query: "",
              source: "oracle_docs",
              isScraping: false,
            };

            const videosRes = await fetch(
              `/api/admin/data?table=video_content&filterColumn=milestone_id&filterValue=${encodeURIComponent(
                m.id
              )}&limit=100`
            );
            const videosJson = await videosRes.json();
            if (videosRes.ok) {
              videosMap[m.id] = videosJson.data || [];
            } else {
              videosMap[m.id] = [];
            }

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

            const quizzesRes = await fetch(
              `/api/admin/data?table=quizzes&filterColumn=milestone_id&filterValue=${encodeURIComponent(
                m.id
              )}&limit=100`
            );
            const quizzesJson = await quizzesRes.json();
            if (quizzesRes.ok) {
              quizzesMap[m.id] = quizzesJson.data || [];
            } else {
              quizzesMap[m.id] = [];
            }
          })
        );
        setVideosByMilestone(videosMap);
        setResourcesByMilestone(resourcesMap);
        setQuizzesByMilestone(quizzesMap);
        setNewVideo(newVideoMap);
        setNewResource(newResourceMap);
        setNewQuiz(newQuizMap);
        setScrapingArticle(scrapMap);
        setNewArticle(newArticleMap);
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
        `/api/admin/data?table=learning_paths&id=${encodeURIComponent(pathId)}`,
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
      alert("Path details saved successfully!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const getNextMilestoneNumber = () => {
    if (milestones.length === 0) return 1;
    const maxNumber = Math.max(
      ...milestones.map((m) => m.milestone_number || 0)
    );
    return maxNumber + 1;
  };

  const handleOpenAddMilestoneModal = () => {
    setNewMilestone((prev) => ({
      ...prev,
      milestone_number: getNextMilestoneNumber(),
    }));
    setShowAddMilestoneModal(true);
  };

  const handleAddMilestone = async () => {
    if (!pathId) return;
    if (!newMilestone.title.trim()) {
      alert("Please enter a title.");
      return;
    }

    try {
      const res = await fetch("/api/admin/data?table=path_milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          learning_path_id: pathId,
          ...newMilestone,
          milestone_number: Number(newMilestone.milestone_number),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add milestone");

      const created: Milestone = json.data;
      setMilestones((prev) =>
        [...prev, created].sort(
          (a, b) => (a.milestone_number || 0) - (b.milestone_number || 0)
        )
      );
      setVideosByMilestone((prev) => ({ ...prev, [created.id]: [] }));
      setResourcesByMilestone((prev) => ({ ...prev, [created.id]: [] }));
      setQuizzesByMilestone((prev) => ({ ...prev, [created.id]: [] }));
      setNewVideo((prev) => ({
        ...prev,
        [created.id]: {
          youtube_url: "",
          title: "",
          title_ar: "",
          language: "en",
        },
      }));
      setNewResource((prev) => ({ ...prev, [created.id]: { resource_id: "" } }));
      setNewQuiz((prev) => ({
        ...prev,
        [created.id]: {
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
      setScrapingArticle((prev) => ({
        ...prev,
        [created.id]: { query: "", source: "oracle_docs", isScraping: false },
      }));
      setNewArticle((prev) => ({
        ...prev,
        [created.id]: {
          title: "",
          title_ar: "",
          url: "",
          content: "",
          content_ar: "",
          language: "en",
          is_free: false,
        },
      }));
      setShowAddMilestoneModal(false);
    } catch (err: any) {
      alert(err.message);
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

  const handleUpdateMilestone = async (id: string) => {
    if (!editingMilestone) return;
    try {
      const res = await fetch(
        `/api/admin/data?table=path_milestones&id=${encodeURIComponent(id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...editingMilestone,
            milestone_number: Number(editingMilestone.milestone_number),
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to update");
      const json = await res.json();
      setMilestones((prev) =>
        prev
          .map((m) => (m.id === id ? json.data : m))
          .sort((a, b) => (a.milestone_number || 0) - (b.milestone_number || 0))
      );
      setEditingMilestoneId(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await fetch(
        `/api/admin/data?table=path_milestones&id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      setMilestones((prev) => prev.filter((m) => m.id !== id));
      if (openMilestoneModal === id) setOpenMilestoneModal(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddVideo = async (milestoneId: string) => {
    const data = newVideo[milestoneId];
    const youtubeId = parseYouTubeId(data.youtube_url);
    if (!youtubeId) return alert("Invalid YouTube URL");

    try {
      const res = await fetch("/api/admin/data?table=video_content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtube_video_id: youtubeId,
          youtube_url: data.youtube_url,
          title: data.language === "en" ? data.title : "",
          title_ar: data.language === "ar" ? data.title : data.title_ar,
          milestone_id: milestoneId,
          primary_language: data.language,
          is_active: true,
        }),
      });
      const json = await res.json();
      setVideosByMilestone((prev) => ({
        ...prev,
        [milestoneId]: [...(prev[milestoneId] || []), json.data],
      }));
      setNewVideo((prev) => ({
        ...prev,
        [milestoneId]: { ...prev[milestoneId], youtube_url: "", title: "" },
      }));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteVideo = async (milestoneId: string, videoId: string) => {
    if (!confirm("Delete video?")) return;
    await fetch(
      `/api/admin/data?table=video_content&id=${encodeURIComponent(videoId)}`,
      { method: "DELETE" }
    );
    setVideosByMilestone((prev) => ({
      ...prev,
      [milestoneId]: prev[milestoneId].filter((v) => v.id !== videoId),
    }));
  };

  const handleAddResource = async (milestoneId: string, resourceId?: string) => {
    const id = resourceId || newResource[milestoneId]?.resource_id;
    if (!id) return;

    try {
      const res = await fetch("/api/admin/data?table=milestone_resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestone_id: milestoneId, resource_id: id }),
      });
      const resourcesRes = await fetch(
        `/api/admin/data?table=milestone_resources_view&filterColumn=milestone_id&filterValue=${encodeURIComponent(
          milestoneId
        )}`
      );
      const json = await resourcesRes.json();
      setResourcesByMilestone((prev) => ({
        ...prev,
        [milestoneId]: json.data.map((r: any) => ({
          id: r.id,
          resource_id: r.resource_id,
          resource_title: r.resource_title || r.title,
          url: r.url,
        })),
      }));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteResource = async (milestoneId: string, id: string) => {
    if (!confirm("Unlink resource?")) return;
    await fetch(
      `/api/admin/data?table=milestone_resources&id=${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
    setResourcesByMilestone((prev) => ({
      ...prev,
      [milestoneId]: prev[milestoneId].filter((r) => r.id !== id),
    }));
  };

  const handleAddQuiz = async (milestoneId: string) => {
    const data = newQuiz[milestoneId];
    try {
      const res = await fetch("/api/admin/data?table=quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestone_id: milestoneId,
          ...data,
          is_active: true,
        }),
      });
      const json = await res.json();
      setQuizzesByMilestone((prev) => ({
        ...prev,
        [milestoneId]: [...(prev[milestoneId] || []), json.data],
      }));
      setNewQuiz((prev) => ({ ...prev, [milestoneId]: { ...data, title: "" } }));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteQuiz = async (milestoneId: string, quizId: string) => {
    if (!confirm("Delete quiz?")) return;
    await fetch(
      `/api/admin/data?table=quizzes&id=${encodeURIComponent(quizId)}`,
      { method: "DELETE" }
    );
    setQuizzesByMilestone((prev) => ({
      ...prev,
      [milestoneId]: prev[milestoneId].filter((q) => q.id !== quizId),
    }));
  };

  const handleScrapeArticle = async (milestoneId: string) => {
    const data = scrapingArticle[milestoneId];
    setScrapingArticle((prev) => ({
      ...prev,
      [milestoneId]: { ...data, isScraping: true },
    }));
    try {
      const res = await fetch("/api/admin/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_type: data.source === "oracle_docs" ? "oracle_docs" : "youtube",
          search_query: data.query,
        }),
      });
      const json = await res.json();
      // Simple polling simulation or just assume success if API ok
      setTimeout(() => {
        setScrapingArticle((prev) => ({
          ...prev,
          [milestoneId]: { ...data, isScraping: false },
        }));
      }, 2000);
    } catch (err) {
      setScrapingArticle((prev) => ({
        ...prev,
        [milestoneId]: { ...data, isScraping: false },
      }));
    }
  };

  const handleAddArticle = async (milestoneId: string) => {
    const data = newArticle[milestoneId];
    try {
      const resourceRes = await fetch(
        "/api/admin/data?table=learning_resources",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title,
            title_ar: data.title_ar,
            description: data.content,
            description_ar: data.content_ar,
            url: data.url,
            resource_type: "article",
            language: data.language,
            is_active: true,
            is_free: data.is_free || false,
          }),
        }
      );
      const resJson = await resourceRes.json();
      await handleAddResource(milestoneId, resJson.data.id);

      // Reset form
      setNewArticle((prev) => ({
        ...prev,
        [milestoneId]: {
          title: "",
          title_ar: "",
          url: "",
          content: "",
          content_ar: "",
          language: "en",
          is_free: false,
        },
      }));

      setShowAddArticleModal(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="p-8">Loading path...</div>;
  if (!path) return <div className="p-8">Path not found.</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="mb-6">
        <Link
          href="/admin/paths"
          className="text-teal-600 hover:text-teal-700 mb-2 inline-block font-medium"
        >
          ← Back to Paths
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">
          Edit Learning Path
        </h1>
        <p className="text-slate-500">
          Update path details and manage learning milestones.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      <PathDetailsForm
        formData={formData}
        setFormData={setFormData}
        onSubmit={handlePathSubmit}
        saving={saving}
      />

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Milestones</h2>
          <button
            onClick={handleOpenAddMilestoneModal}
            className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 font-medium transition-colors"
          >
            + Add Milestone
          </button>
        </div>

        <div className="space-y-4">
          {milestones.length === 0 ? (
            <p className="text-slate-500 text-sm">No milestones yet.</p>
          ) : (
            milestones.map((m) => (
              <MilestoneItem
                key={m.id}
                milestone={m}
                isEditing={editingMilestoneId === m.id}
                editingMilestone={editingMilestone}
                setEditingMilestone={setEditingMilestone}
                onEdit={handleEditMilestone}
                onCancelEdit={() => setEditingMilestoneId(null)}
                onUpdate={handleUpdateMilestone}
                onDelete={handleDeleteMilestone}
                onOpenModal={setOpenMilestoneModal}
                counts={{
                  videos: (videosByMilestone[m.id] || []).length,
                  resources: (resourcesByMilestone[m.id] || []).length,
                  quizzes: (quizzesByMilestone[m.id] || []).length,
                }}
              />
            ))
          )}
        </div>
      </div>

      <AddMilestoneModal
        isOpen={showAddMilestoneModal}
        onClose={() => setShowAddMilestoneModal(false)}
        onSubmit={handleAddMilestone}
        newMilestone={newMilestone}
        setNewMilestone={setNewMilestone}
      />

      {openMilestoneModal && (
        <MilestoneModal
          milestone={milestones.find((m) => m.id === openMilestoneModal)!}
          onClose={() => setOpenMilestoneModal(null)}
          videos={videosByMilestone[openMilestoneModal] || []}
          onDeleteVideo={(vId) => handleDeleteVideo(openMilestoneModal, vId)}
          newVideo={newVideo}
          setNewVideo={setNewVideo}
          onAddVideo={handleAddVideo}
          resources={resourcesByMilestone[openMilestoneModal] || []}
          onDeleteResource={handleDeleteResource}
          onEditResource={(_mId, rId) =>
            window.open(`/admin/resources?edit=${rId}`, "_blank")
          }
          allResources={allResources}
          newResource={newResource}
          setNewResource={setNewResource}
          onAddResource={handleAddResource}
          showAddArticleModal={showAddArticleModal}
          onOpenAddArticleModal={setShowAddArticleModal}
          onCloseAddArticleModal={() => setShowAddArticleModal(null)}
          newArticle={newArticle}
          setNewArticle={setNewArticle}
          onAddArticle={handleAddArticle}
          scrapingArticle={scrapingArticle}
          setScrapingArticle={setScrapingArticle}
          onScrapeArticle={handleScrapeArticle}
          quizzes={quizzesByMilestone[openMilestoneModal] || []}
          onDeleteQuiz={handleDeleteQuiz}
          newQuiz={newQuiz}
          setNewQuiz={setNewQuiz}
          onAddQuiz={handleAddQuiz}
          onEditMilestone={handleEditMilestone}
          onDeleteMilestone={handleDeleteMilestone}
        />
      )}
    </div>
  );
}
