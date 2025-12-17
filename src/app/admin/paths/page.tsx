"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type LearningPath = {
  id: string;
  title: string;
  description: string;
  slug: string;
  is_published: boolean;
  difficulty_level: "beginner" | "intermediate" | "advanced" | string;
  estimated_duration_hours: number;
  created_at: string;
};

export default function PathsPage() {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPaths = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ table: "learning_paths" });
      const res = await fetch(`/api/admin/data?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        // If admin session is missing, redirect to admin login
        if (res.status === 401) {
          if (typeof window !== "undefined") {
            window.location.href = "/admin/login?error=unauthorized";
          }
          return;
        }
        throw new Error(json.error || "Failed to load paths");
      }
      const data = (json.data || []) as LearningPath[];
      // Sort by created_at desc to match previous behaviour
      data.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setPaths(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error loading paths");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaths();
  }, []);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Learning Paths</h1>
          <p className="text-slate-500">Manage all learning paths</p>
        </div>
        <Link
          href="/admin/paths/new"
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          + Add Path
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">Error loading paths: {error}</p>
        </div>
      )}

      {loading && (
        <div className="mb-4 text-slate-500 text-sm">Loading paths...</div>
      )}

      <div className="grid gap-4">
        {paths && paths.length > 0 ? (
          paths.map((path) => (
            <div key={path.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">{path.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      path.is_published ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                    }`}>
                      {path.is_published ? "Published" : "Draft"}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      path.difficulty_level === "beginner" ? "bg-blue-100 text-blue-700" :
                      path.difficulty_level === "intermediate" ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {path.difficulty_level}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{path.description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Duration: {path.estimated_duration_hours}h</span>
                    <span>•</span>
                    <span>Slug: {path.slug}</span>
                    <span>•</span>
                    <span>Created: {new Date(path.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 ml-4">
                  <Link
                    href={`/admin/paths/${path.id}`}
                    className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/paths/${path.slug}`}
                    className="px-3 py-1.5 text-sm bg-teal-100 text-teal-700 rounded hover:bg-teal-200 transition-colors"
                    target="_blank"
                  >
                    View
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("Are you sure you want to delete this path?")) return;
                      try {
                        const params = new URLSearchParams({
                          table: "learning_paths",
                          id: path.id,
                        });
                        const res = await fetch(`/api/admin/data?${params.toString()}`, {
                          method: "DELETE",
                        });
                        const json = await res.json();
                        if (!res.ok) {
                          alert(json.error || "Failed to delete path");
                          return;
                        }
                        // Optimistically remove from local state
                        setPaths((prev) => prev.filter((p) => p.id !== path.id));
                      } catch (err: any) {
                        console.error(err);
                        alert(err.message || "Failed to delete path");
                      }
                    }}
                    className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-slate-500 mb-4">No learning paths found.</p>
            <Link
              href="/admin/paths/new"
              className="inline-block px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Create Your First Path
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}



