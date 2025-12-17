"use client";

import Link from "next/link";
import { AdminCrudTable } from "@/components/admin/AdminCrudTable";
import { useEffect, useState } from "react";

export default function MilestoneResourcesPage() {
  const [milestoneOptions, setMilestoneOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [resourceOptions, setResourceOptions] = useState<
    { value: string; label: string }[]
  >([]);

  useEffect(() => {
    const fetchMilestones = async () => {
      try {
        const res = await fetch("/api/admin/data?table=path_milestones");
        const json = await res.json();
        if (res.ok && json.data) {
          const options = json.data.map((milestone: any) => ({
            value: milestone.id,
            label: `${milestone.title || milestone.milestone_number || "Milestone"} (${milestone.milestone_number || "N/A"})`,
          }));
          setMilestoneOptions(options);
        }
      } catch (err) {
        console.error("Error fetching milestones:", err);
      }
    };

    const fetchResources = async () => {
      try {
        const res = await fetch("/api/admin/data?table=learning_resources");
        const json = await res.json();
        if (res.ok && json.data) {
          const options = json.data.map((resource: any) => ({
            value: resource.id,
            label: resource.title || resource.url || resource.id,
          }));
          setResourceOptions(options);
        }
      } catch (err) {
        console.error("Error fetching resources:", err);
      }
    };

    fetchMilestones();
    fetchResources();
  }, []);

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
        table="milestone_resources"
        title="Milestone Resources"
        description="Link learning resources (Udacity, YouTube, articles, etc.) to specific path milestones."
        orderBy="created_at"
        defaultValues={{
          milestone_id: "",
          resource_id: "",
          resource_order: 0,
          is_primary: false,
          is_required: true,
        }}
        columns={[
          { key: "id", label: "ID", hidden: true, readOnly: true },
          {
            key: "milestone_id",
            label: "Milestone",
            type: "select",
            options: milestoneOptions,
          },
          {
            key: "resource_id",
            label: "Resource",
            type: "select",
            options: resourceOptions,
          },
          { key: "resource_order", label: "Order", type: "number" },
          { key: "is_primary", label: "Primary", type: "checkbox" },
          { key: "is_required", label: "Required", type: "checkbox" },
        ]}
      />
    </div>
  );
}


