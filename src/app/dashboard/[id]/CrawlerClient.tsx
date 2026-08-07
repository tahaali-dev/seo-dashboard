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

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"PDF" | "CSV">("PDF");
  const [exportSections, setExportSections] = useState({
    summary: true,
    issues: true,
    migration: project.auditType === "MIGRATION",
    links: true,
    images: true,
    missingMeta: false,
    brokenPages: false,
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

  const triggerCsvExport = (sections: string[]) => {
    let csvContent = "";

    const escapeCsv = (str: string) => {
      if (str === null || str === undefined) return "";
      const s = String(str).replace(/"/g, '""');
      return s.includes(",") || s.includes("\n") || s.includes('"') ? `"${s}"` : s;
    };

    if (sections.includes("summary")) {
      csvContent += "=== EXECUTIVE SUMMARY ===\n";
      csvContent += `Project Name,${escapeCsv(project.name)}\n`;
      csvContent += `Audit Type,${project.auditType}\n`;
      csvContent += `Created At,${new Date(project.createdAt).toLocaleDateString()}\n`;
      csvContent += `Total Pages,${pages.length}\n`;
      csvContent += `Total Open Issues,${issues.length}\n`;
      csvContent += `Old Site Score,${oldScores.overall}%\n`;
      if (project.auditType === "MIGRATION") {
        csvContent += `New Site Score,${newScores.overall}%\n`;
      }
      csvContent += "\n";
    }

    if (sections.includes("issues")) {
      csvContent += "=== DETECTED SEO ISSUES ===\n";
      csvContent += "Severity,Title,Category,Description,Page URL\n";
      issues.forEach((issue) => {
        csvContent += `${escapeCsv(issue.severity)},${escapeCsv(issue.title)},${escapeCsv(issue.category)},${escapeCsv(issue.description)},${escapeCsv(issue.page?.url || "")}\n`;
      });
      csvContent += "\n";
    }

    if (sections.includes("migration") && project.auditType === "MIGRATION") {
      csvContent += "=== MIGRATION PATH MAPPING ===\n";
      csvContent += "Pathname,Old URL,New URL,Status\n";
      const oldPages = pages.filter((p) => p.siteType === "OLD");
      const newPages = pages.filter((p) => p.siteType === "NEW");
      oldPages.forEach((oldPage) => {
        let path = "";
        try { path = new URL(oldPage.url).pathname; } catch (e) {}
        const newPage = newPages.find((p) => {
          try { return new URL(p.url).pathname === path; } catch (e) { return false; }
        });
        const status = newPage ? "Mapped" : "Missing 301 Redirect";
        csvContent += `${escapeCsv(path)},${escapeCsv(oldPage.url)},${escapeCsv(newPage?.url || "")},${status}\n`;
      });
      csvContent += "\n";
    }

    if (sections.includes("links")) {
      csvContent += "=== OUTBOUND & BROKEN LINKS AUDIT ===\n";
      csvContent += "Page URL,Destination URL,Link Type,HTTP Status\n";
      pages.forEach((page) => {
        let brokenLinksList = [];
        try { brokenLinksList = page.brokenLinks ? JSON.parse(page.brokenLinks) : []; } catch (e) {}
        brokenLinksList.forEach((bl: any) => {
          csvContent += `${escapeCsv(page.url)},${escapeCsv(bl.url)},External,${bl.status}\n`;
        });
      });
      csvContent += "\n";
    }

    if (sections.includes("images")) {
      csvContent += "=== IMAGE OPTIMIZATION AUDIT ===\n";
      csvContent += "Page URL,Image Source URL,Issue\n";
      pages.forEach((page) => {
        let imageDetails = { missingAltSrcs: [] };
        try { imageDetails = page.images ? JSON.parse(page.images) : { missingAltSrcs: [] }; } catch (e) {}
        const missingAlt = imageDetails.missingAltSrcs || [];
        missingAlt.forEach((src: string) => {
          csvContent += `${escapeCsv(page.url)},${escapeCsv(src)},Missing Alt Text\n`;
        });
      });
      csvContent += "\n";
    }

    if (sections.includes("missingMeta")) {
      csvContent += "=== PAGES WITH MISSING METADATA ===\n";
      csvContent += "Page URL,Site Type,Missing Title,Missing Description,Missing Canonical\n";
      pages.forEach((page) => {
        let metadata = { title: "", description: "", canonical: "" };
        try { if (page.metadata) metadata = JSON.parse(page.metadata); } catch (e) {}
        const titleMissing = !metadata.title || metadata.title.trim() === "";
        const descMissing = !metadata.description || metadata.description.trim() === "";
        const canonicalMissing = !metadata.canonical || metadata.canonical.trim() === "";
        
        if (titleMissing || descMissing || canonicalMissing) {
          csvContent += `${escapeCsv(page.url)},${escapeCsv(page.siteType)},${titleMissing ? "Yes" : "No"},${descMissing ? "Yes" : "No"},${canonicalMissing ? "Yes" : "No"}\n`;
        }
      });
      csvContent += "\n";
    }

    if (sections.includes("brokenPages")) {
      csvContent += "=== PAGES WITH 404 / CRAWL ERRORS ===\n";
      csvContent += "Page URL,Site Type,Crawl Status,Error Details\n";
      pages.forEach((page) => {
        if (page.crawlStatus === "ERROR") {
          let errorDetails = "Crawl failed";
          try {
            if (page.metadata) {
              const meta = JSON.parse(page.metadata);
              if (meta.error) errorDetails = meta.error;
            }
          } catch (e) {}
          csvContent += `${escapeCsv(page.url)},${escapeCsv(page.siteType)},${escapeCsv(page.crawlStatus)},${escapeCsv(errorDetails)}\n`;
        }
      });
      csvContent += "\n";
    }

    // Trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${project.name.toLowerCase().replace(/\s+/g, "_")}_seo_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportOpen(false);
  };

  const handleExportSubmit = () => {
    // Collect active sections
    const activeSections = Object.entries(exportSections)
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name);

    if (activeSections.length === 0) {
      alert("Please select at least one section to export.");
      return;
    }

    if (exportFormat === "PDF") {
      // Open in a new tab which triggers printing automatically
      const sectionsParam = activeSections.join(",");
      window.open(`/dashboard/${project.id}/export?sections=${sectionsParam}`, "_blank");
      setIsExportOpen(false);
    } else {
      // Export as CSV
      triggerCsvExport(activeSections);
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
      {isExportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export SEO Report
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

            <div className="space-y-6">
              {/* Section Selection Checklist */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Include Report Sections</h4>
                <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportSections.summary}
                      onChange={(e) => setExportSections(prev => ({ ...prev, summary: e.target.checked }))}
                      className="mt-1 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                    />
                    <div>
                      <span className="text-sm font-medium text-white">Executive Score Summary</span>
                      <p className="text-xs text-slate-400 font-normal">Scorecard, project overview, and category grades.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportSections.issues}
                      onChange={(e) => setExportSections(prev => ({ ...prev, issues: e.target.checked }))}
                      className="mt-1 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                    />
                    <div>
                      <span className="text-sm font-medium text-white">SEO Issues Log</span>
                      <p className="text-xs text-slate-400 font-normal">Prioritized checklist of issues by severity and page.</p>
                    </div>
                  </label>

                  {project.auditType === "MIGRATION" && (
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportSections.migration}
                        onChange={(e) => setExportSections(prev => ({ ...prev, migration: e.target.checked }))}
                        className="mt-1 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                      />
                      <div>
                        <span className="text-sm font-medium text-white">Migration Path Diff</span>
                        <p className="text-xs text-slate-400 font-normal">Comparison matching old URLs to new URLs.</p>
                      </div>
                    </label>
                  )}

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportSections.links}
                      onChange={(e) => setExportSections(prev => ({ ...prev, links: e.target.checked }))}
                      className="mt-1 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                    />
                    <div>
                      <span className="text-sm font-medium text-white">Outbound & Broken Links Audit</span>
                      <p className="text-xs text-slate-400 font-normal">Registry of external, broken, and insecure links.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportSections.images}
                      onChange={(e) => setExportSections(prev => ({ ...prev, images: e.target.checked }))}
                      className="mt-1 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                    />
                    <div>
                      <span className="text-sm font-medium text-white">Image Optimization Audit</span>
                      <p className="text-xs text-slate-400 font-normal">Checklist of images missing alt descriptions.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportSections.missingMeta}
                      onChange={(e) => setExportSections(prev => ({ ...prev, missingMeta: e.target.checked }))}
                      className="mt-1 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                    />
                    <div>
                      <span className="text-sm font-medium text-white">Pages with Missing Meta Data</span>
                      <p className="text-xs text-slate-400 font-normal">Registry of pages missing titles, descriptions, or canonical tags.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportSections.brokenPages}
                      onChange={(e) => setExportSections(prev => ({ ...prev, brokenPages: e.target.checked }))}
                      className="mt-1 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                    />
                    <div>
                      <span className="text-sm font-medium text-white">Pages with 404 / Crawl Errors</span>
                      <p className="text-xs text-slate-400 font-normal">Registry of pages on the website that returned 404 or failed to crawl.</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Format Selection */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Choose Export Format</h4>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setExportFormat("PDF")}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      exportFormat === "PDF" 
                        ? "bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500 text-white font-medium" 
                        : "bg-slate-950/30 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <span className="block text-sm">PDF / Print Report</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-normal">Styled & readable report layout</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat("CSV")}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      exportFormat === "CSV" 
                        ? "bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500 text-white font-medium" 
                        : "bg-slate-950/30 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <span className="block text-sm">CSV Spreadsheet</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-normal">Structured raw data for Excel</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setIsExportOpen(false)}
                className="px-4 py-2.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExportSubmit}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-600/20"
              >
                Generate Export
              </button>
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
            onClick={() => setIsExportOpen(true)}
            disabled={isAuditing || isCrawling || isParsing || pages.length === 0}
            className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2 border border-slate-600"
          >
            <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Report
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
