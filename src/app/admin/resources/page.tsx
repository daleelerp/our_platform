"use client";

import Link from "next/link";
import { AdminCrudTable } from "@/components/admin/AdminCrudTable";

export default function ResourcesPage() {
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
        table="learning_resources"
        title="Learning Resources"
        description="Manage curated learning resources (videos, courses, articles, etc.)."
        orderBy="created_at"
        defaultValues={{
          title: "",
          title_ar: "",
          description: "",
          description_ar: "",
          url: "",
          resource_type: "video",
          language: "en",
          difficulty_level: "",
          estimated_duration_minutes: null,
          is_free: true,
          price: null,
          price_currency: "EGP",
          is_verified: false,
          is_active: true,
        }}
        columns={[
          { key: "id", label: "ID", hidden: true, readOnly: true },
          { key: "title", label: "Title (EN)", type: "text" },
          { key: "title_ar", label: "Title (AR)", type: "text", hideInTable: true, },
          {
            key: "description",
            label: "Content/Description (EN)",
            type: "textarea",
            hideInTable: true, // Hide from table but show in edit form
          },
          {
            key: "description_ar",
            label: "Content/Description (AR)",
            type: "textarea",
            hideInTable: true, // Hide from table but show in edit form
          },
          {
            key: "resource_type",
            label: "Type",
            type: "select",
            options: [
              { value: "video", label: "Video" },
              { value: "article", label: "Article" },
              { value: "test", label: "Test" },
            ],
          },
          { key: "url", label: "URL (optional for articles)", type: "text", hideInTable: true, },
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
          // {
          //   key: "difficulty_level",
          //   label: "Difficulty Level",
          //   type: "select",
          //   options: [
          //     { value: "beginner", label: "Beginner (مبتدئ)" },
          //     { value: "intermediate", label: "Intermediate (متوسط)" },
          //     { value: "advanced", label: "Advanced (متقدم)" },
          //     { value: "expert", label: "Expert (خبير)" },
          //   ],
          //   hideInTable: true,
          // },
          // { key: "estimated_duration_minutes", label: "Minutes", type: "number", hideInTable: true, },
          // { key: "price", label: "Price", type: "number", hideInTable: true, },
          // { key: "price_currency", label: "Currency", type: "text", hideInTable: true, },
          // { key: "is_free", label: "Free", type: "checkbox", hideInTable: true, },
          { key: "is_active", label: "Active", type: "checkbox", hideInTable: true, },
        ]}
      />
    </div>
  );
}

