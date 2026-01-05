"use client";

import { MilestoneResource, LearningResource } from "../types";
import { LinkPreview } from "@/components/admin/LinkPreview";
interface ResourceSectionProps {
    resources: MilestoneResource[];
    onDeleteResource: (id: string) => void;
    onEditResource: (resourceId: string) => void;
    allResources: LearningResource[];
    newResource: { resource_id: string };
    setNewResource: (data: any) => void;
    onAddResource: () => void;
    onOpenAddArticleModal: () => void;
    scrapingArticle: { query: string; source: string; isScraping: boolean };
    setScrapingArticle: (data: any) => void;
    onScrapeArticle: () => void;
}

export default function ResourceSection({
    resources,
    onDeleteResource,
    onEditResource,
    allResources,
    newResource,
    setNewResource,
    onAddResource,
    onOpenAddArticleModal,
    scrapingArticle,
    setScrapingArticle,
    onScrapeArticle,
}: ResourceSectionProps) {
    return (
        <div className="border-b border-slate-200 pb-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Resources</h3>

            {/* Existing resources */}
            <div className="mt-2 text-xs font-medium text-slate-500 mb-1">
                Linked resources
            </div>
            {resources.length > 0 ? (
                <div className="space-y-2">
                    {resources.map((r) => (
                        <div
                            key={r.id}
                            className="flex items-center justify-between text-xs border border-slate-200 rounded-lg p-2"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-slate-800 truncate">
                                    {r.resource_title}
                                </div>
                                {r.url && r.url.trim() ? (
                                    <a
                                        href={r.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[11px] text-teal-600 hover:text-teal-700 break-all block truncate"
                                    >
                                        {r.url}
                                    </a>
                                ) : (
                                    <span className="text-[11px] text-slate-400 italic">
                                        No URL (content only)
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                                <button
                                    type="button"
                                    onClick={() => onEditResource(r.resource_id)}
                                    className="text-[11px] text-blue-600 hover:text-blue-700 px-2 py-1 border border-blue-200 rounded hover:bg-blue-50"
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDeleteResource(r.id)}
                                    className="text-[11px] text-red-600 hover:text-red-700 px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-slate-400">
                    No resources linked yet for this milestone.
                </p>
            )}

            {/* Add new resource */}
            <div className="mt-3 border-t border-slate-100 pt-3">
                <div className="text-xs font-medium text-slate-500 mb-1">
                    Link resource
                </div>
                <div className="flex flex-col md:flex-row gap-2 items-center">
                    <select
                        value={newResource?.resource_id || ""}
                        onChange={(e) =>
                            setNewResource((prev: any) => ({
                                ...prev,
                                resource_id: e.target.value,
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
                        onClick={onAddResource}
                        className="px-3 py-2 bg-teal-600 text-white text-xs rounded-lg hover:bg-teal-700 whitespace-nowrap"
                    >
                        Add Resource
                    </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                    The list shows all resources from the Resources admin page.
                </p>
            </div>

            {/* Add Article Manually Button */}
            <div className="mt-3 border-t border-slate-100 pt-3">
                <button
                    type="button"
                    onClick={onOpenAddArticleModal}
                    className="text-xs px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                    + Add Article Manually
                </button>
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
                            value={scrapingArticle?.query || ""}
                            onChange={(e) =>
                                setScrapingArticle((prev: any) => ({
                                    ...prev,
                                    query: e.target.value,
                                }))
                            }
                            className="md:col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            disabled={scrapingArticle?.isScraping}
                        />
                        <select
                            value={scrapingArticle?.source || "oracle_docs"}
                            onChange={(e) =>
                                setScrapingArticle((prev: any) => ({
                                    ...prev,
                                    source: e.target.value,
                                }))
                            }
                            className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            disabled={scrapingArticle?.isScraping}
                        >
                            <option value="oracle_docs">Oracle Docs</option>
                            <option value="medium">Medium</option>
                        </select>
                    </div>

                    <LinkPreview
                        url={scrapingArticle?.query || ""}
                    />

                    <button
                        type="button"
                        onClick={onScrapeArticle}
                        disabled={scrapingArticle?.isScraping}
                        className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {scrapingArticle?.isScraping ? "Scraping..." : "Scrape & Add Article"}
                    </button>
                    <p className="text-[10px] text-slate-400">
                        This will search for articles and automatically add the first result to this milestone.
                    </p>
                </div>
            </div>
        </div>
    );
}
