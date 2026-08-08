"use client";

import React, { useState } from "react";
import SEOScoreWidget from "@/app/dashboard/[id]/SEOScoreWidget";
import IssuesTable from "@/app/dashboard/[id]/IssuesTable";
import Link from "next/link";

const MinimalDonut = ({ score, colorClass }: { score: number, colorClass: string }) => (
  <div className="relative w-full h-full">
    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90 drop-shadow-md">
      <path
        className="text-slate-700/50"
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className={colorClass}
        strokeDasharray={`${score}, 100`}
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <span className={`text-xl font-bold ${colorClass} drop-shadow`}>
        {score}%
      </span>
    </div>
  </div>
);

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
  let parsedConfig: any = {};
  try {
    if (project.shareConfig) parsedConfig = JSON.parse(project.shareConfig);
  } catch (e) {}

  const reports = parsedConfig.reports || {
    crawledPages: { enabled: true, siteFilter: "ALL" },
    missingMetadata: { enabled: false, siteFilter: "ALL", types: { title: true, description: true, canonical: true } },
    unmappedUrls: { enabled: false },
    newUrlsNotMapped: { enabled: false }
  };

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (project.auditType !== "MIGRATION") return "PAGES";
    if (reports.crawledPages?.enabled) return "CRAWLED_PAGES";
    if (reports.missingMetadata?.enabled) return "MISSING_METADATA";
    if (reports.unmappedUrls?.enabled) return "UNMAPPED_URLS";
    if (reports.newUrlsNotMapped?.enabled) return "NEW_URLS_NOT_MAPPED";
    return "ISSUES";
  });

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

  // Data pre-processing
  const oldPages = pages.filter((p: any) => p.siteType === "OLD");
  const newPages = pages.filter((p: any) => p.siteType === "NEW");

  // Crawled Pages Report Data
  let crawledPagesReportData = pages;
  if (project.auditType === "MIGRATION" && reports.crawledPages?.siteFilter !== "ALL") {
    crawledPagesReportData = pages.filter((p: any) => p.siteType === reports.crawledPages.siteFilter);
  }

  // Missing Metadata Report Data
  let missingMetadataReportData: any[] = [];
  if (project.auditType === "MIGRATION" && reports.missingMetadata?.enabled) {
    const siteF = reports.missingMetadata.siteFilter || "ALL";
    const types = reports.missingMetadata.types || { title: true, description: true, canonical: true };
    
    missingMetadataReportData = pages.filter((page: any) => {
      if (siteF !== "ALL" && page.siteType !== siteF) return false;
      let metadata = { title: "", description: "", canonical: "" };
      try { if (page.metadata) metadata = JSON.parse(page.metadata); } catch (e) {}
      
      const missingTitle = !metadata.title || metadata.title.trim() === "";
      const missingDesc = !metadata.description || metadata.description.trim() === "";
      const missingCanonical = !metadata.canonical || metadata.canonical.trim() === "";
      
      return (
        (types.title && missingTitle) ||
        (types.description && missingDesc) ||
        (types.canonical && missingCanonical)
      );
    });
  }

  // Unmapped URLs (Old not in New)
  let unmappedUrlsReportData: any[] = [];
  if (project.auditType === "MIGRATION" && reports.unmappedUrls?.enabled) {
    unmappedUrlsReportData = oldPages.filter((oldPage: any) => {
      let path = "";
      try { path = new URL(oldPage.url).pathname; } catch (e) {}
      const newPage = newPages.find((p: any) => {
        try { return new URL(p.url).pathname === path; } catch (e) { return false; }
      });
      return !newPage;
    });
  }

  // New URLs Not Mapped (New not in Old)
  let newUrlsNotMappedReportData: any[] = [];
  if (project.auditType === "MIGRATION" && reports.newUrlsNotMapped?.enabled) {
    newUrlsNotMappedReportData = newPages.filter((newPage: any) => {
      let path = "";
      try { path = new URL(newPage.url).pathname; } catch (e) {}
      const oldPage = oldPages.find((p: any) => {
        try { return new URL(p.url).pathname === path; } catch (e) { return false; }
      });
      return !oldPage;
    });
  }



  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <div className={`grid grid-cols-1 ${project.auditType === "MIGRATION" ? "md:grid-cols-2" : "md:grid-cols-1"} gap-6 mb-8`}>
        {project.auditType === "MIGRATION" && (
          <div className="bg-slate-800/30 p-6 sm:p-8 rounded-2xl border border-indigo-500/20 flex flex-row items-center justify-between shadow-sm">
            <div>
              <h3 className="text-indigo-400/80 font-semibold mb-2 text-sm uppercase tracking-wider">
                Old Site
              </h3>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl sm:text-5xl font-bold text-indigo-400">
                  {oldPages.length}
                </p>
                <span className="text-indigo-400/60 text-sm font-medium">Pages</span>
              </div>
            </div>
            <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0">
              <MinimalDonut score={oldScores.overall} colorClass="text-indigo-400" />
            </div>
          </div>
        )}
        
        <div className="bg-slate-800/30 p-6 sm:p-8 rounded-2xl border border-emerald-500/20 flex flex-row items-center justify-between shadow-sm">
          <div>
            <h3 className="text-emerald-400/80 font-semibold mb-2 text-sm uppercase tracking-wider">
              {project.auditType === "FRESH" ? "Global Score" : "New Site"}
            </h3>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl sm:text-5xl font-bold text-emerald-400">
                {newPages.length}
              </p>
              <span className="text-emerald-400/60 text-sm font-medium">Pages</span>
            </div>
          </div>
          <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0">
            <MinimalDonut score={newScores.overall} colorClass="text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-800/30 p-4 rounded-xl border border-slate-700 overflow-x-auto">
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700 shrink-0">
          <div className="flex items-center space-x-2 whitespace-nowrap">
            {project.auditType !== "MIGRATION" && (
              <>
                <button
                  onClick={() => setActiveTab("ISSUES")}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === "ISSUES" ? "bg-indigo-500/20 text-indigo-400" : "text-slate-400 hover:bg-slate-800"}`}
                >
                  Detected Issues ({issues?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab("PAGES")}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === "PAGES" ? "bg-indigo-500/20 text-indigo-400" : "text-slate-400 hover:bg-slate-800"}`}
                >
                  Crawled Pages ({pages.length})
                </button>
              </>
            )}

            {project.auditType === "MIGRATION" && (
              <>
                {reports.crawledPages?.enabled && (
                  <button
                    onClick={() => setActiveTab("CRAWLED_PAGES")}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === "CRAWLED_PAGES" ? "bg-indigo-500/20 text-indigo-400" : "text-slate-400 hover:bg-slate-800"}`}
                  >
                    Crawled Pages ({crawledPagesReportData.length})
                  </button>
                )}
                {reports.missingMetadata?.enabled && (
                  <button
                    onClick={() => setActiveTab("MISSING_METADATA")}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === "MISSING_METADATA" ? "bg-indigo-500/20 text-indigo-400" : "text-slate-400 hover:bg-slate-800"}`}
                  >
                    Missing Metadata ({missingMetadataReportData.length})
                  </button>
                )}
                {reports.unmappedUrls?.enabled && (
                  <button
                    onClick={() => setActiveTab("UNMAPPED_URLS")}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === "UNMAPPED_URLS" ? "bg-indigo-500/20 text-indigo-400" : "text-slate-400 hover:bg-slate-800"}`}
                  >
                    Unmapped URLs ({unmappedUrlsReportData.length})
                  </button>
                )}
                {reports.newUrlsNotMapped?.enabled && (
                  <button
                    onClick={() => setActiveTab("NEW_URLS_NOT_MAPPED")}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === "NEW_URLS_NOT_MAPPED" ? "bg-indigo-500/20 text-indigo-400" : "text-slate-400 hover:bg-slate-800"}`}
                  >
                    New URLs Not Mapped ({newUrlsNotMappedReportData.length})
                  </button>
                )}
                {(!reports.crawledPages?.enabled && !reports.missingMetadata?.enabled && !reports.unmappedUrls?.enabled && !reports.newUrlsNotMapped?.enabled) && (
                  <button
                    onClick={() => setActiveTab("ISSUES")}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === "ISSUES" ? "bg-indigo-500/20 text-indigo-400" : "text-slate-400 hover:bg-slate-800"}`}
                  >
                    Detected Issues ({issues?.length || 0})
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {activeTab !== "ISSUES" && activeTab !== "DIFF" && (
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 xl:mt-0 shrink-0">
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
              (activeTab === "CRAWLED_PAGES" && (!reports.crawledPages || reports.crawledPages.siteFilter === "ALL")) ||
              (activeTab === "MISSING_METADATA" && (!reports.missingMetadata || reports.missingMetadata.siteFilter === "ALL")) ||
              activeTab === "PAGES"
            ) && (
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

        {["PAGES", "CRAWLED_PAGES", "MISSING_METADATA", "UNMAPPED_URLS", "NEW_URLS_NOT_MAPPED"].includes(activeTab) &&
          (() => {
            let activeData: any[] = [];
            if (activeTab === "PAGES") activeData = baseFilteredPages;
            if (activeTab === "CRAWLED_PAGES") activeData = crawledPagesReportData;
            if (activeTab === "MISSING_METADATA") activeData = missingMetadataReportData;
            if (activeTab === "UNMAPPED_URLS") activeData = unmappedUrlsReportData;
            if (activeTab === "NEW_URLS_NOT_MAPPED") activeData = newUrlsNotMappedReportData;

            const filteredPages = activeData.filter((p) => {
              if (project.auditType === "MIGRATION") {
                if (activeTab === "CRAWLED_PAGES") {
                  if ((!reports.crawledPages || reports.crawledPages.siteFilter === "ALL") && siteFilter !== "ALL" && p.siteType !== siteFilter) return false;
                } else if (activeTab === "MISSING_METADATA") {
                  if ((!reports.missingMetadata || reports.missingMetadata.siteFilter === "ALL") && siteFilter !== "ALL" && p.siteType !== siteFilter) return false;
                } else if (activeTab === "PAGES") {
                  if (siteFilter !== "ALL" && p.siteType !== siteFilter) return false;
                }
              } else {
                 if (siteFilter !== "ALL" && p.siteType !== siteFilter) return false;
              }
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
      </div>
    </div>
  );
}
