import { prisma } from "@/lib/prisma";
import CrawlerClient from "./CrawlerClient";
import { Container } from "@/components/ui/layout/container";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
    return (
      <div className="min-h-screen bg-background py-16 flex items-center justify-center">
        <h2 className="h4 text-foreground dark:text-white">Project not found</h2>
      </div>
    );
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
    <div className="min-h-screen bg-background py-12 md:py-16 transition-colors">
      <Container className="space-y-12">
        <header className="flex flex-col md:flex-row justify-between md:items-end gap-6 border-b border-black/10 dark:border-white/10 pb-6 relative">
          <div className="absolute -top-6 left-0 flex items-center gap-4">
            <a
              href="/"
              className="text-black-60 dark:text-white/60 hover:text-black-main text-[13px] font-semibold tracking-wide uppercase flex items-center gap-1 transition-colors"
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
            <span className="text-black-20">|</span>
            <a
              href="/new"
              className="text-[#E80C08] hover:text-[#920403] text-[13px] font-semibold tracking-wide uppercase flex items-center gap-1 transition-colors"
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
            <h1 className="h1 text-foreground dark:text-white mb-2">
              {project.name}
            </h1>
            <p className="text-b2 text-black-60 dark:text-white/60">Dashboard & Crawl Engine</p>
          </div>
          <div className="flex items-center gap-4 text-[13px] font-medium text-black-40 dark:text-white/40 pb-2">
            Created: {project.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            <ThemeToggle />
          </div>
        </header>

        <CrawlerClient
          project={project}
          initialPages={project.pages}
          initialIssues={project.issues}
          oldScores={oldScores}
          newScores={newScores}
        />
      </Container>
    </div>
  );
}
