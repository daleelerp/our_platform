"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

type WaitlistEntry = {
  id: string;
  email: string;
  full_name: string | null;
  interested_erp: string | null;
  interest_track: string | null;
  custom_interest: string | null;
  referral_source: string | null;
  status: string;
  created_at: string;
};

type ContactFormData = {
  title: string;
  message: string;
};

type Props = {
  initialData: WaitlistEntry[];
};

export function WaitlistTable({ initialData }: Props) {
  const [entries, setEntries] = useState<WaitlistEntry[]>(initialData);
  const [filter, setFilter] = useState<"all" | "pending" | "invited" | "contact">("all");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const filteredEntries = entries.filter((entry) => {
    if (filter === "all") return true;
    if (filter === "contact") return entry.referral_source?.includes("contact_form");
    return entry.status === filter;
  });

  const parseContactFormData = (referralSource: string | null): ContactFormData | null => {
    if (!referralSource?.includes("contact_form:")) return null;
    
    const parts = referralSource.split(" | ");
    const titlePart = parts[0]?.replace("contact_form:", "").trim() || "";
    const messagePart = parts[1] || "";
    
    return {
      title: titlePart,
      message: messagePart,
    };
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setIsUpdating(id);
    const supabase = createClient();

    const { error } = await supabase
      .from("waitlist")
      .update({ status: newStatus })
      .eq("id", id);

    if (!error) {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === id ? { ...entry, status: newStatus } : entry
        )
      );
    }
    setIsUpdating(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Filters */}
      <div className="p-4 border-b border-slate-200 flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === "all"
              ? "bg-[#429874] text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          All ({entries.length})
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === "pending"
              ? "bg-[#429874] text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Pending ({entries.filter((e) => e.status === "pending").length})
        </button>
        <button
          onClick={() => setFilter("contact")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === "contact"
              ? "bg-[#429874] text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Contact Form ({entries.filter((e) => e.referral_source?.includes("contact_form")).length})
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                Source
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                Interest
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No entries found
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => {
                const isContactForm = entry.referral_source?.includes("contact_form");
                const contactData = parseContactFormData(entry.referral_source);
                const isExpanded = expandedRow === entry.id;

                return (
                  <>
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-900">{entry.email}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {entry.full_name || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <div className="space-y-1">
                          {isContactForm ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs">
                              📧 Contact
                            </span>
                          ) : (
                            entry.interested_erp ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-50 text-purple-700 text-xs">
                                🎯 {entry.interested_erp}
                              </span>
                            ) : (
                              entry.referral_source || "-"
                            )
                          )}
                          {entry.interested_erp && isContactForm && (
                            <div className="text-xs text-slate-500">
                              ERP: {entry.interested_erp}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {entry.interest_track ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-xs capitalize">
                              {entry.interest_track}
                            </span>
                            {entry.interested_erp === "other" && entry.custom_interest && (
                              <div className="text-xs text-slate-500">
                                {entry.custom_interest}
                              </div>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            entry.status === "pending"
                              ? "bg-amber-100 text-amber-700"
                              : entry.status === "invited"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={entry.status}
                            onChange={(e) => updateStatus(entry.id, e.target.value)}
                            disabled={isUpdating === entry.id}
                            className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                          >
                            <option value="pending">Pending</option>
                            <option value="invited">Invited</option>
                            <option value="converted">Converted</option>
                          </select>
                          {isContactForm && (
                            <button
                              onClick={() => setExpandedRow(isExpanded ? null : entry.id)}
                              className="text-xs px-2 py-1 text-[#429874] hover:bg-[#f0f9f6] rounded"
                              title="View message"
                            >
                              {isExpanded ? "▲" : "▼"}
                            </button>
                          )}
                          <a
                            href={`mailto:${entry.email}?subject=Re: ${contactData?.title || "Your inquiry"}`}
                            className="text-xs px-2 py-1 bg-[#429874] text-white rounded hover:bg-[#357a5d] transition"
                            title="Reply via email"
                          >
                            📧
                          </a>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && contactData && (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 bg-slate-50 border-b border-slate-200">
                          <div className="space-y-3">
                            <div>
                              <h4 className="text-sm font-semibold text-slate-900 mb-1">Request Title:</h4>
                              <p className="text-sm text-slate-700">{contactData.title || "No title"}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-slate-900 mb-1">Message:</h4>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">{contactData.message || "No message"}</p>
                            </div>
                            {entry.interested_erp && (
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-1">Interested ERP:</h4>
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-50 text-purple-700 text-xs">
                                  {entry.interested_erp}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

