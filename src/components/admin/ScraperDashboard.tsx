"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

type ScrapeJob = {
  id: string;
  job_type: string;
  target_url: string | null;
  search_query: string | null;
  status: string;
  results_count: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

type StagedResource = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  resource_type: string | null;
  platform: string | null;
  language: string | null;
  author_name: string | null;
  view_count: number | null;
  rating: number | null;
  duration_minutes: number | null;
  thumbnail_url: string | null;
  review_status: string;
  suggested_path_id: string | null;
};

type Path = {
  id: string;
  title: string;
  title_ar: string | null;
  slug: string;
};

type Props = {
  recentJobs: ScrapeJob[];
  pendingResources: StagedResource[];
  pendingCount: number;
  paths: Path[];
};

const scraperTypes = [
  { id: "youtube", name: "YouTube", icon: "🎬", description: "Search YouTube for Oracle tutorials" },
  { id: "udemy", name: "Udemy (Public)", icon: "📚", description: "Find relevant Udemy courses" },
  { id: "oracle_docs", name: "Oracle Docs", icon: "📖", description: "Scrape Oracle documentation" },
  { id: "job_postings", name: "Job Postings", icon: "💼", description: "Analyze job requirements" },
];

export function ScraperDashboard({ recentJobs, pendingResources, pendingCount, paths }: Props) {
  const supabase = createClient();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [resources, setResources] = useState(pendingResources);

  const startScrapeJob = async () => {
    if (!selectedType || !searchQuery) return;
    
    setIsRunning(true);
    
    try {
      // Call the scraper API
      const response = await fetch("/api/admin/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_type: selectedType,
          search_query: searchQuery,
        }),
      });

      if (response.ok) {
        alert("Scrape job started! Results will appear below when ready.");
        setSearchQuery("");
        setSelectedType(null);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error("Scrape error:", error);
      alert("Failed to start scrape job");
    } finally {
      setIsRunning(false);
    }
  };

  const reviewResource = async (resourceId: string, status: "approved" | "rejected", pathId?: string) => {
    try {
      if (status === "approved" && pathId) {
        // Move to main resources table
        const resource = resources.find(r => r.id === resourceId);
        if (resource) {
          await supabase.from("learning_resources").insert({
            title: resource.title,
            description: resource.description,
            url: resource.url,
            resource_type: resource.resource_type || "video",
            language: resource.language || "en",
            author_name: resource.author_name,
            view_count: resource.view_count,
            rating: resource.rating,
            estimated_duration_minutes: resource.duration_minutes,
            thumbnail_url: resource.thumbnail_url,
            is_verified: true,
            is_active: true,
          });
        }
      }

      // Update staging status
      await supabase
        .from("scraped_resources_staging")
        .update({ 
          review_status: status,
          reviewed_at: new Date().toISOString(),
          suggested_path_id: pathId || null,
        })
        .eq("id", resourceId);

      // Remove from local state
      setResources(resources.filter(r => r.id !== resourceId));
    } catch (error) {
      console.error("Review error:", error);
      alert("Failed to update resource");
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Resource Scraper</h1>
        <p className="text-slate-500">Discover and curate learning resources from across the web</p>
      </div>

      {/* Scraper Controls */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-slate-900 mb-4">Start New Scrape</h2>
        
        {/* Scraper Type Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {scraperTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedType === type.id
                  ? "border-teal-500 bg-teal-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className="text-2xl block mb-1">{type.icon}</span>
              <span className="font-medium text-slate-900 text-sm">{type.name}</span>
              <span className="text-xs text-slate-500 block">{type.description}</span>
            </button>
          ))}
        </div>

        {/* Search Query */}
        {selectedType && (
          <div className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search query for ${selectedType}...`}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              onClick={startScrapeJob}
              disabled={isRunning || !searchQuery}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? "Running..." : "Start Scrape"}
            </button>
          </div>
        )}
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-slate-900 mb-4">Recent Scrape Jobs</h2>
        {recentJobs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-medium text-slate-500">Type</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-500">Query</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-500">Status</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-500">Results</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job) => (
                  <tr key={job.id} className="border-b border-slate-100">
                    <td className="py-2 px-3">{job.job_type}</td>
                    <td className="py-2 px-3 truncate max-w-xs">{job.search_query}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        job.status === "completed" ? "bg-green-100 text-green-700" :
                        job.status === "running" ? "bg-blue-100 text-blue-700" :
                        job.status === "failed" ? "bg-red-100 text-red-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="py-2 px-3">{job.results_count}</td>
                    <td className="py-2 px-3 text-slate-500">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 text-center py-4">No scrape jobs yet</p>
        )}
      </div>

      {/* Pending Resources for Review */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">
            Pending Review 
            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
              {pendingCount}
            </span>
          </h2>
        </div>

        {resources.length > 0 ? (
          <div className="space-y-4">
            {resources.map((resource) => (
              <div key={resource.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex gap-4">
                  {resource.thumbnail_url && (
                    <img 
                      src={resource.thumbnail_url} 
                      alt="" 
                      className="w-32 h-20 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900 truncate">{resource.title}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mt-1">
                      {resource.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span>{resource.platform}</span>
                      {resource.author_name && <span>• {resource.author_name}</span>}
                      {resource.view_count && <span>• {resource.view_count.toLocaleString()} views</span>}
                      {resource.rating && <span>• ⭐ {resource.rating}</span>}
                    </div>
                    <a 
                      href={resource.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-teal-600 hover:underline mt-1 inline-block"
                    >
                      View Resource →
                    </a>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                  <select
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-sm"
                    defaultValue=""
                    id={`path-${resource.id}`}
                  >
                    <option value="">Assign to path...</option>
                    {paths.map((path) => (
                      <option key={path.id} value={path.id}>{path.title}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      const select = document.getElementById(`path-${resource.id}`) as HTMLSelectElement;
                      if (select.value) {
                        reviewResource(resource.id, "approved", select.value);
                      } else {
                        alert("Please select a path first");
                      }
                    }}
                    className="px-4 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => reviewResource(resource.id, "rejected")}
                    className="px-4 py-1.5 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">No resources pending review</p>
        )}
      </div>
    </div>
  );
}

