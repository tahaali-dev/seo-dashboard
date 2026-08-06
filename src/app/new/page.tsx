'use client'

import { useState } from 'react'
import { createProject } from '../actions'

export default function NewProject() {
  const [auditType, setAuditType] = useState<'FRESH' | 'MIGRATION'>('FRESH')

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-indigo-500/30 flex items-center justify-center p-4">
      <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900 to-slate-900"></div>
      
      <div className="w-full max-w-2xl bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
        <a href="/" className="absolute -top-10 left-0 text-slate-400 hover:text-white text-sm font-medium flex items-center gap-1 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Projects
        </a>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            SEO
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">New SEO Project</h1>
            <p className="text-sm text-slate-400">Step 1 — Define your audit type and website URLs</p>
          </div>
        </div>

        <form action={createProject} className="space-y-6">
          <input type="hidden" name="auditType" value={auditType} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              type="button"
              onClick={() => setAuditType('FRESH')}
              className={`p-4 rounded-xl border text-left transition-all ${auditType === 'FRESH' ? 'bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500' : 'bg-slate-900/30 border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'}`}
            >
              <h3 className="font-semibold text-white mb-1">Fresh Website Audit</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Audit a single website for SEO issues, broken links, and metadata health.</p>
            </button>
            <button 
              type="button"
              onClick={() => setAuditType('MIGRATION')}
              className={`p-4 rounded-xl border text-left transition-all ${auditType === 'MIGRATION' ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500' : 'bg-slate-900/30 border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'}`}
            >
              <h3 className="font-semibold text-white mb-1">Migration Audit</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Compare an old website against a new staging website to prevent SEO regression.</p>
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Project Name <span className="text-red-400">*</span></label>
            <input 
              type="text" 
              name="name" 
              required
              placeholder={auditType === 'FRESH' ? 'e.g., Q4 SEO Audit' : 'e.g., Portless Migration'} 
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" 
            />
          </div>
          
          <div className={`grid grid-cols-1 ${auditType === 'MIGRATION' ? 'md:grid-cols-2' : ''} gap-6`}>
            {auditType === 'MIGRATION' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Old Website URL <span className="text-red-400">*</span></label>
                <input 
                  type="url" 
                  name="oldWebsite" 
                  required={auditType === 'MIGRATION'}
                  placeholder="https://oldsite.com" 
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors" 
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {auditType === 'MIGRATION' ? 'New Website URL' : 'Website URL'} <span className="text-red-400">*</span>
              </label>
              <input 
                type="url" 
                name="newWebsite" 
                required
                placeholder="https://newsite.com" 
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" 
              />
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 mt-6">
            <h3 className="text-lg font-medium text-slate-300 mb-4">Sitemaps (Optional)</h3>
            <div className={`grid grid-cols-1 ${auditType === 'MIGRATION' ? 'md:grid-cols-2' : ''} gap-6`}>
              {auditType === 'MIGRATION' && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Old Sitemap URL</label>
                  <input 
                    type="url" 
                    name="oldSitemap" 
                    placeholder="https://oldsite.com/sitemap.xml" 
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors" 
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  {auditType === 'MIGRATION' ? 'New Sitemap URL' : 'Sitemap URL'}
                </label>
                <input 
                  type="url" 
                  name="newSitemap" 
                  placeholder="https://newsite.com/sitemap.xml" 
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" 
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-medium transition-colors shadow-lg shadow-indigo-600/20"
            >
              Create Project & Start Crawling
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
