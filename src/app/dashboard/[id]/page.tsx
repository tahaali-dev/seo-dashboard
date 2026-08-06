import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import CrawlerClient from './CrawlerClient'

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' })
const prisma = new PrismaClient({ adapter })

export default async function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const project = await prisma.project.findUnique({ 
    where: { id },
    include: { pages: true, issues: { include: { page: true } } }
  })

  if (!project) {
    return <div>Project not found</div>
  }

  const N = project.pages.length || 1

  // Calculate scores
  const getScoreForCategory = (cat: string) => {
    const issuesInCat = project.issues.filter((i: any) => i.category === cat)
    const distinctPagesWithIssue = new Set(issuesInCat.filter((i:any) => i.pageId).map((i:any) => i.pageId)).size
    const missingRedirects = issuesInCat.filter((i:any) => !i.pageId).length // usually server redirects have no new page mapped, wait they have old pageId
    // Actually all issues have a pageId, so just size of Set
    const totalProblemPages = new Set(issuesInCat.map((i:any) => i.pageId)).size
    return Math.max(0, Math.round(100 * (N - totalProblemPages) / N))
  }

  const scores = {
    categories: {
      'Meta data': getScoreForCategory('Meta data'),
      'Page structure': getScoreForCategory('Page structure'),
      'Server': getScoreForCategory('Server'),
      'Page quality': getScoreForCategory('Page quality'),
      'Links': getScoreForCategory('Links'),
      'External factors': getScoreForCategory('External factors')
    },
    overall: 0
  }
  
  scores.overall = Math.round(Object.values(scores.categories).reduce((a, b) => a + b, 0) / 6)

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-end border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{project.name}</h1>
            <p className="text-slate-400">Dashboard & Crawl Engine</p>
          </div>
          <div className="text-sm text-slate-500">
            Created: {project.createdAt.toLocaleDateString()}
          </div>
        </header>

        <CrawlerClient project={project} initialPages={project.pages} issues={project.issues} scores={scores} />
      </div>
    </div>
  )
}
