"use client";

import { useState } from "react";
import { GeneratedPath, GeneratedMilestone, GeneratedResource, GeneratedQuizQuestion } from "@/services/pathGenerator";

type EditablePath = GeneratedPath & {
  id?: string;
};

type Props = {
  generatedPath: GeneratedPath;
  onSave: (path: EditablePath) => Promise<void>;
  onCancel?: () => void;
  isSaving?: boolean;
  saveLabel?: string;
};

export function EditablePathView({ generatedPath, onSave, onCancel, isSaving = false, saveLabel = "Save Path" }: Props) {
  const [editedPath, setEditedPath] = useState<EditablePath>(generatedPath);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<number>>(new Set([1]));
  const [expandedQuizzes, setExpandedQuizzes] = useState<Set<number>>(new Set());
  const [regeneratingMilestone, setRegeneratingMilestone] = useState<number | null>(null);

  const toggleMilestone = (num: number) => {
    const newSet = new Set(expandedMilestones);
    newSet.has(num) ? newSet.delete(num) : newSet.add(num);
    setExpandedMilestones(newSet);
  };

  const toggleQuiz = (num: number) => {
    const newSet = new Set(expandedQuizzes);
    newSet.has(num) ? newSet.delete(num) : newSet.add(num);
    setExpandedQuizzes(newSet);
  };

  const updateMilestone = (index: number, updates: Partial<GeneratedMilestone>) => {
    const newMilestones = [...editedPath.milestones];
    newMilestones[index] = { ...newMilestones[index], ...updates };
    setEditedPath({ ...editedPath, milestones: newMilestones });
  };

  const updateResource = (milestoneIndex: number, resourceIndex: number, updates: Partial<GeneratedResource>) => {
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

  const updateQuizQuestion = (milestoneIndex: number, qIndex: number, updates: Partial<GeneratedQuizQuestion>) => {
    const newMilestones = [...editedPath.milestones];
    const questions = [...(newMilestones[milestoneIndex].quiz_questions || [])];
    questions[qIndex] = { ...questions[qIndex], ...updates };
    newMilestones[milestoneIndex] = { ...newMilestones[milestoneIndex], quiz_questions: questions };
    setEditedPath({ ...editedPath, milestones: newMilestones });
  };

  const addQuizQuestion = (milestoneIndex: number) => {
    const newMilestones = [...editedPath.milestones];
    const newQ: GeneratedQuizQuestion = {
      question_text: "New question?",
      question_text_ar: "سؤال جديد؟",
      question_type: "multiple_choice",
      options: ["Option A", "Option B", "Option C", "Option D"],
      options_ar: ["الخيار أ", "الخيار ب", "الخيار ج", "الخيار د"],
      correct_answer_index: 0,
      explanation: "",
      explanation_ar: "",
      difficulty_level: "intermediate",
      points: 10,
    };
    const questions = [...(newMilestones[milestoneIndex].quiz_questions || []), newQ];
    newMilestones[milestoneIndex] = { ...newMilestones[milestoneIndex], quiz_questions: questions };
    setEditedPath({ ...editedPath, milestones: newMilestones });
  };

  const removeQuizQuestion = (milestoneIndex: number, qIndex: number) => {
    const newMilestones = [...editedPath.milestones];
    const questions = [...(newMilestones[milestoneIndex].quiz_questions || [])];
    questions.splice(qIndex, 1);
    newMilestones[milestoneIndex] = { ...newMilestones[milestoneIndex], quiz_questions: questions };
    setEditedPath({ ...editedPath, milestones: newMilestones });
  };

  const handleRegenerateMilestone = async (milestoneIndex: number) => {
    const milestone = editedPath.milestones[milestoneIndex];
    setRegeneratingMilestone(milestone.milestone_number);
    try {
      const res = await fetch("/api/admin/ai-regenerate-milestone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestone_number: milestone.milestone_number,
          path_title: editedPath.path.title,
          path_difficulty: editedPath.path.difficulty_level,
          current_title: milestone.title,
          feedback: "",
        }),
      });
      if (!res.ok) throw new Error("Regeneration failed");
      const data = await res.json();
      updateMilestone(milestoneIndex, data.milestone);
    } catch {
      alert("Failed to regenerate milestone. Please edit manually.");
    } finally {
      setRegeneratingMilestone(null);
    }
  };

  const handleSave = async () => {
    await onSave(editedPath);
  };

  return (
    <div className="space-y-6">
      {/* Path Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Path Details</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title (English)</label>
              <input
                type="text"
                value={editedPath.path.title}
                onChange={(e) => setEditedPath({ ...editedPath, path: { ...editedPath.path, title: e.target.value } })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title (Arabic)</label>
              <input
                type="text"
                value={editedPath.path.title_ar}
                onChange={(e) => setEditedPath({ ...editedPath, path: { ...editedPath.path, title_ar: e.target.value } })}
                dir="rtl"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description (English)</label>
              <textarea
                value={editedPath.path.description}
                onChange={(e) => setEditedPath({ ...editedPath, path: { ...editedPath.path, description: e.target.value } })}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description (Arabic)</label>
              <textarea
                value={editedPath.path.description_ar}
                onChange={(e) => setEditedPath({ ...editedPath, path: { ...editedPath.path, description_ar: e.target.value } })}
                rows={3}
                dir="rtl"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-900">Milestones</h3>
        {editedPath.milestones.map((milestone, milestoneIndex) => (
          <div key={milestone.milestone_number} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            {/* Milestone Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => toggleMilestone(milestone.milestone_number)}
                className="flex items-center gap-2 text-lg font-semibold text-slate-900 hover:text-[#429874] transition-colors"
              >
                <span className="w-7 h-7 rounded-full bg-[#429874] text-white text-sm flex items-center justify-center flex-shrink-0">
                  {milestone.milestone_number}
                </span>
                {milestone.title}
                <span className="text-slate-400 text-sm">{expandedMilestones.has(milestone.milestone_number) ? "▼" : "▶"}</span>
              </button>
              <button
                onClick={() => handleRegenerateMilestone(milestoneIndex)}
                disabled={regeneratingMilestone === milestone.milestone_number}
                className="text-xs px-3 py-1.5 border border-[#429874] text-[#429874] rounded-lg hover:bg-[#f0f9f6] transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {regeneratingMilestone === milestone.milestone_number ? (
                  <><span className="animate-spin">↻</span> Regenerating...</>
                ) : (
                  <>↻ Regenerate</>
                )}
              </button>
            </div>

            {expandedMilestones.has(milestone.milestone_number) && (
              <div className="space-y-5">
                {/* Titles & Description */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Title (EN)</label>
                    <input
                      type="text"
                      value={milestone.title}
                      onChange={(e) => updateMilestone(milestoneIndex, { title: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Title (AR)</label>
                    <input
                      type="text"
                      value={milestone.title_ar}
                      onChange={(e) => updateMilestone(milestoneIndex, { title_ar: e.target.value })}
                      dir="rtl"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                  <textarea
                    value={milestone.description}
                    onChange={(e) => updateMilestone(milestoneIndex, { description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                {/* Resources */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Resources ({milestone.resources.length})
                    </label>
                    <button
                      onClick={() => addResource(milestoneIndex)}
                      className="text-xs px-3 py-1 bg-[#429874] text-white rounded-lg hover:bg-[#357a5d]"
                    >
                      + Add Resource
                    </button>
                  </div>
                  <div className="space-y-3">
                    {milestone.resources.map((resource, resourceIndex) => (
                      <div key={resourceIndex} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                            <input
                              type="text"
                              value={resource.title}
                              onChange={(e) => updateResource(milestoneIndex, resourceIndex, { title: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                            <select
                              value={resource.resource_type}
                              onChange={(e) => updateResource(milestoneIndex, resourceIndex, { resource_type: e.target.value as any })}
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
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-slate-600 mb-1">URL</label>
                            <input
                              type="url"
                              value={resource.url}
                              onChange={(e) => updateResource(milestoneIndex, resourceIndex, { url: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Platform</label>
                            <input
                              type="text"
                              value={resource.platform}
                              onChange={(e) => updateResource(milestoneIndex, resourceIndex, { platform: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                            />
                          </div>
                          <div className="flex items-end gap-3">
                            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={resource.is_free}
                                onChange={(e) => updateResource(milestoneIndex, resourceIndex, { is_free: e.target.checked })}
                                className="rounded"
                              />
                              Free
                            </label>
                            {!resource.is_free && (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={resource.price_egp || 0}
                                  onChange={(e) => updateResource(milestoneIndex, resourceIndex, { price_egp: parseFloat(e.target.value) || 0 })}
                                  className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
                                />
                                <span className="text-xs text-slate-500">EGP</span>
                              </div>
                            )}
                            <input
                              type="number"
                              value={resource.estimated_duration_minutes}
                              onChange={(e) => updateResource(milestoneIndex, resourceIndex, { estimated_duration_minutes: parseInt(e.target.value) || 0 })}
                              className="w-16 px-2 py-1 border border-slate-300 rounded text-sm"
                            />
                            <span className="text-xs text-slate-500">min</span>
                          </div>
                        </div>
                        <div className="flex justify-end">
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

                {/* Quiz Questions */}
                <div>
                  <button
                    onClick={() => toggleQuiz(milestone.milestone_number)}
                    className="flex items-center gap-2 w-full text-left mb-2"
                  >
                    <span className="text-sm font-semibold text-slate-700">
                      Quiz Questions ({(milestone.quiz_questions || []).length})
                    </span>
                    {(milestone.quiz_questions || []).length === 0 && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        No questions — add manually or regenerate
                      </span>
                    )}
                    <span className="text-slate-400 text-xs ml-auto">
                      {expandedQuizzes.has(milestone.milestone_number) ? "▼ hide" : "▶ show"}
                    </span>
                  </button>

                  {expandedQuizzes.has(milestone.milestone_number) && (
                    <div className="space-y-3">
                      {(milestone.quiz_questions || []).map((q, qIndex) => (
                        <div key={qIndex} className="border border-blue-100 rounded-lg p-4 bg-blue-50">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-blue-700">Question {qIndex + 1}</span>
                            <button
                              onClick={() => removeQuizQuestion(milestoneIndex, qIndex)}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Question (EN)</label>
                                <textarea
                                  value={q.question_text}
                                  onChange={(e) => updateQuizQuestion(milestoneIndex, qIndex, { question_text: e.target.value })}
                                  rows={2}
                                  className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Question (AR)</label>
                                <textarea
                                  value={q.question_text_ar}
                                  onChange={(e) => updateQuizQuestion(milestoneIndex, qIndex, { question_text_ar: e.target.value })}
                                  rows={2}
                                  dir="rtl"
                                  className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Options (mark correct with ★)</label>
                              <div className="grid grid-cols-2 gap-2">
                                {q.options.map((opt, optIdx) => (
                                  <div key={optIdx} className="flex items-center gap-2">
                                    <button
                                      onClick={() => updateQuizQuestion(milestoneIndex, qIndex, { correct_answer_index: optIdx })}
                                      className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold transition-colors ${
                                        q.correct_answer_index === optIdx
                                          ? "bg-green-500 text-white"
                                          : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                                      }`}
                                      title="Set as correct answer"
                                    >
                                      {q.correct_answer_index === optIdx ? "★" : String.fromCharCode(65 + optIdx)}
                                    </button>
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => {
                                        const newOpts = [...q.options];
                                        newOpts[optIdx] = e.target.value;
                                        updateQuizQuestion(milestoneIndex, qIndex, { options: newOpts });
                                      }}
                                      className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs"
                                      placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                    />
                                    <input
                                      type="text"
                                      value={q.options_ar[optIdx] || ""}
                                      onChange={(e) => {
                                        const newOpts = [...q.options_ar];
                                        newOpts[optIdx] = e.target.value;
                                        updateQuizQuestion(milestoneIndex, qIndex, { options_ar: newOpts });
                                      }}
                                      dir="rtl"
                                      className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs"
                                      placeholder="الخيار"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Explanation (EN)</label>
                                <textarea
                                  value={q.explanation}
                                  onChange={(e) => updateQuizQuestion(milestoneIndex, qIndex, { explanation: e.target.value })}
                                  rows={2}
                                  className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Explanation (AR)</label>
                                <textarea
                                  value={q.explanation_ar}
                                  onChange={(e) => updateQuizQuestion(milestoneIndex, qIndex, { explanation_ar: e.target.value })}
                                  rows={2}
                                  dir="rtl"
                                  className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Difficulty</label>
                                <select
                                  value={q.difficulty_level}
                                  onChange={(e) => updateQuizQuestion(milestoneIndex, qIndex, { difficulty_level: e.target.value as any })}
                                  className="px-2 py-1 border border-slate-300 rounded text-xs"
                                >
                                  <option value="beginner">Beginner</option>
                                  <option value="intermediate">Intermediate</option>
                                  <option value="advanced">Advanced</option>
                                  <option value="expert">Expert</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Points</label>
                                <input
                                  type="number"
                                  value={q.points}
                                  onChange={(e) => updateQuizQuestion(milestoneIndex, qIndex, { points: parseInt(e.target.value) || 10 })}
                                  className="w-16 px-2 py-1 border border-slate-300 rounded text-xs"
                                  min={1}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => addQuizQuestion(milestoneIndex)}
                        className="w-full py-2 border-2 border-dashed border-blue-200 text-blue-600 text-sm rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        + Add Question
                      </button>
                    </div>
                  )}
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
          {isSaving ? "Saving..." : saveLabel}
        </button>
      </div>
    </div>
  );
}
