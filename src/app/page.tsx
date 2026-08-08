import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DeleteProjectButton from "./DeleteProjectButton";
import { Container } from "@/components/ui/layout/container";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const dynamic = "force-dynamic";

export default async function ProjectsList() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { pages: true, issues: true },
      },
    },
  });

  return (
    <div className="min-h-screen bg-background py-12 md:py-16 transition-colors">
      <Container className="space-y-12">
        <header className="flex flex-col md:flex-row justify-between md:items-end gap-6 border-b border-black/10 dark:border-white/10 pb-6">
          <div>
            <h1 className="h1 text-foreground dark:text-white mb-2">
              Audited Websites
            </h1>
            <p className="text-b2 text-black-60 dark:text-white/60">
              View and manage all your SEO audits and migrations.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/new"
              className="bg-[#E80C08] hover:bg-[#920403] text-white px-6 py-3 rounded-lg text-b4 font-semibold transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
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
            </Link>
          </div>
        </header>

        {projects.length === 0 ? (
          <div className="bg-white dark:bg-[#1E1E1E] border border-black/10 dark:border-white/10 rounded-2xl p-16 text-center flex flex-col items-center shadow-sm">
            <div className="w-20 h-20 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
              <svg
                className="w-10 h-10 text-black/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h2 className="h4 text-foreground dark:text-white mb-3">
              No projects yet
            </h2>
            <p className="text-b3 text-black-60 dark:text-white/60 max-w-md mb-8">
              You haven't run any SEO audits or migrations yet. Create your
              first project to get started.
            </p>
            <Link
              href="/new"
              className="bg-black-main hover:bg-black/80 text-white px-8 py-3.5 rounded-lg font-semibold transition-colors text-b4"
            >
              Create Project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group relative bg-white dark:bg-[#1E1E1E] hover:bg-white dark:bg-[#1A1A1A] border border-black/10 dark:border-white/10 hover:border-black/30 rounded-2xl p-8 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex flex-col"
              >
                <Link
                  href={`/dashboard/${project.id}`}
                  className="absolute inset-0 z-0"
                />
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="flex flex-col gap-2">
                    <h2 className="h5 text-foreground dark:text-white group-hover:text-[#E80C08] transition-colors line-clamp-1">
                      {project.name}
                    </h2>
                    <div>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${project.auditType === "FRESH" ? "bg-black/5 dark:bg-white/5 text-black-main border border-black/10 dark:border-white/10" : "bg-[#FFF5F5] text-[#E80C08] border border-[#E80C08]/20"}`}
                      >
                        {project.auditType}
                      </span>
                    </div>
                  </div>
                  <DeleteProjectButton id={project.id} />
                </div>

                <div className="space-y-3 mb-8 flex-1">
                  <div className="flex flex-col text-sm">
                    <span className="text-black-60 dark:text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Target URL</span>
                    <span
                      className="text-foreground dark:text-white font-medium truncate"
                      title={project.newWebsite}
                    >
                      {project.newWebsite.replace(/^https?:\/\//, "")}
                    </span>
                  </div>
                  {project.auditType === "MIGRATION" && project.oldWebsite && (
                    <div className="flex flex-col text-sm pt-2">
                      <span className="text-black-60 dark:text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Old URL</span>
                      <span
                        className="text-foreground dark:text-white font-medium truncate"
                        title={project.oldWebsite}
                      >
                        {project.oldWebsite.replace(/^https?:\/\//, "")}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-5 border-t border-black/10 dark:border-white/10">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-black-40 dark:text-white/40 uppercase tracking-widest font-semibold mb-0.5">
                        Pages
                      </span>
                      <span className="text-foreground dark:text-white font-bold">
                        {project._count.pages}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-black-40 dark:text-white/40 uppercase tracking-widest font-semibold mb-0.5">
                        Issues
                      </span>
                      <span className="text-foreground dark:text-white font-bold">
                        {project._count.issues}
                      </span>
                    </div>
                  </div>
                  <div className="text-[13px] font-medium text-black-40 dark:text-white/40">
                    {project.createdAt.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
