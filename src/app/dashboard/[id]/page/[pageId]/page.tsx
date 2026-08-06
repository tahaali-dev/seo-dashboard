import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import SEOScoreWidget from '../../SEOScoreWidget'
import Link from 'next/link'
import { ArrowLeftIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/solid'

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' })
const prisma = new PrismaClient({ adapter })

export default async function PageReport({ params }: { params: Promise<{ id: string, pageId: string }> }) {
  const { id, pageId } = await params

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    include: { issues: true }
  })

  if (!page) return <div>Page not found</div>

  let metadata: any = {}, headings: any = {}, links: any = {}, images: any = {}, keywords: any = [], brokenLinks: any = []
  try {
    if (page.metadata) metadata = JSON.parse(page.metadata)
    if (page.headings) headings = JSON.parse(page.headings)
    if (page.links) links = JSON.parse(page.links)
    if (page.images) images = JSON.parse(page.images)
    if (page.keywords) keywords = JSON.parse(page.keywords)
    if (page.brokenLinks) brokenLinks = JSON.parse(page.brokenLinks)
  } catch (e) {}

  // Scoring logic for this page
  const issues = page.issues
  
  const getCategoryScore = (cat: string) => {
    const catIssues = issues.filter(i => i.category === cat)
    let penalty = 0
    catIssues.forEach(i => {
      if (i.severity === 'CRITICAL') penalty += 20
      else if (i.severity === 'HIGH') penalty += 10
      else if (i.severity === 'MEDIUM') penalty += 5
      else if (i.severity === 'LOW') penalty += 2
    })
    return Math.max(0, 100 - penalty)
  }

  const scores = {
    categories: {
      'Meta data': getCategoryScore('Meta data'),
      'Page structure': getCategoryScore('Page structure'),
      'Server': getCategoryScore('Server'),
      'Page quality': getCategoryScore('Page quality'),
      'Links': getCategoryScore('Links'),
      'External factors': getCategoryScore('External factors')
    },
    overall: 0
  }
  scores.overall = Math.round(Object.values(scores.categories).reduce((a, b) => a + b, 0) / 6)

  const renderIssueBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <span className="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded text-[10px] font-bold">CRITICAL</span>
      case 'HIGH': return <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded text-[10px] font-bold">HIGH</span>
      case 'MEDIUM': return <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-[10px] font-bold">MEDIUM</span>
      case 'LOW': return <span className="bg-slate-500/20 text-slate-400 px-2 py-0.5 rounded text-[10px] font-bold">LOW</span>
      default: return null
    }
  }

  const renderDataRow = (label: string, value: any, cat: string) => {
    const relevantIssues = issues.filter(i => i.category === cat && i.description.toLowerCase().includes(label.toLowerCase().split(' ')[0]))
    const hasIssue = relevantIssues.length > 0
    return (
      <div className="flex flex-col sm:flex-row sm:items-start py-4 border-b border-slate-700/50 gap-4">
        <div className="w-full sm:w-1/3 flex items-center gap-2">
          {hasIssue ? <XCircleIcon className="w-5 h-5 text-rose-400" /> : <CheckCircleIcon className="w-5 h-5 text-emerald-400" />}
          <span className="font-medium text-slate-300">{label}</span>
        </div>
        <div className="w-full sm:w-2/3">
          <div className="text-white break-words mb-2">{value || <span className="text-slate-500 italic">None</span>}</div>
          {relevantIssues.map(i => (
            <div key={i.id} className="flex items-center gap-2 mt-2 bg-slate-900/50 p-2 rounded-lg border border-rose-500/20">
              {renderIssueBadge(i.severity)}
              <span className="text-sm text-slate-300">{i.title} - {i.description}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
          <Link href={`/dashboard/${id}`} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeftIcon className="w-6 h-6" />
          </Link>
          <div className="flex-1 overflow-hidden">
            <h1 className="text-2xl font-bold text-white truncate">{page.url}</h1>
            <p className="text-slate-400">Site: {page.siteType} | Status: {page.crawlStatus}</p>
          </div>
        </div>

        {/* Score Widget */}
        <SEOScoreWidget scores={scores} />

        {/* Deep Dive Reports */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white mb-4">Detailed Analysis</h2>
          
          {/* Meta Data */}
          <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              Meta Data <span className="text-sm font-normal text-slate-400">({scores.categories['Meta data']}%)</span>
            </h3>
            <div className="flex flex-col">
              {renderDataRow('Title', metadata.title, 'Meta data')}
              {renderDataRow('Description', metadata.description, 'Meta data')}
            </div>
          </div>

          {/* Page Structure */}
          <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              Page Structure <span className="text-sm font-normal text-slate-400">({scores.categories['Page structure']}%)</span>
            </h3>
            <div className="flex flex-col">
              {renderDataRow('H1 Tags', headings.h1?.join(' | '), 'Page structure')}
              {renderDataRow('H2 Count', headings.h2Count, 'Page structure')}
              {renderDataRow('Images missing Alt', 
                images.missingAltSrcs && images.missingAltSrcs.length > 0 ? (
                  <div className="space-y-1">
                    <span className="text-rose-400 font-semibold">{images.missingAlt} broken images found:</span>
                    <ul className="list-disc pl-4 text-xs text-slate-400">
                      {images.missingAltSrcs.map((src: string, idx: number) => {
                        let fullUrl = src
                        try {
                          fullUrl = src.startsWith('http') ? src : new URL(src, page.url).href
                        } catch(e) {}
                        return (
                          <li key={idx} className="truncate max-w-md" title={src}>
                            <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-indigo-400 hover:text-indigo-300 transition-colors">
                              {src}
                            </a>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ) : images.missingAlt, 
                'Page structure')}
              {renderDataRow('Canonical', metadata.canonical, 'Page structure')}
              {renderDataRow('Schema', page.schema, 'Page structure')}
            </div>
          </div>

          {/* Content & Keywords */}
          <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              Content & Keywords
            </h3>
            
            {keywords.length > 0 && (
              <div className="mb-6">
                <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider block mb-3">Top Keyword Density (TF-IDF)</span>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((kw: any, idx: number) => (
                    <div key={idx} className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm group hover:border-indigo-500/50 transition-colors">
                      <span className="font-semibold text-slate-200">{kw.word}</span>
                      <span className="text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{kw.count}</span>
                      <span className={`text-xs font-bold ${parseFloat(kw.density) > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>{kw.density}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col border-t border-slate-700/50 pt-2">
              {renderDataRow('Word Count', metadata.wordCount, 'Page quality')}
              {renderDataRow('HTML Size', metadata.htmlSize ? `${Math.round(metadata.htmlSize / 1024)} KB` : 'N/A', 'Page quality')}
            </div>
          </div>

          {/* Links */}
          <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              Links <span className="text-sm font-normal text-slate-400">({scores.categories['Links']}%)</span>
            </h3>
            
            {brokenLinks.length > 0 && (
              <div className="mb-6 bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider block mb-3">Broken & Redirecting Outbound Links</span>
                <ul className="space-y-2">
                  {brokenLinks.map((bl: any, idx: number) => {
                    const isDead = bl.status >= 400 || bl.status === 500
                    return (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        {isDead ? <XCircleIcon className="w-5 h-5 text-rose-400 flex-shrink-0" /> : <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <span className={`font-mono text-xs mr-2 px-1.5 py-0.5 rounded ${isDead ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {bl.status === 500 ? 'ERR' : bl.status}
                          </span>
                          <span className="text-slate-300 break-all">{bl.url}</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            <div className="flex flex-col border-t border-slate-700/50 pt-2">
              {renderDataRow('Internal Links', links.internal, 'Links')}
              {renderDataRow('External Links', links.external, 'Links')}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  )
}
