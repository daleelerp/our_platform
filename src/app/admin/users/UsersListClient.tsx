"use client";

import { useMemo, useState } from "react";
import { UserCardClient } from "./UserCardClient";

type Props = {
  users: any[];
};

export default function UsersListClient({ users }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all"
  );

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      if (statusFilter === "active" && !u.is_active) return false;
      if (statusFilter === "inactive" && u.is_active) return false;

      if (!q) return true;
      return (
        (u.full_name && String(u.full_name).toLowerCase().includes(q)) ||
        (u.email && String(u.email).toLowerCase().includes(q)) ||
        (u.country && String(u.country).toLowerCase().includes(q)) ||
        (u.id && String(u.id).toLowerCase().includes(q))
      );
    });
  }, [users, search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white rounded-xl shadow-sm p-4">
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, country or ID..."
            className="w-full md:max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <span className="text-slate-400 ml-2">
            Showing {filteredUsers.length} of {users.length}
          </span>
        </div>
      </div>

      {filteredUsers.length > 0 ? (
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <UserCardClient key={user.id} userId={user.id} userProfile={user} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-slate-500">No users match your filters.</p>
        </div>
      )}
    </div>
  );
}




