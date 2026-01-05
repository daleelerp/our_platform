"use client";

import { useState, useEffect } from "react";

interface LinkPreviewProps {
    url: string;
    onDataFetched?: (data: { title: string; description: string }) => void;
}

export function LinkPreview({ url, onDataFetched }: LinkPreviewProps) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<{ title: string; description: string; image?: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchPreview = async () => {
        if (!url || !url.startsWith("http")) return;

        setLoading(true);
        setError(null);
        setData(null);

        try {
            // Using a free API or custom route to fetch metadata
            // For now, let's assume we have a route /api/admin/link-preview
            const response = await fetch(`/api/admin/link-preview?url=${encodeURIComponent(url)}`);

            if (!response.ok) {
                throw new Error("Failed to fetch link preview");
            }

            const metadata = await response.json();
            setData(metadata);

            if (onDataFetched) {
                onDataFetched({
                    title: metadata.title || "",
                    description: metadata.description || "",
                });
            }
        } catch (err: any) {
            console.error("Link preview error:", err);
            setError("Could not fetch preview. Many sites like Medium block direct scraping. You can still add the URL manually.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (url && url.length > 10) {
                fetchPreview();
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [url]);

    if (!url) return null;

    return (
        <div className="mt-4 border border-slate-200 rounded-lg p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-slate-900">Link Content Preview</h4>
                {loading && <div className="animate-spin h-4 w-4 border-2 border-teal-500 border-t-transparent rounded-full"></div>}
            </div>

            {error ? (
                <p className="text-xs text-amber-600">{error}</p>
            ) : data ? (
                <div className="flex gap-4">
                    {data.image && (
                        <img src={data.image} alt="" className="w-24 h-24 object-cover rounded-lg flex-shrink-0" />
                    )}
                    <div>
                        <h5 className="text-sm font-medium text-slate-900 line-clamp-1">{data.title}</h5>
                        <p className="text-xs text-slate-500 line-clamp-3 mt-1">{data.description}</p>
                    </div>
                </div>
            ) : (
                <p className="text-xs text-slate-400 italic">Enter a URL to see content preview...</p>
            )}
        </div>
    );
}
