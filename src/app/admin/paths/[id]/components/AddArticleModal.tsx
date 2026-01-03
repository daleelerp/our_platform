"use client";

interface AddArticleModalProps {
    milestoneId: string;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (milestoneId: string) => Promise<void>;
    articleData: {
        title: string;
        title_ar: string;
        url: string;
        content: string;
        content_ar: string;
        language: "en" | "ar" | "both";
        is_free: boolean;
    };
    setArticleData: (data: any) => void;
}

export default function AddArticleModal({
    milestoneId,
    isOpen,
    onClose,
    onSubmit,
    articleData,
    setArticleData,
}: AddArticleModalProps) {
    if (!isOpen) return null;
    if (!articleData) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">Add Article Manually</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                <div className="p-6">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Article title (English) *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={articleData.title}
                                    onChange={(e) =>
                                        setArticleData((prev: any) => ({
                                            ...prev,
                                            [milestoneId]: { ...prev[milestoneId], title: e.target.value },
                                        }))
                                    }
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    placeholder="Article title (English)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Article title (Arabic)
                                </label>
                                <input
                                    type="text"
                                    value={articleData.title_ar}
                                    onChange={(e) =>
                                        setArticleData((prev: any) => ({
                                            ...prev,
                                            [milestoneId]: { ...prev[milestoneId], title_ar: e.target.value },
                                        }))
                                    }
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    placeholder="Article title (Arabic)"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Article URL (optional)
                            </label>
                            <input
                                type="url"
                                value={articleData.url}
                                onChange={(e) =>
                                    setArticleData((prev: any) => ({
                                        ...prev,
                                        [milestoneId]: { ...prev[milestoneId], url: e.target.value },
                                    }))
                                }
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                placeholder="https://... (optional)"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                يمكنك إدخال رابط المقالة أو محتوى المقالة أو الاثنين معاً
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Article Content (English, optional)
                                </label>
                                <textarea
                                    value={articleData.content}
                                    onChange={(e) =>
                                        setArticleData((prev: any) => ({
                                            ...prev,
                                            [milestoneId]: { ...prev[milestoneId], content: e.target.value },
                                        }))
                                    }
                                    rows={4}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    placeholder="Enter article content here..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Article Content (Arabic, optional)
                                </label>
                                <textarea
                                    value={articleData.content_ar}
                                    onChange={(e) =>
                                        setArticleData((prev: any) => ({
                                            ...prev,
                                            [milestoneId]: { ...prev[milestoneId], content_ar: e.target.value },
                                        }))
                                    }
                                    rows={4}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    placeholder="أدخل محتوى المقالة هنا..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 items-center">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Language
                                </label>
                                <select
                                    value={articleData.language}
                                    onChange={(e) =>
                                        setArticleData((prev: any) => ({
                                            ...prev,
                                            [milestoneId]: { ...prev[milestoneId], language: e.target.value },
                                        }))
                                    }
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                >
                                    <option value="en">English</option>
                                    <option value="ar">Arabic</option>
                                    <option value="both">Both</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 pt-6">
                                <input
                                    type="checkbox"
                                    id={`article_free_${milestoneId}`}
                                    checked={articleData.is_free}
                                    onChange={(e) =>
                                        setArticleData((prev: any) => ({
                                            ...prev,
                                            [milestoneId]: { ...prev[milestoneId], is_free: e.target.checked },
                                        }))
                                    }
                                    className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                                />
                                <label htmlFor={`article_free_${milestoneId}`} className="text-sm text-slate-700">
                                    Free
                                </label>
                            </div>
                        </div>

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
                                onClick={() => onSubmit(milestoneId)}
                                className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 font-medium"
                            >
                                Add Article
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
