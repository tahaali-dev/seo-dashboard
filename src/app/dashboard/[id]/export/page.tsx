import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import ExportHeader from "./ExportHeader";

export const dynamic = "force-dynamic";

export default async function ExportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sections?: string }>;
}) {
  const { id } = await params;
  const { sections = "" } = await searchParams;
  const activeSections = sections ? sections.split(",") : ["summary", "issues"];

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      pages: true,
      issues: {
        include: {
          page: {
            select: {
              url: true,
              siteType: true,
            },
          },
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const oldPages = project.pages.filter((p: any) => p.siteType === "OLD");
  const newPages = project.pages.filter((p: any) => p.siteType === "NEW");
  const oldN = oldPages.length || 1;
  const newN = newPages.length || 1;

  const getScoreForCategory = (cat: string, siteType: string, N: number) => {
    const issuesInCat = project.issues.filter(
      (i: any) => i.category === cat && i.page?.siteType === siteType
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
      Object.values(categories).reduce((a, b) => a + b, 0) / 6
    );
    return { categories, overall };
  };

  const oldScores = computeScores("OLD", oldN);
  const newScores = computeScores("NEW", newN);

  return (
    <div className="min-h-screen bg-white text-slate-900 p-8 font-sans antialiased">
      {/* Styles for Printing */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background-color: white;
            color: black;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-before: always;
            break-before: page;
          }
          .card-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}} />

      {/* Action Header for Screen View */}
      <ExportHeader />

      {/* Main Report Document */}
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Document Header */}
        <section className="border-b-2 border-slate-900 pb-6 flex justify-between items-end">
          <div>
            <div className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1.5">SEO Audit & Migration Report</div>
            <h2 className="text-3xl font-extrabold text-slate-950">{project.name}</h2>
            <div className="text-xs text-slate-500 mt-2 space-y-1">
              <div><strong className="text-slate-700">Audit Mode:</strong> {project.auditType === "FRESH" ? "Fresh Website Audit" : "Website Migration Audit"}</div>
              {project.oldWebsite && <div><strong className="text-slate-700">Old Website:</strong> {project.oldWebsite}</div>}
              <div><strong className="text-slate-700">Target Website:</strong> {project.newWebsite}</div>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div><strong className="text-slate-700">Date Generated:</strong> {new Date().toLocaleDateString(undefined, { dateStyle: "long" })}</div>
            <div><strong className="text-slate-700 font-bold">Total Pages Audited:</strong> {project.pages.length}</div>
            <div><strong className="text-slate-700 font-bold">Total Issues Flagged:</strong> {project.issues.length}</div>
          </div>
        </section>

        {/* SECTION: Executive Summary */}
        {activeSections.includes("summary") && (
          <section className="card-break space-y-6">
            <h3 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">1. Executive Score Summary</h3>
            
            {/* Overall Score Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50 p-6 rounded-xl border border-slate-100">
              {project.auditType === "MIGRATION" && (
                <div className="flex flex-col items-center justify-center border-r border-slate-200 pr-4">
                  <div className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-2">Pre-Migration Score (OLD)</div>
                  <div className="text-6xl font-black text-indigo-600">{oldScores.overall}%</div>
                  <p className="text-[11px] text-slate-400 mt-2 text-center font-normal">Score based on {oldPages.length} scanned pages on the old domain.</p>
                </div>
              )}
              <div className="flex flex-col items-center justify-center col-span-1">
                <div className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-2">
                  {project.auditType === "MIGRATION" ? "Post-Migration Score (NEW)" : "Website Audit Score"}
                </div>
                <div className="text-6xl font-black text-emerald-600">{newScores.overall}%</div>
                <p className="text-[11px] text-slate-400 mt-2 text-center font-normal">Score based on {newPages.length} scanned pages on the target domain.</p>
              </div>
            </div>

            {/* Score Breakdowns */}
            <div>
              <h4 className="text-sm font-bold text-slate-800 mb-3">Scores by Category</h4>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(newScores.categories).map(([cat, score]) => {
                  const oldScore = project.auditType === "MIGRATION" ? (oldScores.categories as any)[cat] : null;
                  return (
                    <div key={cat} className="p-3 border border-slate-100 rounded-lg bg-slate-50/50 flex justify-between items-center">
                      <span className="text-xs text-slate-600 font-medium">{cat}</span>
                      <div className="flex items-center gap-2">
                        {oldScore !== null && (
                          <span className="text-[10px] text-slate-400 line-through">({oldScore}%)</span>
                        )}
                        <span className={`text-xs font-bold ${score >= 90 ? "text-green-600" : score >= 70 ? "text-amber-600" : "text-rose-600"}`}>
                          {score}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* SECTION: Issues Log */}
        {activeSections.includes("issues") && (
          <section className="page-break space-y-6">
            <h3 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">2. Prioritized Issues Log</h3>
            
            {project.issues.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No SEO issues detected on the audited pages.</p>
            ) : (
              <div className="space-y-4">
                {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => {
                  const sevIssues = project.issues.filter((i) => i.severity === sev);
                  if (sevIssues.length === 0) return null;

                  return (
                    <div key={sev} className="card-break space-y-2">
                      <h4 className={`text-xs font-bold tracking-wide uppercase px-2 py-1 rounded w-max ${
                        sev === "CRITICAL" ? "bg-red-100 text-red-700" :
                        sev === "HIGH" ? "bg-orange-100 text-orange-700" :
                        sev === "MEDIUM" ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {sev} Severity ({sevIssues.length})
                      </h4>
                      <table className="w-full text-left text-xs border border-slate-200 divide-y divide-slate-200 rounded-lg overflow-hidden">
                        <thead className="bg-slate-50 text-slate-600 font-bold">
                          <tr>
                            <th className="px-3 py-2 w-1/4">Category & Title</th>
                            <th className="px-3 py-2 w-1/2">Description</th>
                            <th className="px-3 py-2 w-1/4">Page Path</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sevIssues.slice(0, 150).map((issue) => (
                            <tr key={issue.id} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2 font-semibold text-slate-900">
                                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{issue.category}</div>
                                {issue.title}
                              </td>
                              <td className="px-3 py-2 text-slate-600 leading-relaxed font-normal">{issue.description}</td>
                              <td className="px-3 py-2 text-slate-400 font-mono text-[10px] break-all">
                                {issue.page ? issue.page.url.replace(/^https?:\/\/[^\/]+/, "") || "/" : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {sevIssues.length > 150 && (
                        <div className="text-center text-[10px] text-slate-400 pt-1">
                          * Showing first 150 of {sevIssues.length} issues.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* SECTION: Migration Redirects Diff */}
        {activeSections.includes("migration") && project.auditType === "MIGRATION" && (
          <section className="page-break space-y-6">
            <h3 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">3. Migration Path Mapping Diff</h3>
            
            <table className="w-full text-left text-xs border border-slate-200 divide-y divide-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50 text-slate-600 font-bold">
                <tr>
                  <th className="px-3 py-2 w-1/3">Path</th>
                  <th className="px-3 py-2 w-1/2">Redirect Target (NEW)</th>
                  <th className="px-3 py-2 w-1/6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {oldPages.map((oldPage) => {
                  let path = "";
                  try { path = new URL(oldPage.url).pathname; } catch (e) {}
                  const newPage = newPages.find((p) => {
                    try { return new URL(p.url).pathname === path; } catch (e) { return false; }
                  });
                  const success = !!newPage;

                  return (
                    <tr key={oldPage.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-mono font-medium text-slate-800">{path || "/"}</td>
                      <td className="px-3 py-2 text-slate-500 font-mono text-[10px] truncate max-w-xs">{newPage?.url || "-"}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {success ? "MAPPED" : "MISSING 301"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        {/* SECTION: Outbound & Broken Links */}
        {activeSections.includes("links") && (
          <section className="page-break space-y-6">
            <h3 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">4. Outbound & Broken Links Report</h3>
            
            {(() => {
              const allOutbound: Array<{ pageUrl: string; destUrl: string; status: number }> = [];
              project.pages.forEach((page: any) => {
                let brokenList = [];
                try { brokenList = page.brokenLinks ? JSON.parse(page.brokenLinks) : []; } catch (e) {}
                brokenList.forEach((bl: any) => {
                  allOutbound.push({
                    pageUrl: page.url,
                    destUrl: bl.url,
                    status: bl.status,
                  });
                });
              });

              if (allOutbound.length === 0) {
                return <p className="text-sm text-slate-500 italic">No broken links or redirect chains detected.</p>;
              }

              return (
                <table className="w-full text-left text-xs border border-slate-200 divide-y divide-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-600 font-bold">
                    <tr>
                      <th className="px-3 py-2 w-1/3">Source Page Path</th>
                      <th className="px-3 py-2 w-1/2">Link Destination URL</th>
                      <th className="px-3 py-2 w-1/6 text-right">Response</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allOutbound.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-slate-800 break-all font-mono text-[10px]">
                          {item.pageUrl.replace(/^https?:\/\/[^\/]+/, "") || "/"}
                        </td>
                        <td className="px-3 py-2 text-slate-600 font-mono text-[10px] break-all">{item.destUrl}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.status >= 400 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {item.status >= 400 ? `BROKEN (${item.status})` : `REDIRECT (${item.status})`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </section>
        )}

        {/* SECTION: Image Optimization Checklist */}
        {activeSections.includes("images") && (
          <section className="page-break space-y-6">
            <h3 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">5. Image Alt Text Checklist</h3>
            
            {(() => {
              const allMissingAlt: Array<{ pageUrl: string; imgUrl: string }> = [];
              project.pages.forEach((page: any) => {
                let imgData = { missingAltSrcs: [] };
                try { imgData = page.images ? JSON.parse(page.images) : { missingAltSrcs: [] }; } catch (e) {}
                const missing = imgData.missingAltSrcs || [];
                missing.forEach((src: string) => {
                  allMissingAlt.push({
                    pageUrl: page.url,
                    imgUrl: src,
                  });
                });
              });

              if (allMissingAlt.length === 0) {
                return <p className="text-sm text-slate-500 italic">All audited images have descriptive alt texts. 100% complete!</p>;
              }

              return (
                <table className="w-full text-left text-xs border border-slate-200 divide-y divide-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-600 font-bold">
                    <tr>
                      <th className="px-3 py-2 w-1/3">Page URL Path</th>
                      <th className="px-3 py-2 w-2/3">Image Source URL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allMissingAlt.slice(0, 100).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-slate-800 break-all font-mono text-[10px]">
                          {item.pageUrl.replace(/^https?:\/\/[^\/]+/, "") || "/"}
                        </td>
                        <td className="px-3 py-2 text-slate-500 font-mono text-[10px] break-all">{item.imgUrl}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </section>
        )}

        {/* SECTION: Missing Meta Data */}
        {activeSections.includes("missingMeta") && (
          <section className="page-break space-y-6">
            <h3 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">6. Pages with Missing Meta Data</h3>
            
            {(() => {
              const missingPages = project.pages.filter((page: any) => {
                let metadata = { title: "", description: "", canonical: "" };
                try { if (page.metadata) metadata = JSON.parse(page.metadata); } catch (e) {}
                return (
                  !metadata.title || metadata.title.trim() === "" ||
                  !metadata.description || metadata.description.trim() === "" ||
                  !metadata.canonical || metadata.canonical.trim() === ""
                );
              });

              if (missingPages.length === 0) {
                return <p className="text-sm text-slate-500 italic">All audited pages have complete metadata tags. 100% complete!</p>;
              }

              return (
                <table className="w-full text-left text-xs border border-slate-200 divide-y divide-slate-200 rounded-lg overflow-hidden font-normal">
                  <thead className="bg-slate-50 text-slate-600 font-bold">
                    <tr>
                      <th className="px-3 py-2 w-1/4">Page Path</th>
                      <th className="px-3 py-2 w-1/4">Meta Title</th>
                      <th className="px-3 py-2 w-1/3">Meta Description</th>
                      <th className="px-3 py-2 w-1/6 text-right">Canonical</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {missingPages.map((page: any) => {
                      let metadata = { title: "", description: "", canonical: "" };
                      try { if (page.metadata) metadata = JSON.parse(page.metadata); } catch (e) {}

                      return (
                        <tr key={page.id} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-mono text-[10px] break-all font-medium">
                            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{page.siteType}</div>
                            {page.url.replace(/^https?:\/\/[^\/]+/, "") || "/"}
                          </td>
                          <td className="px-3 py-2 leading-relaxed">
                            {metadata.title ? (
                              <span className="text-slate-700 font-normal">{metadata.title}</span>
                            ) : (
                              <span className="text-red-600 font-semibold uppercase tracking-wider text-[9px] bg-red-50 px-1 py-0.5 rounded">MISSING</span>
                            )}
                          </td>
                          <td className="px-3 py-2 leading-relaxed font-normal">
                            {metadata.description ? (
                              <span className="text-slate-600 font-normal">{metadata.description}</span>
                            ) : (
                              <span className="text-red-600 font-semibold uppercase tracking-wider text-[9px] bg-red-50 px-1 py-0.5 rounded">MISSING</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {metadata.canonical ? (
                              <span className="text-green-700 font-medium">OK</span>
                            ) : (
                              <span className="text-red-600 font-semibold uppercase tracking-wider text-[9px] bg-red-50 px-1.5 py-0.5 rounded">MISSING</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              );
            })()}
          </section>
        )}

        {/* SECTION: Broken Pages / 404 Errors */}
        {activeSections.includes("brokenPages") && (
          <section className="page-break space-y-6">
            <h3 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">7. Pages with 404 / Crawl Errors</h3>
            
            {(() => {
              const errorPages = project.pages.filter((page: any) => page.crawlStatus === "ERROR");

              if (errorPages.length === 0) {
                return <p className="text-sm text-slate-500 italic">No page crawl errors or 404 broken pages detected on the website.</p>;
              }

              return (
                <table className="w-full text-left text-xs border border-slate-200 divide-y divide-slate-200 rounded-lg overflow-hidden font-normal">
                  <thead className="bg-slate-50 text-slate-600 font-bold">
                    <tr>
                      <th className="px-3 py-2 w-1/3">Broken Page URL</th>
                      <th className="px-3 py-2 w-1/6">Site Type</th>
                      <th className="px-3 py-2 w-1/6">Crawl Status</th>
                      <th className="px-3 py-2 w-1/3 text-right">Error Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {errorPages.map((page: any) => {
                      let errorDetails = "Crawl failed";
                      try {
                        if (page.metadata) {
                          const meta = JSON.parse(page.metadata);
                          if (meta.error) errorDetails = meta.error;
                        }
                      } catch (e) {}

                      return (
                        <tr key={page.id} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-mono text-[10px] break-all font-medium text-red-600">
                            {page.url}
                          </td>
                          <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">{page.siteType}</td>
                          <td className="px-3 py-2">
                            <span className="bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded text-[10px]">
                              {page.crawlStatus}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600 font-mono text-[10px] break-all font-normal">
                            {errorDetails}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              );
            })()}
          </section>
        )}

        {/* Footer */}
        <footer className="pt-8 border-t border-slate-200 text-center text-xs text-slate-400">
          Generated automatically by SEO Dashboard Crawler engine. &copy; {new Date().getFullYear()}. All Rights Reserved.
        </footer>
      </div>

      {/* Auto-print script */}
      <script dangerouslySetInnerHTML={{ __html: `
        // Auto trigger browser print after render
        window.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => {
            window.print();
          }, 800);
        });
      `}} />
    </div>
  );
}
