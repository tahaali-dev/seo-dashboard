"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SEOScoreWidget from "./SEOScoreWidget";
import IssuesTable from "./IssuesTable";

export default function CrawlerClient({
  project,
  initialPages,
  initialIssues = [],
}: {
  project: any;
  initialPages: any[];
  initialIssues?: any[];
  oldScores?: any;
  newScores?: any;
}) {
  const router = useRouter();
  const startedRef = React.useRef(false);

  const [pages, setPages] = useState(initialPages);
  const [issues, setIssues] = useState(initialIssues);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [autoRunStep, setAutoRunStep] = useState<"IDLE" | "DISCOVER" | "CRAWL" | "AUDIT" | "COMPLETE">("IDLE");

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [sharePassword, setSharePassword] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const isShared = project?.isShared || false;

  const [shareConfig, setShareConfig] = useState(() => {
    const defaultConfig = {
      categories: [],
      severities: [],
      reports: {
        crawledPages: { enabled: true, siteFilter: "ALL" },
        missingMetadata: { enabled: false, siteFilter: "ALL", types: { title: true, description: true, canonical: true } },
        unmappedUrls: { enabled: false },
        newUrlsNotMapped: { enabled: false }
      }
    };
    try {
      if (project?.shareConfig) {
        const parsed = JSON.parse(project.shareConfig);
        // Deep merge reports to prevent undefined errors
        const mergedReports = {
          crawledPages: { ...defaultConfig.reports.crawledPages, ...(parsed.reports?.crawledPages || {}) },
          missingMetadata: {
            ...defaultConfig.reports.missingMetadata,
            ...(parsed.reports?.missingMetadata || {}),
            types: { ...defaultConfig.reports.missingMetadata.types, ...(parsed.reports?.missingMetadata?.types || {}) }
          },
          unmappedUrls: { ...defaultConfig.reports.unmappedUrls, ...(parsed.reports?.unmappedUrls || {}) },
          newUrlsNotMapped: { ...defaultConfig.reports.newUrlsNotMapped, ...(parsed.reports?.newUrlsNotMapped || {}) },
        };
        return { 
          ...defaultConfig, 
          ...parsed, 
          reports: mergedReports
        };
      }
      return defaultConfig;
    } catch {
      return defaultConfig;
    }
  });

  const [activeTab, setActiveTab] = useState<"PAGES" | "ISSUES" | "DIFF">("PAGES");
  const [siteFilter, setSiteFilter] = useState<"OLD" | "NEW">(
    project.auditType === "FRESH" ? "NEW" : "OLD",
  );
  const [pageSearchQuery, setPageSearchQuery] = useState("");
  const [pageStatusFilter, setPageStatusFilter] = useState("ALL");
  const [isParsing, setIsParsing] = useState(false);
  const [isCrawling, setIsCrawling] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [analyticsSite, setAnalyticsSite] = useState<"OLD" | "NEW">("NEW");
  const [recrawlingPageId, setRecrawlingPageId] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportSiteFilter, setExportSiteFilter] = useState<"ALL" | "OLD" | "NEW">("ALL");

  const [exportMissingTypes, setExportMissingTypes] = useState({
    title: true,
    description: true,
    canonical: true
  });

  const exportMissingMetadata = () => {
    const missingPages = pages.filter((page: any) => {
      if (exportSiteFilter !== "ALL" && page.siteType !== exportSiteFilter) return false;
      let metadata = { title: "", description: "", canonical: "" };
      try { if (page.metadata) metadata = JSON.parse(page.metadata); } catch (e) {}
      
      const missingTitle = !metadata.title || metadata.title.trim() === "";
      const missingDesc = !metadata.description || metadata.description.trim() === "";
      const missingCanonical = !metadata.canonical || metadata.canonical.trim() === "";
      
      return (
        (exportMissingTypes.title && missingTitle) ||
        (exportMissingTypes.description && missingDesc) ||
        (exportMissingTypes.canonical && missingCanonical)
      );
    });

    let headers = ["URL", "Site Type"];
    if (exportMissingTypes.title) headers.push("Missing Title");
    if (exportMissingTypes.description) headers.push("Missing Description");
    if (exportMissingTypes.canonical) headers.push("Missing Canonical");
    
    let csvContent = headers.join(",") + "\n";
    
    missingPages.forEach((page: any) => {
      let metadata = { title: "", description: "", canonical: "" };
      try { if (page.metadata) metadata = JSON.parse(page.metadata); } catch (e) {}
      const missingTitle = !metadata.title || metadata.title.trim() === "" ? "Yes" : "No";
      const missingDesc = !metadata.description || metadata.description.trim() === "" ? "Yes" : "No";
      const missingCanonical = !metadata.canonical || metadata.canonical.trim() === "" ? "Yes" : "No";
      
      const row = [`"${page.url}"`, `"${page.siteType}"`];
      if (exportMissingTypes.title) row.push(`"${missingTitle}"`);
      if (exportMissingTypes.description) row.push(`"${missingDesc}"`);
      if (exportMissingTypes.canonical) row.push(`"${missingCanonical}"`);
      
      csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `missing_metadata_${project.id}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setIsExportOpen(false);
  };

  const exportUnmappedUrls = () => {
    const oldPages = pages.filter((p: any) => p.siteType === "OLD");
    const newPages = pages.filter((p: any) => p.siteType === "NEW");
    
    const unmappedPages = oldPages.filter((oldPage: any) => {
      let path = "";
      try { path = new URL(oldPage.url).pathname; } catch (e) {}
      const newPage = newPages.find((p: any) => {
        try { return new URL(p.url).pathname === path; } catch (e) { return false; }
      });
      return !newPage;
    });

    let csvContent = "Old URL,Path\n";
    unmappedPages.forEach((page: any) => {
      let path = "";
      try { path = new URL(page.url).pathname; } catch (e) {}
      csvContent += `"${page.url}","${path}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `unmapped_urls_${project.id}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setIsExportOpen(false);
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const parseSitemaps = async (): Promise<any[]> => {
    setIsParsing(true);
    try {
      const res = await fetch("/api/sitemap/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await res.json();
      if (data.success && data.pages) {
        setPages(data.pages);
        setIsParsing(false);
        return data.pages;
      }
    } catch (err) {
      console.error("Sitemap parse error:", err);
    }
    setIsParsing(false);
    return [];
  };

  const handleParseSitemaps = async () => {
    const newPages = await parseSitemaps();
    alert(`Parsed sitemaps! Discovered ${newPages.length} URLs. Try crawling next!`);
    router.refresh();
  };

  const handleRecrawlPage = async (pageId: string) => {
    setRecrawlingPageId(pageId);
    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId }),
      });
      const data = await res.json();
      setPages((prev) =>
        prev.map((p) =>
          p.id === pageId
            ? {
                ...p,
                crawlStatus: data.success ? "SUCCESS" : "ERROR",
                seoScore: data.seoScore || null,
              }
            : p,
        ),
      );
    } catch (err) {
      console.error(err);
      setPages((prev) =>
        prev.map((p) => (p.id === pageId ? { ...p, crawlStatus: "ERROR" } : p)),
      );
    }
    setRecrawlingPageId(null);
  };

  const crawlPages = async (pagesToCrawl: any[]) => {
    if (pagesToCrawl.length === 0) return;
    setIsCrawling(true);
    setCrawlProgress(0);

    let completed = 0;
    const CONCURRENCY = 10;
    const pool = new Set<Promise<any>>();

    for (const page of pagesToCrawl) {
      const promise = fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: page.id }),
      })
        .then((res) => res.json())
        .then((data) => {
          setPages((prev) =>
            prev.map((p) =>
              p.id === page.id
                ? {
                    ...p,
                    crawlStatus: data.success ? "SUCCESS" : "ERROR",
                    seoScore: data.seoScore || null,
                  }
                : p,
            ),
          );
        })
        .catch((err) => {
          console.error(`Failed to crawl ${page.url}`, err);
        })
        .finally(() => {
          completed++;
          setCrawlProgress((completed / pagesToCrawl.length) * 100);
          pool.delete(promise);
        });

      pool.add(promise);

      if (pool.size >= CONCURRENCY) {
        await Promise.race(pool);
      }
    }

    await Promise.all(pool);
    setIsCrawling(false);
  };

  const handleStartCrawl = async (recrawlAll = false) => {
    const targetPages = recrawlAll
      ? pages
      : pages.filter((p) => p.crawlStatus === "PENDING");
    await crawlPages(targetPages);
    alert("Crawling complete! We are now ready to generate Issues.");
    router.refresh();
  };

  const runAudit = async (): Promise<any[]> => {
    setIsAuditing(true);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await res.json();
      if (data.success && data.issues) {
        setIssues(data.issues);
        setIsAuditing(false);
        return data.issues;
      }
    } catch (err) {
      console.error("Audit error:", err);
    }
    setIsAuditing(false);
    return [];
  };

  const handleRunAudit = async () => {
    const newIssues = await runAudit();
    alert(`SEO Audit Complete! Generated ${newIssues.length} issues.`);
    router.refresh();
  };

  const runAutoWorkflow = async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    // Clear query parameter immediately
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("autostart");
      window.history.replaceState({}, "", url.pathname + url.search);
    }

    setIsAutoRunning(true);
    
    // Step 1: Discover URLs
    setAutoRunStep("DISCOVER");
    const discoveredPages = await parseSitemaps();
    
    // Step 2: Crawl Pages
    setAutoRunStep("CRAWL");
    const pendingPages = discoveredPages.filter(p => p.crawlStatus === "PENDING");
    if (pendingPages.length > 0) {
      await crawlPages(pendingPages);
    }
    
    // Step 3: Run Audit
    setAutoRunStep("AUDIT");
    await runAudit();
    
    // Step 4: Complete
    setAutoRunStep("COMPLETE");
    
    router.refresh();
    
    setTimeout(() => {
      setIsAutoRunning(false);
      setAutoRunStep("IDLE");
    }, 1500);
  };

  const handleShareSubmit = async () => {
    setIsSharing(true);
    try {
      const res = await fetch(`/api/project/${project.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isShared: true, password: sharePassword, shareConfig }),
      });
      if (res.ok) {
        alert("Project is now shared! You can send the link to your client.");
        setIsShareOpen(false);
        router.refresh();
      } else {
        alert("Failed to share project.");
      }
    } catch (err) {
      console.error(err);
      alert("Error sharing project.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleStopSharing = async () => {
    setIsSharing(true);
    try {
      const res = await fetch(`/api/project/${project.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isShared: false }),
      });
      if (res.ok) {
        alert("Project sharing disabled.");
        setIsShareOpen(false);
        router.refresh();
      } else {
        alert("Failed to disable sharing.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSharing(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("autostart") === "true") {
        runAutoWorkflow();
      }
    }
  }, []);

  const pendingCount = pages.filter((p) => p.crawlStatus === "PENDING").length;
  const successCount = pages.filter((p) => p.crawlStatus === "SUCCESS").length;
  const oldPages = pages.filter((p) => p.siteType === "OLD");
  const newPages = pages.filter((p) => p.siteType === "NEW");

  const oldN = oldPages.length || 1;
  const newN = newPages.length || 1;

  const getScoreForCategory = (cat: string, siteType: string, N: number) => {
    const issuesInCat = issues.filter(
      (i: any) => i.category === cat && i.page?.siteType === siteType,
    );
    const totalProblemPages = new Set(issuesInCat.map((i: any) => i.pageId)).size;
    return Math.max(0, Math.round((100 * (N - totalProblemPages)) / N));
  };

  const computeScores = (siteType: string, N: number) => {
    const categories = {
      "Meta data": getScoreForCategory("Meta data", siteType, N),
      "Page structure": getScoreForCategory("Page structure", siteType, N),
      Server: getScoreForCategory("Server", siteType, N),
      "Page quality": getScoreForCategory("Page quality", siteType, N),
      Links: getScoreForCategory("Links", siteType, N),
      "External factors": getScoreForCategory("External factors", siteType, N),
    };
    const overall = Math.round(
      Object.values(categories).reduce((a, b) => a + b, 0) / 6,
    );
    return { categories, overall };
  };

  const oldScores = computeScores("OLD", oldN);
  const newScores = computeScores("NEW", newN);

  return (
    <div className="space-y-8">
      {isAutoRunning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden flex flex-col items-center">
            {/* Decorative gradient blur background */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Spinner/Header */}
            <div className="mb-6 relative flex items-center justify-center">
              {autoRunStep !== "COMPLETE" ? (
                <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin"></div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center animate-bounce">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>

            <h3 className="text-xl font-bold text-white mb-2 text-center">
              {autoRunStep === "DISCOVER" && "Discovering Pages"}
              {autoRunStep === "CRAWL" && "Crawling Site Content"}
              {autoRunStep === "AUDIT" && "Analyzing SEO Issues"}
              {autoRunStep === "COMPLETE" && "SEO Audit Complete!"}
            </h3>
            <p className="text-sm text-slate-400 text-center mb-8 max-w-sm">
              {autoRunStep === "DISCOVER" && "Parsing sitemaps and scanning landing pages to locate all URLs..."}
              {autoRunStep === "CRAWL" && `Crawling and extracting metadata, keywords, and outbound links...`}
              {autoRunStep === "AUDIT" && "Applying SEO rules, validating outbound links, and calculating scores..."}
              {autoRunStep === "COMPLETE" && "All steps completed successfully. Preparing your dashboard..."}
            </p>

            {/* Progress indicators for steps */}
            <div className="w-full space-y-4">
              {/* Step 1: Discover */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    autoRunStep === "DISCOVER" 
                      ? "bg-indigo-500 text-white animate-pulse" 
                      : (autoRunStep === "CRAWL" || autoRunStep === "AUDIT" || autoRunStep === "COMPLETE")
                        ? "bg-indigo-500/20 text-indigo-400"
                        : "bg-slate-800 text-slate-500"
                  }`}>
                    {(autoRunStep === "CRAWL" || autoRunStep === "AUDIT" || autoRunStep === "COMPLETE") ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : "1"}
                  </span>
                  <span className={autoRunStep === "DISCOVER" ? "text-white font-medium" : "text-slate-400"}>
                    URL Discovery
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {autoRunStep === "DISCOVER" ? "In progress..." : (autoRunStep !== "IDLE" ? "Done" : "Pending")}
                </span>
              </div>

              {/* Step 2: Crawl */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      autoRunStep === "CRAWL" 
                        ? "bg-indigo-500 text-white animate-pulse" 
                        : (autoRunStep === "AUDIT" || autoRunStep === "COMPLETE")
                          ? "bg-indigo-500/20 text-indigo-400"
                          : "bg-slate-800 text-slate-500"
                    }`}>
                      {(autoRunStep === "AUDIT" || autoRunStep === "COMPLETE") ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : "2"}
                    </span>
                    <span className={autoRunStep === "CRAWL" ? "text-white font-medium" : "text-slate-400"}>
                      Page Crawling
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {autoRunStep === "CRAWL" 
                      ? `${Math.round(crawlProgress)}%` 
                      : (autoRunStep === "AUDIT" || autoRunStep === "COMPLETE") ? "Done" : "Pending"}
                  </span>
                </div>
                {autoRunStep === "CRAWL" && (
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${crawlProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>

              {/* Step 3: Audit */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    autoRunStep === "AUDIT" 
                      ? "bg-indigo-500 text-white animate-pulse" 
                      : autoRunStep === "COMPLETE"
                        ? "bg-indigo-500/20 text-indigo-400"
                        : "bg-slate-800 text-slate-500"
                  }`}>
                    {autoRunStep === "COMPLETE" ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : "3"}
                  </span>
                  <span className={autoRunStep === "AUDIT" ? "text-white font-medium" : "text-slate-400"}>
                    SEO Auditing
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {autoRunStep === "AUDIT" ? "In progress..." : (autoRunStep === "COMPLETE" ? "Done" : "Pending")}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      {isShareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share SEO Report
              </h3>
              <button
                onClick={() => setIsShareOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {isShared ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                  <p className="text-emerald-400 text-sm font-medium mb-2">This report is currently shared.</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/share/${project.id}`}
                      className="bg-slate-950 border border-slate-700 text-slate-300 rounded px-3 py-2 text-sm w-full outline-none"
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/share/${project.id}`);
                        alert('Link copied to clipboard!');
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded text-sm transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  Share this project with clients by generating a password-protected link.
                </p>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  {isShared ? "Update Password (leave blank to keep current)" : "Set Password"}
                </label>
                <input
                  type="text"
                  value={sharePassword}
                  onChange={(e) => setSharePassword(e.target.value)}
                  placeholder={isShared ? "Leave blank to keep current password..." : "Enter a secure password..."}
                  className="w-full bg-slate-950/50 border border-slate-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-600 mb-6"
                />

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2">Filter Shared Data</h4>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Categories to Share (leave empty for all)</label>
                    <div className="flex flex-wrap gap-2">
                      {["Meta data", "Page structure", "Server", "Page quality", "Links", "External factors"].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setShareConfig((prev: any) => ({
                            ...prev,
                            categories: prev.categories?.includes(cat) 
                              ? prev.categories.filter((c: string) => c !== cat) 
                              : [...(prev.categories || []), cat]
                          }))}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                            shareConfig.categories?.includes(cat) 
                              ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300" 
                              : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Severities to Share (leave empty for all)</label>
                    <div className="flex flex-wrap gap-2">
                      {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map(sev => (
                        <button
                          key={sev}
                          onClick={() => setShareConfig((prev: any) => ({
                            ...prev,
                            severities: prev.severities?.includes(sev) 
                              ? prev.severities.filter((s: string) => s !== sev) 
                              : [...(prev.severities || []), sev]
                          }))}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                            shareConfig.severities?.includes(sev) 
                              ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300" 
                              : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {sev}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {project.auditType === "MIGRATION" && (
                    <div className="mt-6 pt-6 border-t border-slate-800 space-y-4">
                      <h4 className="text-sm font-semibold text-slate-300">Migration Data Views</h4>
                      
                      {/* Total Crawled Pages */}
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 space-y-3">
                        <label className="flex items-center gap-3 text-sm text-slate-200 font-medium cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={shareConfig.reports?.crawledPages?.enabled ?? true}
                            onChange={(e) => setShareConfig((prev: any) => ({
                              ...prev,
                              reports: { 
                                ...(prev.reports || {}), 
                                crawledPages: { ...(prev.reports?.crawledPages || {}), enabled: e.target.checked }
                              }
                            }))}
                            className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer w-4 h-4"
                          />
                          Total Crawled Pages
                        </label>
                        {shareConfig.reports?.crawledPages?.enabled && (
                          <div className="pl-7 space-y-2">
                            <label className="block text-xs text-slate-400">Site to show</label>
                            <select
                              value={shareConfig.reports?.crawledPages?.siteFilter || "ALL"}
                              onChange={(e) => setShareConfig((prev: any) => ({
                                ...prev,
                                reports: { 
                                  ...(prev.reports || {}), 
                                  crawledPages: { ...(prev.reports?.crawledPages || {}), siteFilter: e.target.value }
                                }
                              }))}
                              className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2"
                            >
                              <option value="ALL">All Sites (Old & New)</option>
                              <option value="OLD">Old Site Only</option>
                              <option value="NEW">New Site Only</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Missing Metadata */}
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 space-y-3">
                        <label className="flex items-center gap-3 text-sm text-slate-200 font-medium cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={shareConfig.reports?.missingMetadata?.enabled ?? false}
                            onChange={(e) => setShareConfig((prev: any) => ({
                              ...prev,
                              reports: { 
                                ...(prev.reports || {}), 
                                missingMetadata: { ...(prev.reports?.missingMetadata || {}), enabled: e.target.checked }
                              }
                            }))}
                            className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer w-4 h-4"
                          />
                          Missing Metadata URLs
                        </label>
                        {shareConfig.reports?.missingMetadata?.enabled && (
                          <div className="pl-7 space-y-4">
                            <div>
                              <label className="block text-xs text-slate-400 mb-2">Site to check</label>
                              <select
                                value={shareConfig.reports?.missingMetadata?.siteFilter || "ALL"}
                                onChange={(e) => setShareConfig((prev: any) => ({
                                  ...prev,
                                  reports: { 
                                    ...(prev.reports || {}), 
                                    missingMetadata: { ...(prev.reports?.missingMetadata || {}), siteFilter: e.target.value }
                                  }
                                }))}
                                className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2"
                              >
                                <option value="ALL">All Sites (Old & New)</option>
                                <option value="OLD">Old Site Only</option>
                                <option value="NEW">New Site Only</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-2">Include URLs missing:</label>
                              <div className="flex flex-wrap gap-4">
                                {["title", "description", "canonical"].map(type => (
                                  <label key={type} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={shareConfig.reports?.missingMetadata?.types?.[type] ?? true} 
                                      onChange={(e) => setShareConfig((prev: any) => ({
                                        ...prev,
                                        reports: { 
                                          ...(prev.reports || {}), 
                                          missingMetadata: { 
                                            ...(prev.reports?.missingMetadata || {}), 
                                            types: { ...(prev.reports?.missingMetadata?.types || {}), [type]: e.target.checked }
                                          }
                                        }
                                      }))} 
                                      className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer" 
                                    />
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Unmapped URLs */}
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 space-y-3">
                        <label className="flex items-center gap-3 text-sm text-slate-200 font-medium cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={shareConfig.reports?.unmappedUrls?.enabled ?? false}
                            onChange={(e) => setShareConfig((prev: any) => ({
                              ...prev,
                              reports: { 
                                ...(prev.reports || {}), 
                                unmappedUrls: { ...(prev.reports?.unmappedUrls || {}), enabled: e.target.checked }
                              }
                            }))}
                            className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer w-4 h-4"
                          />
                          Unmapped URLs (Old site URLs missing in New site)
                        </label>
                      </div>

                      {/* New URLs Not Mapped */}
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 space-y-3">
                        <label className="flex items-center gap-3 text-sm text-slate-200 font-medium cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={shareConfig.reports?.newUrlsNotMapped?.enabled ?? false}
                            onChange={(e) => setShareConfig((prev: any) => ({
                              ...prev,
                              reports: { 
                                ...(prev.reports || {}), 
                                newUrlsNotMapped: { ...(prev.reports?.newUrlsNotMapped || {}), enabled: e.target.checked }
                              }
                            }))}
                            className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer w-4 h-4"
                          />
                          New URLs Not Mapped (New site URLs missing in Old site)
                        </label>
                      </div>

                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800 flex justify-between gap-3">
              {isShared ? (
                <button
                  onClick={handleStopSharing}
                  disabled={isSharing}
                  className="px-4 py-2.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  Stop Sharing
                </button>
              ) : <div></div>}
              <div className="flex gap-3">
                <button
                  onClick={() => setIsShareOpen(false)}
                  className="px-4 py-2.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShareSubmit}
                  disabled={isSharing || (!isShared && !sharePassword)}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-600/20"
                >
                  {isSharing ? "Saving..." : isShared ? "Update Share Settings" : "Share Project"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isExportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Export Migration Data
              </h3>
              <button
                onClick={() => setIsExportOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-slate-400 mb-2">
                Download CSV reports for your migration project to help identify missing SEO configurations.
              </p>

              {project.auditType === "MIGRATION" && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-400 mb-2">Select Site to Export for Metadata</label>
                  <select
                    value={exportSiteFilter}
                    onChange={(e) => setExportSiteFilter(e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                  >
                    <option value="ALL">All Sites (Old & New)</option>
                    <option value="OLD">Old Site Only</option>
                    <option value="NEW">New Site Only</option>
                  </select>
                </div>
              )}

              <div className="mb-4 border-b border-slate-800 pb-4">
                <label className="block text-xs font-medium text-slate-400 mb-2">Include URLs missing:</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={exportMissingTypes.title} 
                      onChange={(e) => setExportMissingTypes((prev: any) => ({...prev, title: e.target.checked}))} 
                      className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer" 
                    />
                    Title
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={exportMissingTypes.description} 
                      onChange={(e) => setExportMissingTypes((prev: any) => ({...prev, description: e.target.checked}))} 
                      className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer" 
                    />
                    Description
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={exportMissingTypes.canonical} 
                      onChange={(e) => setExportMissingTypes((prev: any) => ({...prev, canonical: e.target.checked}))} 
                      className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer" 
                    />
                    Canonical
                  </label>
                </div>
              </div>

              <button
                onClick={exportMissingMetadata}
                className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 rounded-xl transition-all group"
              >
                <div className="text-left">
                  <h4 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">Missing Metadata URLs</h4>
                  <p className="text-xs text-slate-500 mt-1">Export URLs missing titles, descriptions, or canonicals.</p>
                </div>
                <svg className="w-5 h-5 text-slate-500 group-hover:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>

              {project.auditType === "MIGRATION" && (
                <button
                  onClick={exportUnmappedUrls}
                  className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-xl transition-all group"
                >
                  <div className="text-left">
                    <h4 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">Unmapped URLs</h4>
                    <p className="text-xs text-slate-500 mt-1">Export URLs present in old site but missing in new site.</p>
                  </div>
                  <svg className="w-5 h-5 text-slate-500 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
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

      {/* Controls */}
      <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Migration Controls
          </h2>
          <p className="text-sm text-slate-400 max-w-xl">
            Parse sitemaps to discover URLs, crawl them to extract metadata, and
            run the SEO audit to generate the scores above.
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleParseSitemaps}
            disabled={isParsing}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm"
          >
            {isParsing ? "Discovering..." : "1. Discover URLs"}
          </button>

          {pendingCount > 0 ? (
            <button
              onClick={() => handleStartCrawl(false)}
              disabled={isCrawling}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm"
            >
              {isCrawling
                ? `Crawling (${Math.round(crawlProgress)}%)`
                : `2. Crawl (${pendingCount})`}
            </button>
          ) : (
            <button
              onClick={() => {
                if (
                  confirm(
                    "Are you sure you want to recrawl all pages? This may take a while.",
                  )
                ) {
                  handleStartCrawl(true);
                }
              }}
              disabled={isCrawling || pages.length === 0}
              className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm"
            >
              {isCrawling
                ? `Recrawling (${Math.round(crawlProgress)}%)`
                : `Recrawl All (${pages.length})`}
            </button>
          )}

          <button
            onClick={handleRunAudit}
            disabled={isAuditing || isCrawling || isParsing}
            className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm"
          >
            {isAuditing ? "Generating..." : "3. Run Audit"}
          </button>

          <button
            onClick={() => setIsShareOpen(true)}
            disabled={isAuditing || isCrawling || isParsing || pages.length === 0}
            className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2 border border-slate-600"
          >
            <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share Report
          </button>

          <button
            onClick={() => setIsExportOpen(true)}
            disabled={isAuditing || isCrawling || isParsing || pages.length === 0}
            className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2 border border-slate-600"
          >
            <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Export Data
          </button>
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
                                  <th className="px-4 py-3 text-right">
                                    Action
                                  </th>
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
                                    <td className="px-4 py-3 text-right">
                                      <div className="flex items-center justify-end space-x-2">
                                        <button
                                          onClick={() =>
                                            handleRecrawlPage(page.id)
                                          }
                                          disabled={
                                            recrawlingPageId === page.id
                                          }
                                          className="text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                                        >
                                          {recrawlingPageId === page.id
                                            ? "..."
                                            : "Recrawl"}
                                        </button>
                                        {page.crawlStatus === "SUCCESS" && (
                                          <Link
                                            href={`/dashboard/${project.id}/page/${page.id}`}
                                            className="text-sm text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:border-indigo-400 px-3 py-1.5 rounded transition-colors inline-block"
                                          >
                                            View
                                          </Link>
                                        )}
                                      </div>
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
                  <th className="px-4 py-3">Action</th>
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
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/${project.id}/diff/${oldPage.id}/${newPage.id}`}
                          className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition-colors shadow-sm"
                        >
                          Compare
                        </Link>
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
