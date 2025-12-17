"use client";

import { useState } from "react";
import { GeneratedPath, GeneratedMilestone, GeneratedResource } from "@/services/pathGenerator";

type EditablePath = GeneratedPath & {
  id?: string; // For existing paths
};

type Props = {
  generatedPath: GeneratedPath;
  onSave: (path: EditablePath) => Promise<void>;
  onCancel?: () => void;
  isSaving?: boolean;
};

export function EditablePathView({ generatedPath, onSave, onCancel, isSaving = false }: Props) {
  const [editedPath, setEditedPath] = useState<EditablePath>(generatedPath);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<number>>(new Set([1]));

  const toggleMilestone = (num: number) => {
    const newSet = new Set(expandedMilestones);
    if (newSet.has(num)) {
      newSet.delete(num);
    } else {
      newSet.add(num);
    }
    setExpandedMilestones(newSet);
  };

  const updateMilestone = (index: number, updates: Partial<GeneratedMilestone>) => {
    const newMilestones = [...editedPath.milestones];
    newMilestones[index] = { ...newMilestones[index], ...updates };
    setEditedPath({ ...editedPath, milestones: newMilestones });
  };

  const updateResource = (
    milestoneIndex: number,
    resourceIndex: number,
    updates: Partial<GeneratedResource>
  ) => {
    const newMilestones = [...editedPath.milestones];
    const resources = [...newMilestones[milestoneIndex].resources];
    resources[resourceIndex] = { ...resources[resourceIndex], ...updates };
    newMilestones[milestoneIndex] = { ...newMilestones[milestoneIndex], resources };
    setEditedPath({ ...editedPath, milestones: newMilestones });
  };

  const addResource = (milestoneIndex: number) => {
    const newMilestones = [...editedPath.milestones];
    const newResource: GeneratedResource = {
      title: "New Resource",
      url: "",
      resource_type: "article",
      platform: "Custom",
      is_free: true,
      estimated_duration_minutes: 30,
      difficulty_level: "beginner",
      language: "en",
      selection_reason: "Added manually",
    };
    newMilestones[milestoneIndex].resources.push(newResource);
    setEditedPath({ ...editedPath, milestones: newMilestones });
  };

  const removeResource = (milestoneIndex: number, resourceIndex: number) => {
    const newMilestones = [...editedPath.milestones];
    newMilestones[milestoneIndex].resources.splice(resourceIndex, 1);
    setEditedPath({ ...editedPath, milestones: newMilestones });
  };

  const handleSave = async () => {
    await onSave(editedPath);
  };

  return (
    <div className="space-y-6">
      {/* Path Header - Editable */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Title (English)</label>
            <input
              type="text"
              value={editedPath.path.title}
              onChange={(e) =>
                setEditedPath({
                  ...editedPath,
                  path: { ...editedPath.path, title: e.target.value },
                })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Title (Arabic)</label>
            <input
              type="text"
              value={editedPath.path.title_ar}
              onChange={(e) =>
                setEditedPath({
                  ...editedPath,
                  path: { ...editedPath.path, title_ar: e.target.value },
                })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Description (English)</label>
            <textarea
              value={editedPath.path.description}
              onChange={(e) =>
                setEditedPath({
                  ...editedPath,
                  path: { ...editedPath.path, description: e.target.value },
                })
              }
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Description (Arabic)</label>
            <textarea
              value={editedPath.path.description_ar}
              onChange={(e) =>
                setEditedPath({
                  ...editedPath,
                  path: { ...editedPath.path, description_ar: e.target.value },
                })
              }
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
            />
          </div>
        </div>
      </div>

      {/* Milestones - Editable */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-900">Milestones</h3>
        {editedPath.milestones.map((milestone, milestoneIndex) => (
          <div
            key={milestone.milestone_number}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h4
                className="text-lg font-semibold text-slate-900 cursor-pointer"
                onClick={() => toggleMilestone(milestone.milestone_number)}
              >
                {milestone.milestone_number}. {milestone.title}
              </h4>
              <button
                onClick={() => toggleMilestone(milestone.milestone_number)}
                className="text-slate-500 hover:text-slate-700"
              >
                {expandedMilestones.has(milestone.milestone_number) ? "▼" : "▶"}
              </button>
            </div>

            {expandedMilestones.has(milestone.milestone_number) && (
              <div className="space-y-4">
                {/* Milestone Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Title (EN)</label>
                    <input
                      type="text"
                      value={milestone.title}
                      onChange={(e) =>
                        updateMilestone(milestoneIndex, { title: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Title (AR)</label>
                    <input
                      type="text"
                      value={milestone.title_ar}
                      onChange={(e) =>
                        updateMilestone(milestoneIndex, { title_ar: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                  <textarea
                    value={milestone.description}
                    onChange={(e) =>
                      updateMilestone(milestoneIndex, { description: e.target.value })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                {/* Resources */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">Resources</label>
                    <button
                      onClick={() => addResource(milestoneIndex)}
                      className="text-xs px-3 py-1 bg-[#429874] text-white rounded-lg hover:bg-[#357a5d]"
                    >
                      + Add Resource
                    </button>
                  </div>
                  <div className="space-y-3">
                    {milestone.resources.map((resource, resourceIndex) => (
                      <div
                        key={resourceIndex}
                        className="border border-slate-200 rounded-lg p-4 bg-slate-50"
                      >
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Title
                            </label>
                            <input
                              type="text"
                              value={resource.title}
                              onChange={(e) =>
                                updateResource(milestoneIndex, resourceIndex, {
                                  title: e.target.value,
                                })
                              }
                              className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Type
                            </label>
                            <select
                              value={resource.resource_type}
                              onChange={(e) =>
                                updateResource(milestoneIndex, resourceIndex, {
                                  resource_type: e.target.value as any,
                                })
                              }
                              className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                            >
                              <option value="article">Article</option>
                              <option value="course">Course/Playlist</option>
                              <option value="video">Video</option>
                              <option value="documentation">Documentation</option>
                              <option value="tutorial">Tutorial</option>
                              <option value="lab">Lab</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">URL</label>
                            <input
                              type="url"
                              value={resource.url}
                              onChange={(e) =>
                                updateResource(milestoneIndex, resourceIndex, {
                                  url: e.target.value,
                                })
                              }
                              className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Platform
                            </label>
                            <input
                              type="text"
                              value={resource.platform}
                              onChange={(e) =>
                                updateResource(milestoneIndex, resourceIndex, {
                                  platform: e.target.value,
                                })
                              }
                              className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs text-slate-600">
                            <span>
                              Duration:{" "}
                              <input
                                type="number"
                                value={resource.estimated_duration_minutes}
                                onChange={(e) =>
                                  updateResource(milestoneIndex, resourceIndex, {
                                    estimated_duration_minutes: parseInt(e.target.value) || 0,
                                  })
                                }
                                className="w-16 px-2 py-1 border border-slate-300 rounded inline"
                              />{" "}
                              min
                            </span>
                            <label className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={resource.is_free}
                                onChange={(e) =>
                                  updateResource(milestoneIndex, resourceIndex, {
                                    is_free: e.target.checked,
                                  })
                                }
                              />
                              Free
                            </label>
                            {!resource.is_free && (
                              <span>
                                Price:{" "}
                                <input
                                  type="number"
                                  value={resource.price_egp || 0}
                                  onChange={(e) =>
                                    updateResource(milestoneIndex, resourceIndex, {
                                      price_egp: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-20 px-2 py-1 border border-slate-300 rounded inline"
                                />{" "}
                                EGP
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => removeResource(milestoneIndex, resourceIndex)}
                            className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-200">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-gradient-to-r from-[#357a5d] to-[#429874] text-white rounded-lg font-semibold hover:from-[#285c46] hover:to-[#357a5d] transition-all disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Path"}
        </button>
      </div>
    </div>
  );
}

