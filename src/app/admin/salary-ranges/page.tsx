"use client";

import { AdminCrudTable } from "@/components/admin/AdminCrudTable";
import Link from "next/link";
import { useEffect, useState } from "react";

type JobRole = {
  id: string;
  title: string;
  title_ar: string | null;
};

export default function SalaryRangesPage() {
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobRoles();
  }, []);

  const loadJobRoles = async () => {
    try {
      const res = await fetch("/api/admin/data?table=job_roles");
      const json = await res.json();
      if (res.ok && json.data) {
        setJobRoles(json.data);
      }
    } catch (err) {
      console.error("Failed to load job roles:", err);
    } finally {
      setLoading(false);
    }
  };

  const jobRoleOptions = jobRoles.map((role) => ({
    value: role.id,
    label: `${role.title}${role.title_ar ? ` / ${role.title_ar}` : ""}`,
  }));

  const regionOptions = [
    { value: "egypt", label: "Egypt" },
    { value: "gulf", label: "Gulf Countries" },
    { value: "saudi_arabia", label: "Saudi Arabia" },
    { value: "uae", label: "UAE" },
    { value: "kuwait", label: "Kuwait" },
    { value: "qatar", label: "Qatar" },
    { value: "bahrain", label: "Bahrain" },
    { value: "oman", label: "Oman" },
  ];

  const experienceLevelOptions = [
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "senior", label: "Senior" },
    { value: "expert", label: "Expert" },
  ];

  const currencyOptions = [
    { value: "EGP", label: "EGP (Egyptian Pound)" },
    { value: "SAR", label: "SAR (Saudi Riyal)" },
    { value: "AED", label: "AED (UAE Dirham)" },
    { value: "USD", label: "USD (US Dollar)" },
    { value: "KWD", label: "KWD (Kuwaiti Dinar)" },
    { value: "QAR", label: "QAR (Qatari Riyal)" },
    { value: "BHD", label: "BHD (Bahraini Dinar)" },
    { value: "OMR", label: "OMR (Omani Rial)" },
  ];

  const periodOptions = [
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ];

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
        table="salary_ranges"
        title="Salary Ranges"
        description="Manage salary ranges by job role, region, and experience level. Use the scraper icon to auto-fill salary data."
        orderBy="region, experience_level"
        defaultValues={{
          job_role_id: "",
          region: "egypt",
          experience_level: "intermediate",
          salary_min: 0,
          salary_max: 0,
          salary_currency: "EGP",
          salary_period: "monthly",
          market_demand_score: 50,
          growth_trend: "stable",
          remote_work_percentage: null,
          is_active: true,
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
            key: "region",
            label: "Region",
            type: "select",
            options: regionOptions,
          },
          {
            key: "experience_level",
            label: "Experience Level",
            type: "select",
            options: experienceLevelOptions,
          },
          {
            key: "salary_min",
            label: "Min Salary",
            type: "number",
            scraper: {
              enabled: true,
              type: "salary",
              searchField: "job_role_id", // Will use job role title for search
            },
          },
          {
            key: "salary_max",
            label: "Max Salary",
            type: "number",
          },
          {
            key: "salary_currency",
            label: "Currency",
            type: "select",
            options: currencyOptions,
          },
          {
            key: "salary_period",
            label: "Period",
            type: "select",
            options: periodOptions,
          },
          {
            key: "market_demand_score",
            label: "Market Demand Score",
            type: "number",
          },
          {
            key: "growth_trend",
            label: "Growth Trend",
            type: "select",
            options: [
              { value: "rising", label: "Rising" },
              { value: "stable", label: "Stable" },
              { value: "declining", label: "Declining" },
            ],
          },
          {
            key: "remote_work_percentage",
            label: "Remote Work %",
            type: "number",
          },
          { key: "is_active", label: "Active", type: "checkbox" },
        ]}
        dynamicColumnOptions={{
          job_role_id: jobRoleOptions,
        }}
        onFormDataChange={(formData) => {
          // When job_role_id changes, we can update the search query for scraper
          // The scraper will use the job role title for searching
        }}
      />
    </div>
  );
}

