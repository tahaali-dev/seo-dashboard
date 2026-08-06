import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import CrawlerClient from './CrawlerClient'

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' })
const prisma = new PrismaClient({ adapter })

export default async function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const project = await prisma.project.findUnique({ 
    where: { id },
    include: { pages: true }
  })

  if (!project) {
    return <div>Project not found</div>
  }

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

        <CrawlerClient project={project} initialPages={project.pages} />
      </div>
    </div>
  )
}
