"use client";

import { useState } from "react";

export default function IssuesTable({ issues }: { issues: any[] }) {
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const filteredIssues = issues.filter((i) => {
    if (severityFilter !== "ALL" && i.severity !== severityFilter) return false;
    if (categoryFilter !== "ALL" && i.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !i.title.toLowerCase().includes(q) &&
        !(i.description || "").toLowerCase().includes(q) &&
        !(i.page?.url || "").toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const grouped: Record<string, typeof issues> = {};
  filteredIssues.forEach((issue) => {
    const cat = issue.category || "Uncategorized";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(issue);
  });

  const severityRank: Record<string, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  return (
    <div className="bg-black/5 dark:bg-white/5 rounded-xl border border-black/20 dark:border-white/20">
      <div className="p-5 border-b border-black/[0.06] dark:border-white/[0.06] flex justify-between items-center">
        <h2 className="text-xl font-semibold text-foreground dark:text-white">Detected Issues</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search issues or URLs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white dark:bg-[#1E1E1E] border border-black/20 dark:border-white/20 text-black-80 dark:text-white/80 text-sm rounded-lg focus:ring-indigo-500 focus:border-[#E80C08] block p-2 w-full sm:w-64"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white dark:bg-[#1E1E1E] border border-black/20 dark:border-white/20 text-black-80 dark:text-white/80 text-sm rounded-lg focus:ring-indigo-500 focus:border-[#E80C08] block p-2"
          >
            <option value="ALL">All Categories</option>
            {Array.from(
              new Set(issues.map((i) => i.category || "Uncategorized")),
            ).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-white dark:bg-[#1E1E1E] border border-black/20 dark:border-white/20 text-black-80 dark:text-white/80 text-sm rounded-lg focus:ring-indigo-500 focus:border-[#E80C08] block p-2"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Only</option>
            <option value="MEDIUM">Medium Only</option>
            <option value="LOW">Low Only</option>
          </select>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center p-8 text-black-40 dark:text-white/40">
            No issues found matching the filter.
          </div>
        ) : (
          Object.entries(grouped)
            .sort((a, b) => b[1].length - a[1].length)
            .map(([cat, catIssues]) => {
              const isExpanded = expandedCategories.includes(cat);

              // Count severities for badge
              const critical = catIssues.filter(
                (i) => i.severity === "CRITICAL",
              ).length;
              const high = catIssues.filter(
                (i) => i.severity === "HIGH",
              ).length;
              const medium = catIssues.filter(
                (i) => i.severity === "MEDIUM",
              ).length;
              const low = catIssues.filter((i) => i.severity === "LOW").length;

              return (
                <div
                  key={cat}
                  className="bg-black/5 dark:bg-white/5 rounded-xl border border-black/20 dark:border-white/20 overflow-hidden transition-all duration-200 shadow-sm"
                >
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="w-full flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-semibold text-foreground dark:text-white">
                        {cat}
                      </span>
                      <div className="flex gap-1">
                        {critical > 0 && (
                          <span
                            className="bg-rose-500/20 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded"
                            title="Critical Issues"
                          >
                            {critical} C
                          </span>
                        )}
                        {high > 0 && (
                          <span
                            className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded"
                            title="High Issues"
                          >
                            {high} H
                          </span>
                        )}
                        {medium > 0 && (
                          <span
                            className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded"
                            title="Medium Issues"
                          >
                            {medium} M
                          </span>
                        )}
                        {low > 0 && (
                          <span
                            className="bg-slate-500/20 text-black-60 dark:text-white/60 text-[10px] font-bold px-2 py-0.5 rounded"
                            title="Low Issues"
                          >
                            {low} L
                          </span>
                        )}
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-black-60 dark:text-white/60 transform transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="overflow-x-auto border-t border-black/20 dark:border-white/20 bg-white dark:bg-[#1E1E1E]">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-black/5 dark:bg-white/5 text-black-60 dark:text-white/60">
                          <tr>
                            <th className="px-4 py-3">Severity</th>
                            <th className="px-4 py-3">Issue</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3">URL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/10 dark:divide-white/10">
                          {catIssues
                            .sort(
                              (a, b) =>
                                (severityRank[b.severity] || 0) -
                                (severityRank[a.severity] || 0),
                            )
                            .slice(0, 50)
                            .map((issue) => (
                              <tr
                                key={issue.id}
                                className="hover:bg-black/5 dark:bg-white/5 transition-colors"
                              >
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-1 rounded text-[10px] font-bold 
                                    ${
                                      issue.severity === "CRITICAL"
                                        ? "bg-rose-500/20 text-rose-400"
                                        : issue.severity === "HIGH"
                                          ? "bg-orange-500/20 text-orange-400"
                                          : issue.severity === "MEDIUM"
                                            ? "bg-amber-500/20 text-amber-400"
                                            : "bg-black/10 dark:bg-white/10 text-black-60 dark:text-white/60"
                                    }`}
                                  >
                                    {issue.severity}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-medium text-foreground dark:text-white">
                                  {issue.title}
                                </td>
                                <td className="px-4 py-3 text-black-60 dark:text-white/60">
                                  {issue.description}
                                </td>
                                <td className="px-4 py-3 text-black-40 dark:text-white/40 truncate max-w-xs">
                                  {issue.page ? (
                                    <a
                                      href={issue.page.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="hover:text-[#E80C08] transition-colors"
                                    >
                                      {issue.page.url.replace(
                                        /^https?:\/\/[^\/]+/,
                                        "",
                                      )}
                                    </a>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                      {catIssues.length > 50 && (
                        <div className="text-center p-3 text-xs text-black-40 dark:text-white/40 border-t border-black/10 dark:border-white/10">
                          Showing 50 of {catIssues.length} issues in {cat}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
