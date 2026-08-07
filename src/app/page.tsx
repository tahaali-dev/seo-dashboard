import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DeleteProjectButton from "./DeleteProjectButton";

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
    <div className="min-h-screen bg-slate-900 text-slate-200 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-end border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Audited Websites
            </h1>
            <p className="text-slate-400">
              View and manage all your SEO audits and migrations.
            </p>
          </div>
          <div>
            <Link
              href="/new"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
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
            </Link>
          </div>
        </header>

        {projects.length === 0 ? (
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-700">
              <svg
                className="w-8 h-8 text-slate-500"
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
            <h2 className="text-xl font-semibold text-white mb-2">
              No projects yet
            </h2>
            <p className="text-slate-400 max-w-md mb-6">
              You haven't run any SEO audits or migrations yet. Create your
              first project to get started.
            </p>
            <Link
              href="/new"
              className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              Create Project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group relative bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700 hover:border-indigo-500/50 rounded-xl p-6 transition-all shadow-sm hover:shadow-indigo-500/10 flex flex-col"
              >
                <Link
                  href={`/dashboard/${project.id}`}
                  className="absolute inset-0 z-0"
                />
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {project.name}
                    </h2>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${project.auditType === "FRESH" ? "bg-emerald-500/20 text-emerald-400" : "bg-indigo-500/20 text-indigo-400"}`}
                    >
                      {project.auditType}
                    </span>
                  </div>
                  <DeleteProjectButton id={project.id} />
                </div>

                <div className="space-y-2 mb-6 flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Target URL</span>
                    <span
                      className="text-slate-300 truncate max-w-37.5"
                      title={project.newWebsite}
                    >
                      {project.newWebsite.replace(/^https?:\/\//, "")}
                    </span>
                  </div>
                  {project.auditType === "MIGRATION" && project.oldWebsite && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Old URL</span>
                      <span
                        className="text-slate-300 truncate max-w-37.5"
                        title={project.oldWebsite}
                      >
                        {project.oldWebsite.replace(/^https?:\/\//, "")}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                        Pages
                      </span>
                      <span className="text-slate-300 font-medium">
                        {project._count.pages}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                        Issues
                      </span>
                      <span className="text-slate-300 font-medium">
                        {project._count.issues}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
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
      </div>
    </div>
  );
}
