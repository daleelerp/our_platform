"use client";

import { NewMilestone } from "../types";

interface AddMilestoneModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => Promise<void>;
    newMilestone: NewMilestone;
    setNewMilestone: React.Dispatch<React.SetStateAction<NewMilestone>>;
}

export default function AddMilestoneModal({
    isOpen,
    onClose,
    onSubmit,
    newMilestone,
    setNewMilestone,
}: AddMilestoneModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">Add new milestone</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-800">
                            💡 Budget/Price is set when adding resources later, not here
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
                                    Milestone number *
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    required
                                    value={newMilestone.milestone_number}
                                    onChange={(e) =>
                                        setNewMilestone((prev) => ({
                                            ...prev,
                                            milestone_number: e.target.value ? Number(e.target.value) : "",
                                        }))
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
                                    value={newMilestone.description}
                                    onChange={(e) =>
                                        setNewMilestone((prev) => ({
                                            ...prev,
                                            description: e.target.value,
                                        }))
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
                                    value={newMilestone.description_ar}
                                    onChange={(e) =>
                                        setNewMilestone((prev) => ({
                                            ...prev,
                                            description_ar: e.target.value,
                                        }))
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
                                    value={newMilestone.estimated_hours}
                                    onChange={(e) =>
                                        setNewMilestone((prev) => ({
                                            ...prev,
                                            estimated_hours: e.target.value ? Number(e.target.value) : "",
                                        }))
                                    }
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>
                            {/* <div className="flex items-start pt-6">
                                <input
                                    type="checkbox"
                                    id="chk_is_optional"
                                    checked={newMilestone.is_optional}
                                    onChange={(e) =>
                                        setNewMilestone((prev) => ({
                                            ...prev,
                                            is_optional: e.target.checked,
                                        }))
                                    }
                                    className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 mt-0.5"
                                />
                                <label
                                    htmlFor="chk_is_optional"
                                    className="ml-2 text-xs font-medium text-slate-700"
                                >
                                    Optional milestone
                                </label>
                            </div> */}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                    Learning Objectives (English)
                                </label>
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
                                    placeholder="One goal per line"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                    Learning Objectives (Arabic)
                                </label>
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
                                />
                            </div>
                        </div>

                        {/* Currently there is no ability adding checkpoints */}
                        {/* <div className="border-t border-slate-200 pt-3">
                            <p className="text-[10px] font-medium text-slate-600 mb-2">Checkpoint</p>
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
                                        value={newMilestone.checkpoint_description}
                                        onChange={(e) =>
                                            setNewMilestone((prev) => ({
                                                ...prev,
                                                checkpoint_description: e.target.value,
                                            }))
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
                                        value={newMilestone.checkpoint_description_ar}
                                        onChange={(e) =>
                                            setNewMilestone((prev) => ({
                                                ...prev,
                                                checkpoint_description_ar: e.target.value,
                                            }))
                                        }
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    />
                                </div>
                            </div>
                        </div> */}


                        {/* This is part not in use */}
                        {/* Job Skills Unlocked */}
                        {/* <div className="border-t border-slate-200 pt-3">
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                Job Skills Unlocked
                            </label>
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
                                placeholder="One skill per line"
                            />
                        </div> */}

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={onSubmit}
                                className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 font-medium"
                            >
                                Add Milestone
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
