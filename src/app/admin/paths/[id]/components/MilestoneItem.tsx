"use client";

import { Milestone, NewMilestone } from "../types";

interface MilestoneItemProps {
    milestone: Milestone;
    isEditing: boolean;
    editingMilestone: NewMilestone | null;
    setEditingMilestone: React.Dispatch<React.SetStateAction<NewMilestone | null>>;
    onEdit: (m: Milestone) => void;
    onCancelEdit: () => void;
    onUpdate: (id: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onOpenModal: (id: string) => void;
    counts: {
        videos: number;
        resources: number;
        // quizzes: number;
    };
}

export default function MilestoneItem({
    milestone,
    isEditing,
    editingMilestone,
    setEditingMilestone,
    onEdit,
    onCancelEdit,
    onUpdate,
    onDelete,
    onOpenModal,
    counts,
}: MilestoneItemProps) {
    return (
        <div className="border border-slate-200 rounded-lg p-4">
            {isEditing && editingMilestone ? (
                // Edit Form
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-700">Edit Milestone</h3>
                        <button
                            onClick={onCancelEdit}
                            className="text-xs text-slate-500 hover:text-slate-700"
                        >
                            Cancel
                        </button>
                    </div>

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
                                id={`edit_is_optional_${milestone.id}`}
                                checked={editingMilestone.is_optional}
                                onChange={(e) =>
                                    setEditingMilestone((prev) =>
                                        prev ? { ...prev, is_optional: e.target.checked } : null
                                    )
                                }
                                className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 mt-0.5"
                            />
                            <label
                                htmlFor={`edit_is_optional_${milestone.id}`}
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
                                                    .filter((line: string) => line.trim()),
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
                                                    .filter((line: string) => line.trim()),
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
                                                .filter((line: string) => line.trim()),
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
                            onClick={onCancelEdit}
                            className="px-4 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => onUpdate(milestone.id)}
                            className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            ) : (
                // Display Mode - Compact List View
                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <div className="text-xs font-medium text-slate-500">
                                Milestone {milestone.milestone_number}
                            </div>
                            <div className="font-medium text-slate-900">
                                {milestone.title}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>
                                    {counts.videos} video{counts.videos !== 1 ? 's' : ''}
                                </span>
                                <span>•</span>
                                <span>
                                    {counts.resources} resource{counts.resources !== 1 ? 's' : ''}
                                </span>
                                {/* <span>•</span>
                                <span>
                                    {counts.quizzes} quiz{counts.quizzes !== 1 ? 'zes' : ''}
                                </span> */}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onOpenModal(milestone.id)}
                            className="text-xs px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
                        >
                            Open
                        </button>
                        <button
                            onClick={() => onEdit(milestone)}
                            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => onDelete(milestone.id)}
                            className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
