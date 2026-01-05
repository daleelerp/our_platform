"use client";

import Link from "next/link";
import { AdminCrudTable } from "@/components/admin/AdminCrudTable";

export default function PlaylistsPage() {
  return (
    <div>
      <div className="mb-4">
        <Link
          href="/admin"
          className="text-teal-600 hover:text-teal-700 text-sm"
        >
          ← Back to Admin Home
        </Link>
      </div>
      <AdminCrudTable
        table="resource_playlists"
        title="Resource Playlists"
        description="Manage playlists of learning resources (courses, video series, etc.)."
        orderBy="created_at"
        defaultValues={{
          title: "",
          title_ar: "",
          description: "",
          description_ar: "",
          playlist_url: "",
          external_playlist_id: "",
          language: "en",
          difficulty_level: "",
          estimated_total_duration_minutes: null,
          resource_count: 0,
          is_free: true,
          price: null,
          price_currency: "EGP",
          is_verified: false,
          is_active: true,
        }}
        columns={[
          { key: "id", label: "ID", hidden: true, readOnly: true },
          { key: "title", label: "Title (EN)", type: "text" },
          { key: "title_ar", label: "Title (AR)", type: "text" },
          { key: "playlist_url", label: "Playlist URL", type: "text" },
          {
            key: "language",
            label: "Language Preference",
            type: "select",
            options: [
              { value: "en", label: "English - Shows for users with English preference" },
              { value: "ar", label: "Arabic (عربي) - Shows for users with Arabic preference" },
              { value: "both", label: "Both Languages - Shows for all users regardless of preference" },
            ],
          },
          {
            key: "difficulty_level",
            label: "Difficulty Level",
            type: "select",
            options: [
              { value: "beginner", label: "Beginner (مبتدئ)" },
              { value: "intermediate", label: "Intermediate (متوسط)" },
              { value: "advanced", label: "Advanced (متقدم)" },
              { value: "expert", label: "Expert (خبير)" },
            ],
          },
          {
            key: "estimated_total_duration_minutes",
            label: "Duration (min)",
            type: "number",
          },
          { key: "resource_count", label: "Resources", type: "number" },
          { key: "is_free", label: "Free", type: "checkbox" },
          { key: "is_active", label: "Active", type: "checkbox" },
        ]}
      />
    </div>
  );
}

