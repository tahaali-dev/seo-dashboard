import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import Link from 'next/link'
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid'

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' })
const prisma = new PrismaClient({ adapter })

function calculateScore(page: any) {
  if (!page || !page.issues) return 0
  const issues = page.issues
  let penalty = 0
  issues.forEach((i: any) => {
    if (i.severity === 'CRITICAL') penalty += 20
    else if (i.severity === 'HIGH') penalty += 10
    else if (i.severity === 'MEDIUM') penalty += 5
    else if (i.severity === 'LOW') penalty += 2
  })
  return Math.max(0, 100 - penalty)
}

function safeParse(str: string | null) {
  if (!str) return {}
  try { return JSON.parse(str) } catch { return {} }
}

export default async function DiffReport({ params }: { params: Promise<{ id: string, oldId: string, newId: string }> }) {
  const { id, oldId, newId } = await params

  const oldPage = await prisma.page.findUnique({ where: { id: oldId }, include: { issues: true } })
  const newPage = await prisma.page.findUnique({ where: { id: newId }, include: { issues: true } })

  if (!oldPage || !newPage) return <div>Pages not found</div>

  const oldScore = calculateScore(oldPage)
  const newScore = calculateScore(newPage)
  const scoreDiff = newScore - oldScore

  const oldMeta = safeParse(oldPage.metadata)
  const newMeta = safeParse(newPage.metadata)
  const oldHead = safeParse(oldPage.headings)
  const newHead = safeParse(newPage.headings)
  const oldImg = safeParse(oldPage.images)
  const newImg = safeParse(newPage.images)
  const oldLinks = safeParse(oldPage.links)
  const newLinks = safeParse(newPage.links)

  const renderMetricDiff = (label: string, oldVal: any, newVal: any, type: 'higher' | 'lower' | 'match') => {
    let oldNum = Number(oldVal) || 0
    let newNum = Number(newVal) || 0
    let isPositive = false
    let isNegative = false
    
    if (type === 'higher') {
      isPositive = newNum > oldNum
      isNegative = newNum < oldNum
    } else if (type === 'lower') {
      isPositive = newNum < oldNum
      isNegative = newNum > oldNum
    } else if (type === 'match') {
      isPositive = oldVal === newVal
      isNegative = oldVal !== newVal
    }

    return (
      <div className="grid grid-cols-3 gap-4 py-3 border-b border-slate-700/50 items-center">
        <div className="text-slate-400 font-medium">{label}</div>
        <div className="text-slate-300 break-words pr-4 border-r border-slate-700/50">{oldVal || 'N/A'}</div>
        <div className={`break-words flex items-center gap-2 ${isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-slate-300'}`}>
          {newVal || 'N/A'}
          {isPositive && <CheckCircleIcon className="w-4 h-4 text-emerald-400" />}
          {isNegative && <XCircleIcon className="w-4 h-4 text-rose-400" />}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
          <Link href={`/dashboard/${id}`} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeftIcon className="w-6 h-6" />
          </Link>
          <div className="flex-1 overflow-hidden">
            <h1 className="text-2xl font-bold text-white truncate">Migration Diff Engine</h1>
            <p className="text-slate-400">Comparing identical URL paths between Old and New site.</p>
          </div>
        </div>

        {/* Score Summary */}
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex justify-between items-center">
          <div className="text-center flex-1 border-r border-slate-700">
            <div className="text-sm text-slate-400 uppercase tracking-widest mb-1">Old Site Score</div>
            <div className="text-4xl font-bold text-slate-300">{oldScore}%</div>
            <div className="text-xs text-indigo-400 mt-2 truncate px-4">{oldPage.url}</div>
          </div>
          
          <div className="flex-shrink-0 px-8 text-center">
            <div className={`text-2xl font-bold ${scoreDiff > 0 ? 'text-emerald-400' : scoreDiff < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff < 0 ? scoreDiff : 'No Change'}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">Impact</div>
          </div>

          <div className="text-center flex-1 border-l border-slate-700">
            <div className="text-sm text-slate-400 uppercase tracking-widest mb-1">New Site Score</div>
            <div className="text-4xl font-bold text-white">{newScore}%</div>
            <div className="text-xs text-emerald-400 mt-2 truncate px-4">{newPage.url}</div>
          </div>
        </div>

        {/* Side by Side Detailed Diff */}
        <div className="bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden">
          
          <div className="grid grid-cols-3 gap-4 bg-slate-800/80 p-4 border-b border-slate-700 font-semibold text-white tracking-wide">
            <div>Metric</div>
            <div className="text-indigo-300">OLD URL</div>
            <div className="text-emerald-300">NEW URL</div>
          </div>

          <div className="p-4 space-y-2">
            <h3 className="text-lg font-medium text-white mb-4 mt-2">Content & Quality</h3>
            {renderMetricDiff('Word Count', oldMeta.wordCount, newMeta.wordCount, 'higher')}
            {renderMetricDiff('HTML Size (Bytes)', oldMeta.htmlSize, newMeta.htmlSize, 'lower')}
            
            <h3 className="text-lg font-medium text-white mb-4 mt-8">Meta Data</h3>
            {renderMetricDiff('Title', oldMeta.title, newMeta.title, 'match')}
            {renderMetricDiff('Title Length', oldMeta.title?.length, newMeta.title?.length, 'match')}
            {renderMetricDiff('Description', oldMeta.description, newMeta.description, 'match')}
            {renderMetricDiff('Canonical', oldMeta.canonical, newMeta.canonical, 'match')}

            <h3 className="text-lg font-medium text-white mb-4 mt-8">Structure & Links</h3>
            {renderMetricDiff('H1 Tag', oldHead.h1?.[0], newHead.h1?.[0], 'match')}
            {renderMetricDiff('H2 Count', oldHead.h2Count, newHead.h2Count, 'higher')}
            {renderMetricDiff('Images Missing Alt', oldImg.missingAlt, newImg.missingAlt, 'lower')}
            {renderMetricDiff('Internal Links', oldLinks.internal, newLinks.internal, 'higher')}
            {renderMetricDiff('External Links', oldLinks.external, newLinks.external, 'higher')}
          </div>

        </div>

      </div>
    </div>
  )
}
