"use client";

import Link from "next/link";
import { AdminCrudTable } from "@/components/admin/AdminCrudTable";
import { useEffect, useState } from "react";

export default function PathJobRolesPage() {
  const [pathOptions, setPathOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [jobRoleOptions, setJobRoleOptions] = useState<
    { value: string; label: string }[]
  >([]);

  useEffect(() => {
    const fetchPaths = async () => {
      try {
        const res = await fetch("/api/admin/data?table=learning_paths");
        const json = await res.json();
        if (res.ok && json.data) {
          const options = json.data.map((path: any) => ({
            value: path.id,
            label: path.title || path.slug || path.id,
          }));
          setPathOptions(options);
        }
      } catch (err) {
        console.error("Error fetching learning paths:", err);
      }
    };

    const fetchJobRoles = async () => {
      try {
        const res = await fetch("/api/admin/data?table=job_roles");
        const json = await res.json();
        if (res.ok && json.data) {
          const options = json.data.map((role: any) => ({
            value: role.id,
            label: role.title || role.id,
          }));
          setJobRoleOptions(options);
        }
      } catch (err) {
        console.error("Error fetching job roles:", err);
      }
    };

    fetchPaths();
    fetchJobRoles();
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
        table="path_job_roles"
        title="Path Job Roles"
        description="Link learning paths to the job roles they prepare learners for."
        orderBy="id"
        defaultValues={{
          learning_path_id: "",
          job_role_id: "",
          readiness_level: "",
          additional_requirements: "",
        }}
        columns={[
          { key: "id", label: "ID", hidden: true, readOnly: true },
          {
            key: "learning_path_id",
            label: "Learning Path",
            type: "select",
            options: pathOptions,
          },
          {
            key: "job_role_id",
            label: "Job Role",
            type: "select",
            options: jobRoleOptions,
          },
          { key: "readiness_level", label: "Readiness Level", type: "text" },
          { key: "additional_requirements", label: "Additional Requirements", type: "text" },
        ]}
      />
    </div>
  );
}


