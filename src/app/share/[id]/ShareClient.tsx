"use client";

import React, { useState } from "react";
import SEOScoreWidget from "@/app/dashboard/[id]/SEOScoreWidget";
import IssuesTable from "@/app/dashboard/[id]/IssuesTable";
import Link from "next/link";

const MinimalDonut = ({ score, colorClass }: { score: number, colorClass: string }) => (
  <div className="relative w-full h-full">
    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
      <path
        className="text-black/10 dark:text-white/10"
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
      <span className={`text-xl font-bold ${colorClass}`}>
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

  const [siteFilter, setSiteFilter] = useState<"OLD" | "NEW" | "ALL">(
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
    <div className="space-y-10">
      {/* Overview Stats */}
      <div className={`grid grid-cols-1 ${project.auditType === "MIGRATION" ? "md:grid-cols-2" : "md:grid-cols-1"} gap-6 mb-8`}>
        {project.auditType === "MIGRATION" && (
          <div className="bg-white dark:bg-[#1A1A1A] p-8 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] flex flex-row items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-none">
            <div>
              <h3 className="text-[#E80C08]/80 font-bold mb-3 text-xs uppercase tracking-[0.2em]">
                Old Site
              </h3>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl sm:text-5xl font-extrabold text-[#E80C08] tracking-tight">
                  {oldPages.length}
                </p>
                <span className="text-[#E80C08]/60 text-sm font-semibold tracking-wide">Pages</span>
              </div>
            </div>
            <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0">
              <MinimalDonut score={oldScores.overall} colorClass="text-[#E80C08]" />
            </div>
          </div>
        )}
        
        <div className="bg-white dark:bg-[#1A1A1A] p-8 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] flex flex-row items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-none">
          <div>
            <h3 className="text-emerald-500 font-bold mb-3 text-xs uppercase tracking-[0.2em]">
              {project.auditType === "FRESH" ? "Global Score" : "New Site"}
            </h3>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl sm:text-5xl font-extrabold text-emerald-500 tracking-tight">
                {newPages.length}
              </p>
              <span className="text-emerald-500/60 text-sm font-semibold tracking-wide">Pages</span>
            </div>
          </div>
          <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0">
            <MinimalDonut score={newScores.overall} colorClass="text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-2 bg-white dark:bg-[#1A1A1A] rounded-2xl border border-black/[0.06] dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <div className="flex bg-black/[0.04] dark:bg-white/[0.04] p-1.5 rounded-xl overflow-x-auto w-full xl:w-auto xl:shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center space-x-1 whitespace-nowrap min-w-max">
            {project.auditType !== "MIGRATION" && (
              <>
                <button
                  onClick={() => setActiveTab("ISSUES")}
                  className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === "ISSUES" ? "bg-white dark:bg-[#1A1A1A] shadow-sm text-foreground dark:text-white" : "text-black-60 dark:text-white/60 hover:text-black-80 dark:text-white/80"}`}
                >
                  Detected Issues ({issues?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab("PAGES")}
                  className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === "PAGES" ? "bg-white dark:bg-[#1A1A1A] shadow-sm text-foreground dark:text-white" : "text-black-60 dark:text-white/60 hover:text-black-80 dark:text-white/80"}`}
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
                    className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === "CRAWLED_PAGES" ? "bg-white dark:bg-[#1A1A1A] shadow-sm text-foreground dark:text-white" : "text-black-60 dark:text-white/60 hover:text-black-80 dark:text-white/80"}`}
                  >
                    Crawled Pages ({crawledPagesReportData.length})
                  </button>
                )}
                {reports.missingMetadata?.enabled && (
                  <button
                    onClick={() => setActiveTab("MISSING_METADATA")}
                    className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === "MISSING_METADATA" ? "bg-[#FFF5F5] text-[#E80C08]" : "text-black-60 dark:text-white/60 hover:text-black-80 dark:text-white/80"}`}
                  >
                    Missing Metadata ({missingMetadataReportData.length})
                  </button>
                )}
                {reports.unmappedUrls?.enabled && (
                  <button
                    onClick={() => setActiveTab("UNMAPPED_URLS")}
                    className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === "UNMAPPED_URLS" ? "bg-white dark:bg-[#1A1A1A] shadow-sm text-foreground dark:text-white" : "text-black-60 dark:text-white/60 hover:text-black-80 dark:text-white/80"}`}
                  >
                    Unmapped URLs ({unmappedUrlsReportData.length})
                  </button>
                )}
                {reports.newUrlsNotMapped?.enabled && (
                  <button
                    onClick={() => setActiveTab("NEW_URLS_NOT_MAPPED")}
                    className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === "NEW_URLS_NOT_MAPPED" ? "bg-white dark:bg-[#1A1A1A] shadow-sm text-foreground dark:text-white" : "text-black-60 dark:text-white/60 hover:text-black-80 dark:text-white/80"}`}
                  >
                    New URLs Not Mapped ({newUrlsNotMappedReportData.length})
                  </button>
                )}
                {(!reports.crawledPages?.enabled && !reports.missingMetadata?.enabled && !reports.unmappedUrls?.enabled && !reports.newUrlsNotMapped?.enabled) && (
                  <button
                    onClick={() => setActiveTab("ISSUES")}
                    className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === "ISSUES" ? "bg-white dark:bg-[#1A1A1A] shadow-sm text-foreground dark:text-white" : "text-black-60 dark:text-white/60 hover:text-black-80 dark:text-white/80"}`}
                  >
                    Detected Issues ({issues?.length || 0})
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {activeTab !== "ISSUES" && activeTab !== "DIFF" && (
          <div className="flex flex-col sm:flex-row items-center gap-3 px-2 pb-2 xl:p-0 shrink-0 w-full xl:w-auto">
            <input
              type="text"
              placeholder="Search URLs..."
              value={pageSearchQuery}
              onChange={(e) => setPageSearchQuery(e.target.value)}
              className="bg-black/5 dark:bg-white/5 border-transparent text-foreground dark:text-white text-sm font-medium rounded-xl focus:bg-white dark:bg-[#1A1A1A] focus:ring-1 focus:ring-black/20 focus:border-black/20 dark:border-white/20 block px-4 py-2 w-full sm:w-48 transition-all"
            />
            <select
              value={pageStatusFilter}
              onChange={(e) => setPageStatusFilter(e.target.value)}
              className="bg-black/5 dark:bg-white/5 border-transparent text-foreground dark:text-white text-sm font-medium rounded-xl focus:bg-white dark:bg-[#1A1A1A] focus:ring-1 focus:ring-black/20 focus:border-black/20 dark:border-white/20 block px-4 py-2 w-full sm:w-auto transition-all"
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
              <div className="flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.04] p-1.5 rounded-full w-full sm:w-auto shrink-0">
                <button
                  onClick={() => setSiteFilter("OLD")}
                  className={`flex-1 sm:flex-none px-6 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all text-center ${siteFilter === "OLD" ? "bg-white dark:bg-[#1A1A1A] shadow-sm text-[#E80C08]" : "text-black-40 dark:text-white/40 hover:text-black-80 dark:text-white/80"}`}
                >
                  OLD SITE
                </button>
                <button
                  onClick={() => setSiteFilter("NEW")}
                  className={`flex-1 sm:flex-none px-6 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all text-center ${siteFilter === "NEW" ? "bg-white dark:bg-[#1A1A1A] shadow-sm text-emerald-500" : "text-black-40 dark:text-white/40 hover:text-black-80 dark:text-white/80"}`}
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
            if (activeTab === "PAGES") activeData = pages.filter((p: any) => p.crawlStatus !== "PENDING");
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
                        className="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden transition-all duration-300 shadow-[0_2px_14px_rgba(0,0,0,0.03)]"
                      >
                        <button
                          onClick={() => toggleCategory(cat)}
                          className="w-full flex items-center justify-between p-5 bg-white dark:bg-[#1A1A1A] hover:bg-[#FAFAFA] dark:hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-lg font-bold text-foreground dark:text-white tracking-tight">
                              {cat === "Static"
                                ? "Static Pages"
                                : `${cat} Pages`}
                            </span>
                            <span className="bg-black/5 dark:bg-white/5 text-black-80 dark:text-white/80 text-xs font-extrabold px-3 py-1 rounded-full border border-black/[0.04] dark:border-white/5">
                              {catPages.length}
                            </span>
                          </div>
                          <svg
                            className={`w-5 h-5 text-black-40 dark:text-white/40 transform transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
                          <div className="overflow-x-auto border-t border-black/5 dark:border-white/10">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-[#FAFAFA] dark:bg-[#1A1A1A] text-black-60 dark:text-white/60 border-b border-black/5 dark:border-white/10">
                                <tr>
                                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">URL</th>
                                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Site</th>
                                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Status</th>
                                  {activeTab === "MISSING_METADATA" && reports.missingMetadata?.types?.title && (
                                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-center">Title</th>
                                  )}
                                  {activeTab === "MISSING_METADATA" && reports.missingMetadata?.types?.description && (
                                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-center">Description</th>
                                  )}
                                  {activeTab === "MISSING_METADATA" && reports.missingMetadata?.types?.canonical && (
                                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-center">Canonical</th>
                                  )}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.05] bg-white dark:bg-[#171717]">
                                {catPages.map((page) => (
                                  <tr
                                    key={page.id}
                                    className="hover:bg-[#FAFAFA] dark:hover:bg-white/10 transition-colors"
                                  >
                                    <td className="px-6 py-4 text-black-80 dark:text-white/80 truncate max-w-xs font-medium" title={page.url}>
                                      <a
                                        href={page.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:text-[#E80C08] hover:underline transition-colors block w-full truncate"
                                      >
                                        {(() => {
                                          try {
                                            const urlObj = new URL(page.url);
                                            return urlObj.pathname + urlObj.search;
                                          } catch (e) {
                                            return page.url;
                                          }
                                        })()}
                                      </a>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span
                                        className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-widest uppercase ${page.siteType === "OLD" ? "bg-[#FFF5F5] text-[#E80C08] border border-[#E80C08]/20" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-200 dark:border-emerald-500/20"}`}
                                      >
                                        {page.siteType}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span
                                        className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-widest uppercase ${page.crawlStatus === "SUCCESS" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-200 dark:border-emerald-500/20" : page.crawlStatus === "ERROR" ? "bg-[#FFF5F5] text-[#E80C08] border border-[#E80C08]/20" : "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 border border-yellow-200 dark:border-yellow-500/20"}`}
                                      >
                                        {page.crawlStatus}
                                      </span>
                                    </td>
                                    {activeTab === "MISSING_METADATA" && (() => {
                                      let meta = { title: "", description: "", canonical: "" };
                                      try { if (page.metadata) meta = JSON.parse(page.metadata); } catch(e) {}
                                      
                                      const MissingBadge = () => <span className="text-[#E80C08] bg-[#FFF5F5] border border-[#E80C08]/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">Missing</span>;
                                      
                                      return (
                                        <>
                                          {reports.missingMetadata?.types?.title && (
                                            <td className="px-6 py-4 text-center">
                                              {(!meta.title || meta.title.trim() === "") && <MissingBadge />}
                                            </td>
                                          )}
                                          {reports.missingMetadata?.types?.description && (
                                            <td className="px-6 py-4 text-center">
                                              {(!meta.description || meta.description.trim() === "") && <MissingBadge />}
                                            </td>
                                          )}
                                          {reports.missingMetadata?.types?.canonical && (
                                            <td className="px-6 py-4 text-center">
                                              {(!meta.canonical || meta.canonical.trim() === "") && <MissingBadge />}
                                            </td>
                                          )}
                                        </>
                                      );
                                    })()}
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
