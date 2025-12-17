"use client";

import Link from "next/link";

export default function AdminAnalyticsPage() {
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
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Analytics (Coming Soon)
        </h1>
        <p className="text-slate-500 mb-4">
          This page will show dashboards for subscriptions, path enrollments,
          and learning activity. For now, please use the Users and Subscriptions
          pages to inspect individual records.
        </p>
        <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1">
          <li>Subscription revenue and active plans</li>
          <li>Popular learning paths and completion rates</li>
          <li>Engagement over time (videos, quizzes, milestones)</li>
        </ul>
      </div>
    </div>
  );
}




