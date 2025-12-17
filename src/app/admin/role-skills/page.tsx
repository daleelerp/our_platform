"use client";

import Link from "next/link";
import { AdminCrudTable } from "@/components/admin/AdminCrudTable";
import { useEffect, useState } from "react";

export default function RoleSkillsPage() {
  const [jobRoleOptions, setJobRoleOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [skillOptions, setSkillOptions] = useState<
    { value: string; label: string }[]
  >([]);

  useEffect(() => {
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

    const fetchSkills = async () => {
      try {
        const res = await fetch("/api/admin/data?table=skills");
        const json = await res.json();
        if (res.ok && json.data) {
          const options = json.data.map((skill: any) => ({
            value: skill.id,
            label: skill.name || skill.id,
          }));
          setSkillOptions(options);
        }
      } catch (err) {
        console.error("Error fetching skills:", err);
      }
    };

    fetchJobRoles();
    fetchSkills();
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
        table="role_skills"
        title="Role Skills"
        description="Map skills to job roles and define importance levels."
        orderBy="id"
        defaultValues={{
          job_role_id: "",
          skill_id: "",
          importance_level: "",
          proficiency_required: "",
        }}
        columns={[
          { key: "id", label: "ID", hidden: true, readOnly: true },
          {
            key: "job_role_id",
            label: "Job Role",
            type: "select",
            options: jobRoleOptions,
          },
          {
            key: "skill_id",
            label: "Skill",
            type: "select",
            options: skillOptions,
          },
          { key: "importance_level", label: "Importance", type: "text" },
          { key: "proficiency_required", label: "Proficiency", type: "text" },
        ]}
      />
    </div>
  );
}


