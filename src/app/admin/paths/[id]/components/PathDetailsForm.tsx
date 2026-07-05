"use client";

import { LearningPath } from "../types";
import { useRouter } from "next/navigation";

interface PathDetailsFormProps {
    formData: Partial<LearningPath>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<LearningPath>>>;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    saving: boolean;
}

export default function PathDetailsForm({
    formData,
    setFormData,
    onSubmit,
    saving,
}: PathDetailsFormProps) {
    const router = useRouter();

    return (
        <form
            onSubmit={onSubmit}
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
                    <label htmlFor="career_focus" className="block text-sm font-medium text-slate-700 mb-2">
                        Career Focus
                    </label>
                    <select
                        id="career_focus"
                        value={formData.career_focus || ""}
                        onChange={(e) =>
                            setFormData((prev) => ({
                                ...prev,
                                career_focus: e.target.value || null,
                            }))
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                        <option value="">Available for All Tracks</option>
                        <option value="technical">Technical</option>
                        <option value="business_functional">Business Functional</option>
                        <option value="business_consultant">Business Consultant</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                        Drives Find Your Path recommendations — leave as &quot;Available for All Tracks&quot; if this path suits everyone.
                    </p>
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
    );
}
