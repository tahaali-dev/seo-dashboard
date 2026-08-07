import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { cookies } from "next/headers"
import PasswordForm from "./PasswordForm"
import ShareClient from "./ShareClient"

export const dynamic = "force-dynamic"

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      pages: true,
      issues: {
        include: {
          page: { select: { url: true, siteType: true } }
        }
      }
    }
  })

  if (!project || !project.isShared) {
    notFound()
  }

  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`share_auth_${id}`)

  if (!authCookie || authCookie.value !== "true") {
    return <PasswordForm projectId={project.id} projectName={project.name} />
  }

  const oldPages = project.pages.filter((p: any) => p.siteType === "OLD")
  const newPages = project.pages.filter((p: any) => p.siteType === "NEW")
  const oldN = oldPages.length || 1
  const newN = newPages.length || 1

  const getScoreForCategory = (cat: string, siteType: string, N: number) => {
    const issuesInCat = project.issues.filter(
      (i: any) => i.category === cat && i.page?.siteType === siteType,
    )
    const totalProblemPages = new Set(issuesInCat.map((i: any) => i.pageId)).size
    return Math.max(0, Math.round((100 * (N - totalProblemPages)) / N))
  }

  const computeScores = (siteType: string, N: number) => {
    const categories = {
      "Meta data": getScoreForCategory("Meta data", siteType, N),
      "Page structure": getScoreForCategory("Page structure", siteType, N),
      Server: getScoreForCategory("Server", siteType, N),
      "Page quality": getScoreForCategory("Page quality", siteType, N),
      Links: getScoreForCategory("Links", siteType, N),
      "External factors": getScoreForCategory("External factors", siteType, N),
    }
    const overall = Math.round(Object.values(categories).reduce((a, b) => a + b, 0) / 6)
    return { categories, overall }
  }

  const oldScores = computeScores("OLD", oldN)
  const newScores = computeScores("NEW", newN)

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-end border-b border-slate-800 pb-6 relative">
          <div className="pt-2">
            <h1 className="text-3xl font-bold text-white mb-2">
              {project.name}
            </h1>
            <p className="text-slate-400">SEO Audit Report (Shared View)</p>
          </div>
          <div className="text-sm text-slate-500">
            Generated: {project.createdAt.toLocaleDateString()}
          </div>
        </header>

        <ShareClient
          project={project}
          pages={project.pages}
          issues={project.issues}
          oldScores={oldScores}
          newScores={newScores}
        />
      </div>
    </div>
  )
}
