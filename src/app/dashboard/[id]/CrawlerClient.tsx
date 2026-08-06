'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import SEOScoreWidget from './SEOScoreWidget'
import IssuesTable from './IssuesTable'

export default function CrawlerClient({ project, initialPages, issues = [], scores }: { project: any, initialPages: any[], issues?: any[], scores?: any }) {
  const [pages, setPages] = useState(initialPages)
  const [activeTab, setActiveTab] = useState<'PAGES' | 'ISSUES' | 'DIFF'>('PAGES')
  const [siteFilter, setSiteFilter] = useState<'ALL' | 'OLD' | 'NEW'>('ALL')
  const [isParsing, setIsParsing] = useState(false)
  const [isCrawling, setIsCrawling] = useState(false)
  const [isAuditing, setIsAuditing] = useState(false)
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

  const handleRunAudit = async () => {
    setIsAuditing(true)
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id })
      })
      const data = await res.json()
      if (data.success) {
        alert(`SEO Audit Complete! Generated ${data.count} issues.`)
      } else {
        alert(`Audit failed: ${data.error}`)
      }
    } catch (err) {
      console.error(err)
      alert('Audit request failed.')
    }
    setIsAuditing(false)
  }

  const pendingCount = pages.filter(p => p.crawlStatus === 'PENDING').length
  const successCount = pages.filter(p => p.crawlStatus === 'SUCCESS').length
  const oldPages = pages.filter(p => p.siteType === 'OLD')
  const newPages = pages.filter(p => p.siteType === 'NEW')

  return (
    <div className="space-y-8">
      {/* Top Section: Dashboard Cards & Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 flex-1 flex flex-col justify-center">
            <h3 className="text-slate-400 font-medium mb-1 text-sm uppercase tracking-wider">Total Pages</h3>
            <p className="text-4xl font-bold text-white">{pages.length}</p>
          </div>
          <div className="bg-rose-900/20 p-6 rounded-xl border border-rose-500/20 flex-1 flex flex-col justify-center">
            <h3 className="text-rose-400/80 font-medium mb-1 text-sm uppercase tracking-wider">Critical Issues</h3>
            <p className="text-4xl font-bold text-rose-500">
              {issues?.filter(i => i.severity === 'CRITICAL').length || 0}
            </p>
          </div>
        </div>

        <div className="lg:col-span-3">
          {scores && <SEOScoreWidget scores={scores} />}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">Migration Controls</h2>
          <p className="text-sm text-slate-400 max-w-xl">
            Parse sitemaps to discover URLs, crawl them to extract metadata, and run the SEO audit to generate the scores above.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={handleParseSitemaps}
            disabled={isParsing}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm"
          >
            {isParsing ? 'Parsing...' : '1. Parse Sitemaps'}
          </button>
          
          <button 
            onClick={handleStartCrawl}
            disabled={isCrawling || pendingCount === 0}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm"
          >
            {isCrawling ? `Crawling (${Math.round(crawlProgress)}%)` : `2. Crawl (${pendingCount})`}
          </button>

          <button 
            onClick={handleRunAudit}
            disabled={isAuditing || isCrawling || isParsing}
            className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm"
          >
            {isAuditing ? 'Generating...' : '3. Run Audit'}
          </button>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/30 p-4 rounded-xl border border-slate-700">
        <div className="flex space-x-1 bg-slate-900 p-1 rounded-lg w-max border border-slate-700">
          <button
            onClick={() => setActiveTab('ISSUES')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'ISSUES' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Detected Issues ({issues?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('PAGES')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'PAGES' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Crawled Pages ({pages.length})
          </button>
          <button
            onClick={() => setActiveTab('DIFF')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'DIFF' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Migration Diff
          </button>
        </div>

        {activeTab === 'PAGES' && (
          <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-full border border-slate-700">
            <button onClick={() => setSiteFilter('ALL')} className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors ${siteFilter === 'ALL' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}>ALL</button>
            <button onClick={() => setSiteFilter('OLD')} className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors ${siteFilter === 'OLD' ? 'bg-slate-700 text-indigo-300' : 'text-slate-400 hover:text-white'}`}>OLD SITE</button>
            <button onClick={() => setSiteFilter('NEW')} className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors ${siteFilter === 'NEW' ? 'bg-slate-700 text-emerald-300' : 'text-slate-400 hover:text-white'}`}>NEW SITE</button>
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'ISSUES' && (
          <IssuesTable issues={issues || []} />
        )}
        
        {activeTab === 'PAGES' && (
          <div className="overflow-x-auto bg-slate-800/30 rounded-xl border border-slate-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">URL</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Site</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {pages
                  .filter(p => siteFilter === 'ALL' || p.siteType === siteFilter)
                  .slice(0, 50)
                  .map(page => {
                    let category = 'Core'
                    try {
                      const pathSegments = new URL(page.url).pathname.split('/').filter(Boolean)
                      if (pathSegments.length > 0) {
                        category = pathSegments[0].charAt(0).toUpperCase() + pathSegments[0].slice(1)
                      }
                    } catch(e) {}
                    
                  return (
                    <tr key={page.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-slate-300 truncate max-w-xs">{page.url}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          {category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${page.siteType === 'OLD' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                          {page.siteType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${page.crawlStatus === 'SUCCESS' ? 'bg-green-500/20 text-green-400' : page.crawlStatus === 'ERROR' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {page.crawlStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {page.crawlStatus === 'SUCCESS' && (
                          <Link href={`/dashboard/${project.id}/page/${page.id}`} className="text-sm text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:border-indigo-400 px-3 py-1 rounded transition-colors">
                            View Report
                          </Link>
                        )}
                      </td>
                    </tr>
                )})}
              </tbody>
            </table>
            {pages.length > 20 && (
              <div className="text-center p-4 text-sm text-slate-500 border-t border-slate-700">
                Showing 20 of {pages.length} pages
              </div>
            )}
          </div>
        )}

        {activeTab === 'DIFF' && (
          <div className="overflow-x-auto bg-slate-800/30 rounded-xl border border-slate-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Pathname</th>
                  <th className="px-4 py-3">Old URL</th>
                  <th className="px-4 py-3">New URL</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {oldPages.map(oldPage => {
                  let path = ''
                  try { path = new URL(oldPage.url).pathname } catch(e) {}
                  
                  // Find matching new page
                  const newPage = newPages.find(p => {
                    try { return new URL(p.url).pathname === path } catch(e) { return false }
                  })

                  if (!newPage) return null // Only show mapped pairs for now

                  return (
                    <tr key={oldPage.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-slate-300 font-medium">{path}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-[200px]">{oldPage.url}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-[200px]">{newPage.url}</td>
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/${project.id}/diff/${oldPage.id}/${newPage.id}`} className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition-colors shadow-sm">
                          Compare
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
