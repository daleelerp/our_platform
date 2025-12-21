"use client";

import { AdminCrudTable } from "@/components/admin/AdminCrudTable";
import Link from "next/link";
import { useEffect, useState } from "react";

type JobRole = {
  id: string;
  title: string;
  title_ar: string | null;
  role_category?: string | null;
};

type Country = {
  code: string;
  name: string;
  name_ar: string | null;
};

export default function SalaryRangesPage() {
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedJobRoleId, setSelectedJobRoleId] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedExperienceLevel, setSelectedExperienceLevel] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [jobRolesRes, countriesRes] = await Promise.all([
        fetch("/api/admin/data?table=job_roles"),
        fetch("/api/admin/data?table=countries"),
      ]);
      
      const [jobRolesJson, countriesJson] = await Promise.all([
        jobRolesRes.json(),
        countriesRes.json(),
      ]);

      if (jobRolesRes.ok && jobRolesJson.data) {
        setJobRoles(jobRolesJson.data);
      }
      
      if (countriesRes.ok && countriesJson.data) {
        // Filter active countries and sort by display_order
        const activeCountries = (countriesJson.data || [])
          .filter((c: any) => c.is_active)
          .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
        setCountries(activeCountries);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Category options (LOV)
  const categoryOptions = [
    { value: "functional", label: "Functional" },
    { value: "technical", label: "Technical" },
    { value: "management", label: "Management" },
    { value: "consulting", label: "Consulting" },
  ];

  // Filter job roles by selected category
  const filteredJobRoles = selectedCategory
    ? jobRoles.filter((role) => role.role_category === selectedCategory)
    : jobRoles;

  const jobRoleOptions = filteredJobRoles.map((role) => ({
    value: role.id,
    label: `${role.title}${role.title_ar ? ` / ${role.title_ar}` : ""}`,
  }));

  // Map country codes to region values used in salary_ranges table
  const countryCodeToRegion: Record<string, string> = {
    'EG': 'egypt',
    'SA': 'saudi_arabia',
    'AE': 'uae',
    'KW': 'kuwait',
    'QA': 'qatar',
    'BH': 'bahrain',
    'OM': 'oman',
    'JO': 'jordan',
    'LB': 'lebanon',
    'MA': 'morocco',
    'TN': 'tunisia',
    'DZ': 'algeria',
    'IQ': 'iraq',
    'LY': 'libya',
    'SD': 'sudan',
    'YE': 'yemen',
    'SY': 'syria',
    'PS': 'palestine',
  };

  // Create region options from countries database
  const regionOptions = countries
    .filter((country) => countryCodeToRegion[country.code])
    .map((country) => ({
      value: countryCodeToRegion[country.code],
      label: country.name_ar ? `${country.name} / ${country.name_ar}` : country.name,
    }));

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

      {/* Category Filter - Step 1 */}
      <div className="mb-6 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Step 1: Select Category (Required for Job Role selection)
            </label>
            <p className="text-xs text-slate-500">
              Select a category to filter available job roles. This helps structure data entry and web scraping.
            </p>
          </div>
          <Link
            href="/admin/job-roles"
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
          >
            + Add Job Role
          </Link>
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setSelectedJobRoleId("");
          }}
          className="w-full max-w-md px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        >
          <option value="">-- Select Category First --</option>
          {categoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <AdminCrudTable
        table="salary_ranges"
        title="Salary Ranges"
        description="Manage salary ranges by category → job role → region → experience level → salary data. Each field depends on the previous one for structured data entry and web scraping."
        orderBy="region, experience_level"
        defaultValues={{
          job_role_id: "",
          region: "",
          experience_level: "",
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
            label: selectedCategory ? "Step 2: Job Role" : "Step 2: Job Role (Select Category first)",
            type: "select",
            options: jobRoleOptions,
          },
          {
            key: "region",
            label: "Step 3: Region",
            type: "select",
            options: regionOptions,
            dependsOn: "job_role_id",
          },
          {
            key: "experience_level",
            label: "Step 4: Experience Level",
            type: "select",
            options: experienceLevelOptions,
            dependsOn: "region",
          },
          {
            key: "salary_min",
            label: "Step 5: Min Salary",
            type: "number",
            dependsOn: "experience_level",
            scraper: {
              enabled: true,
              type: "salary",
              searchField: "job_role_id",
            },
          },
          {
            key: "salary_max",
            label: "Max Salary",
            type: "number",
            dependsOn: "experience_level",
            scraper: {
              enabled: true,
              type: "salary",
              searchField: "job_role_id",
            },
          },
          {
            key: "salary_currency",
            label: "Currency",
            type: "select",
            options: currencyOptions,
            dependsOn: "experience_level",
          },
          {
            key: "salary_period",
            label: "Period",
            type: "select",
            options: periodOptions,
            dependsOn: "experience_level",
          },
          {
            key: "market_demand_score",
            label: "Market Demand Score (0-100, integer only)",
            type: "number",
            dependsOn: "experience_level",
            scraper: {
              enabled: true,
              type: "demand_score",
              searchField: "job_role_id",
            },
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
            dependsOn: "experience_level",
            scraper: {
              enabled: true,
              type: "demand_level",
              searchField: "job_role_id",
            },
          },
          {
            key: "remote_work_percentage",
            label: "Remote Work % (0-100, decimal allowed)",
            type: "number",
            dependsOn: "experience_level",
          },
          { key: "is_active", label: "Active", type: "checkbox" },
        ]}
        dynamicColumnOptions={{
          job_role_id: jobRoleOptions,
        }}
        onFormDataChange={(key, value) => {
          // Handle hierarchical dependencies - reset dependent fields when parent changes
          if (key === "job_role_id") {
            setSelectedJobRoleId(value);
            // Reset dependent fields
            setSelectedRegion("");
            setSelectedExperienceLevel("");
          } else if (key === "region") {
            setSelectedRegion(value);
            setSelectedExperienceLevel("");
          } else if (key === "experience_level") {
            setSelectedExperienceLevel(value);
          }
        }}
      />
    </div>
  );
}

