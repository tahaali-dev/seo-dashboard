'use client'

import { useState } from 'react'

export default function CrawlerClient({ project, initialPages }: { project: any, initialPages: any[] }) {
  const [pages, setPages] = useState(initialPages)
  const [isParsing, setIsParsing] = useState(false)
  const [isCrawling, setIsCrawling] = useState(false)
  const [crawlProgress, setCrawlProgress] = useState(0)

  const handleParseSitemaps = async () => {
    setIsParsing(true)
    try {
      const res = await fetch('/api/sitemap/parse', {
        method: 'POST',
        body: JSON.stringify({ projectId: project.id })
      })
      const data = await res.json()
      if (data.success) {
        alert(`Parsed ${data.oldCount} old URLs and ${data.newCount} new URLs! Refresh the page to see them.`)
      }
    } catch (err) {
      console.error(err)
    }
    setIsParsing(false)
  }

  const handleStartCrawl = async () => {
    setIsCrawling(true)
    const pendingPages = pages.filter(p => p.crawlStatus === 'PENDING')
    
    let completed = 0
    const CONCURRENCY = 5
    const pool = new Set<Promise<any>>()

    for (const page of pendingPages) {
      const promise = fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: page.id })
      })
      .then(res => res.json())
      .then(data => {
        // Update local state live as they finish
        setPages(prev => prev.map(p => 
          p.id === page.id 
            ? { ...p, crawlStatus: data.success ? 'SUCCESS' : 'ERROR', seoScore: data.seoScore || null } 
            : p
        ))
      })
      .catch(err => {
        console.error(`Failed to crawl ${page.url}`, err)
      })
      .finally(() => {
        completed++
        setCrawlProgress((completed / pendingPages.length) * 100)
        pool.delete(promise)
      })

      pool.add(promise)

      if (pool.size >= CONCURRENCY) {
        await Promise.race(pool)
      }
    }
    
    await Promise.all(pool)
    alert('Crawling complete! We are now ready to generate Issues.')
    setIsCrawling(false)
  }

  const pendingCount = pages.filter(p => p.crawlStatus === 'PENDING').length
  const successCount = pages.filter(p => p.crawlStatus === 'SUCCESS').length
  const oldPages = pages.filter(p => p.siteType === 'OLD')
  const newPages = pages.filter(p => p.siteType === 'NEW')

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
          <h3 className="text-slate-400 font-medium mb-1">Total Pages Detected</h3>
          <p className="text-3xl font-bold text-white">{pages.length}</p>
        </div>
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
          <h3 className="text-slate-400 font-medium mb-1">Old Site Pages</h3>
          <p className="text-3xl font-bold text-indigo-400">{oldPages.length}</p>
        </div>
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
          <h3 className="text-slate-400 font-medium mb-1">New Site Pages</h3>
          <p className="text-3xl font-bold text-emerald-400">{newPages.length}</p>
        </div>
      </div>

      <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700">
        <h2 className="text-xl font-semibold text-white mb-4">Crawler Controls</h2>
        
        <div className="flex gap-4">
          <button 
            onClick={handleParseSitemaps}
            disabled={isParsing}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            {isParsing ? 'Parsing Sitemaps...' : '1. Parse Sitemaps'}
          </button>
          
          <button 
            onClick={handleStartCrawl}
            disabled={isCrawling || pendingCount === 0}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            {isCrawling ? `Crawling (${Math.round(crawlProgress)}%)` : `2. Crawl Pending Pages (${pendingCount})`}
          </button>
        </div>

        {isCrawling && (
          <div className="mt-6">
            <div className="w-full bg-slate-700 rounded-full h-2.5">
              <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${crawlProgress}%` }}></div>
            </div>
            <p className="text-sm text-slate-400 mt-2 text-right">{Math.round(crawlProgress)}% Complete</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Crawled Pages Preview</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-400">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">URL</th>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 rounded-tr-lg">SEO Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pages.slice(0, 10).map(page => (
                <tr key={page.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-slate-300 truncate max-w-xs">{page.url}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${page.siteType === 'OLD' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                      {page.siteType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${page.crawlStatus === 'SUCCESS' ? 'bg-green-500/20 text-green-400' : page.crawlStatus === 'ERROR' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {page.crawlStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {page.seoScore !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-700 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${page.seoScore > 80 ? 'bg-green-500' : page.seoScore > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${page.seoScore}%` }}></div>
                        </div>
                        <span className="text-slate-300 font-medium">{page.seoScore}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pages.length > 10 && (
            <div className="text-center p-4 text-sm text-slate-500">
              Showing 10 of {pages.length} pages
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
