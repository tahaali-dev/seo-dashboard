import { prisma } from "@/lib/prisma";
import CrawlerClient from "./CrawlerClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { pages: true, issues: { include: { page: true } } },
  });

  if (!project) {
    return <div>Project not found</div>;
  }

  const oldPages = project.pages.filter((p: any) => p.siteType === "OLD");
  const newPages = project.pages.filter((p: any) => p.siteType === "NEW");
  const oldN = oldPages.length || 1;
  const newN = newPages.length || 1;

  const getScoreForCategory = (cat: string, siteType: string, N: number) => {
    const issuesInCat = project.issues.filter(
      (i: any) => i.category === cat && i.page?.siteType === siteType,
    );
    const totalProblemPages = new Set(issuesInCat.map((i: any) => i.pageId))
      .size;
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
    <div className="min-h-screen bg-slate-900 text-slate-200 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-end border-b border-slate-800 pb-6 relative">
          <div className="absolute -top-4 left-0 flex items-center gap-4">
            <a
              href="/"
              className="text-slate-400 hover:text-white text-sm font-medium flex items-center gap-1 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              All Projects
            </a>
            <span className="text-slate-700">|</span>
            <a
              href="/new"
              className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center gap-1 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Audit
            </a>
          </div>
          <div className="pt-6">
            <h1 className="text-3xl font-bold text-white mb-2">
              {project.name}
            </h1>
            <p className="text-slate-400">Dashboard & Crawl Engine</p>
          </div>
          <div className="text-sm text-slate-500">
            Created: {project.createdAt.toLocaleDateString()}
          </div>
        </header>

        <CrawlerClient
          project={project}
          initialPages={project.pages}
          issues={project.issues}
          oldScores={oldScores}
          newScores={newScores}
        />
      </div>
    </div>
  );
}
