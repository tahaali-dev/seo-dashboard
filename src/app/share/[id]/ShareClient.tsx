"use client";

import React, { useState } from "react";
import SEOScoreWidget from "@/app/dashboard/[id]/SEOScoreWidget";
import IssuesTable from "@/app/dashboard/[id]/IssuesTable";
import Link from "next/link";

export default function ShareClient({
  project,
  pages,
  issues,
  oldScores,
  newScores,
}: {
  project: any;
  pages: any[];
  issues: any[];
  oldScores: any;
  newScores: any;
}) {
  const [activeTab, setActiveTab] = useState<"PAGES" | "ISSUES" | "DIFF">("PAGES");
  const [siteFilter, setSiteFilter] = useState<"OLD" | "NEW">(
    project.auditType === "FRESH" ? "NEW" : "OLD",
  );
  const [pageSearchQuery, setPageSearchQuery] = useState("");
  const [pageStatusFilter, setPageStatusFilter] = useState("ALL");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [analyticsSite, setAnalyticsSite] = useState<"OLD" | "NEW">("NEW");

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const oldPages = pages.filter((p) => p.siteType === "OLD");
  const newPages = pages.filter((p) => p.siteType === "NEW");

  return (
    <div className="space-y-8">
      {/* Top Section: Dashboard Cards & Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 flex flex-col gap-4">
          {project.auditType === "MIGRATION" && (
            <div className="bg-indigo-900/20 p-5 rounded-xl border border-indigo-500/20 flex-1 flex flex-col justify-center">
              <h3 className="text-indigo-400/80 font-medium mb-1 text-xs uppercase tracking-wider">
                Old Site Pages
              </h3>
              <p className="text-3xl font-bold text-indigo-400">
                {oldPages.length}
              </p>
            </div>
          )}
          <div className="bg-emerald-900/20 p-5 rounded-xl border border-emerald-500/20 flex-1 flex flex-col justify-center">
            <h3 className="text-emerald-400/80 font-medium mb-1 text-xs uppercase tracking-wider">
              {project.auditType === "FRESH"
                ? "Crawled Pages"
                : "New Site Pages"}
            </h3>
            <p className="text-3xl font-bold text-emerald-400">
              {newPages.length}
            </p>
          </div>
          <div className="bg-rose-900/20 p-5 rounded-xl border border-rose-500/20 flex-1 flex flex-col justify-center">
            <h3 className="text-rose-400/80 font-medium mb-1 text-xs uppercase tracking-wider">
              Critical Issues
            </h3>
            <p className="text-3xl font-bold text-rose-500">
              {issues?.filter((i) => i.severity === "CRITICAL").length || 0}
            </p>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              Global Analytics
            </h2>
            {project.auditType === "MIGRATION" && (
              <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-full border border-slate-700">
                <button
                  onClick={() => setAnalyticsSite("OLD")}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors ${analyticsSite === "OLD" ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  OLD SITE
                </button>
                <button
                  onClick={() => setAnalyticsSite("NEW")}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors ${analyticsSite === "NEW" ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  NEW SITE
                </button>
              </div>
            )}
          </div>
          <SEOScoreWidget
            scores={analyticsSite === "OLD" ? oldScores : newScores}
          />
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/30 p-4 rounded-xl border border-slate-700">
        <div className="flex space-x-1 bg-slate-900 p-1 rounded-lg w-max border border-slate-700">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setActiveTab("ISSUES")}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${activeTab === "ISSUES" ? "bg-indigo-500/20 text-indigo-400" : "text-slate-400 hover:bg-slate-800"}`}
            >
              Detected Issues ({issues?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("PAGES")}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${activeTab === "PAGES" ? "bg-indigo-500/20 text-indigo-400" : "text-slate-400 hover:bg-slate-800"}`}
            >
              Crawled Pages ({pages.length})
            </button>
            {project.auditType === "MIGRATION" && (
              <button
                onClick={() => setActiveTab("DIFF")}
                className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${activeTab === "DIFF" ? "bg-indigo-500/20 text-indigo-400" : "text-slate-400 hover:bg-slate-800"}`}
              >
                Migration Diff
              </button>
            )}
          </div>
        </div>

        {activeTab === "PAGES" && (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              placeholder="Search URLs..."
              value={pageSearchQuery}
              onChange={(e) => setPageSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 w-full sm:w-48"
            />
            <select
              value={pageStatusFilter}
              onChange={(e) => setPageStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Success Only</option>
              <option value="ERROR">Error Only</option>
              <option value="PENDING">Pending Only</option>
            </select>
            {project.auditType === "MIGRATION" && (
              <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-full border border-slate-700">
                <button
                  onClick={() => setSiteFilter("OLD")}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors ${siteFilter === "OLD" ? "bg-slate-700 text-indigo-300" : "text-slate-400 hover:text-white"}`}
                >
                  OLD SITE
                </button>
                <button
                  onClick={() => setSiteFilter("NEW")}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors ${siteFilter === "NEW" ? "bg-slate-700 text-emerald-300" : "text-slate-400 hover:text-white"}`}
                >
                  NEW SITE
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "ISSUES" && <IssuesTable issues={issues || []} />}

        {activeTab === "PAGES" &&
          (() => {
            const filteredPages = pages.filter((p) => {
              if (p.siteType !== siteFilter) return false;
              if (
                pageStatusFilter !== "ALL" &&
                p.crawlStatus !== pageStatusFilter
              )
                return false;
              if (
                pageSearchQuery &&
                !p.url.toLowerCase().includes(pageSearchQuery.toLowerCase())
              )
                return false;
              return true;
            });

            const grouped: Record<string, typeof pages> = {};
            filteredPages.forEach((page) => {
              let category = "Static";
              try {
                const pathSegments = new URL(page.url).pathname
                  .split("/")
                  .filter(Boolean);
                if (pathSegments.length > 1) {
                  category =
                    pathSegments[0].charAt(0).toUpperCase() +
                    pathSegments[0].slice(1);
                }
              } catch (e) {}
              if (!grouped[category]) grouped[category] = [];
              grouped[category].push(page);
            });

            return (
              <div className="space-y-4">
                {Object.entries(grouped)
                  .sort((a, b) => {
                    if (a[0] === "Static") return -1;
                    if (b[0] === "Static") return 1;
                    return b[1].length - a[1].length;
                  })
                  .map(([cat, catPages]) => {
                    const isExpanded = expandedCategories.includes(cat);
                    return (
                      <div
                        key={cat}
                        className="bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden transition-all duration-200 shadow-sm"
                      >
                        <button
                          onClick={() => toggleCategory(cat)}
                          className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800/80 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-semibold text-white">
                              {cat === "Static"
                                ? "Static Pages"
                                : `${cat} Pages`}
                            </span>
                            <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full">
                              {catPages.length}
                            </span>
                          </div>
                          <svg
                            className={`w-5 h-5 text-slate-400 transform transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
                          <div className="overflow-x-auto border-t border-slate-700">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-700">
                                <tr>
                                  <th className="px-4 py-3">URL</th>
                                  <th className="px-4 py-3">Site</th>
                                  <th className="px-4 py-3">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800">
                                {catPages.map((page) => (
                                  <tr
                                    key={page.id}
                                    className="hover:bg-slate-800/30 transition-colors"
                                  >
                                    <td className="px-4 py-3 text-slate-300 truncate max-w-xs">
                                      {page.url}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span
                                        className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${page.siteType === "OLD" ? "bg-indigo-500/20 text-indigo-400" : "bg-emerald-500/20 text-emerald-400"}`}
                                      >
                                        {page.siteType}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span
                                        className={`px-2 py-1 rounded text-xs font-medium ${page.crawlStatus === "SUCCESS" ? "bg-green-500/20 text-green-400" : page.crawlStatus === "ERROR" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}
                                      >
                                        {page.crawlStatus}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            );
          })()}

        {activeTab === "DIFF" && (
          <div className="overflow-x-auto bg-slate-800/30 rounded-xl border border-slate-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Pathname</th>
                  <th className="px-4 py-3">Old URL</th>
                  <th className="px-4 py-3">New URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {oldPages.map((oldPage) => {
                  let path = "";
                  try {
                    path = new URL(oldPage.url).pathname;
                  } catch (e) {}

                  // Find matching new page
                  const newPage = newPages.find((p) => {
                    try {
                      return new URL(p.url).pathname === path;
                    } catch (e) {
                      return false;
                    }
                  });

                  if (!newPage) return null; // Only show mapped pairs for now

                  return (
                    <tr
                      key={oldPage.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-300 font-medium">
                        {path}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-50">
                        {oldPage.url}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-50">
                        {newPage.url}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
