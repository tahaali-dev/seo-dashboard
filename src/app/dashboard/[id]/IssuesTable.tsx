'use client'

import { useState } from 'react'

export default function IssuesTable({ issues }: { issues: any[] }) {
  const [filter, setFilter] = useState('ALL')

  const filteredIssues = filter === 'ALL' ? issues : issues.filter(i => i.severity === filter)

  return (
    <div className="bg-slate-800/30 rounded-xl border border-slate-700">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Detected Issues</h2>
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
        >
          <option value="ALL">All Severities</option>
          <option value="CRITICAL">Critical Only</option>
          <option value="HIGH">High Only</option>
          <option value="MEDIUM">Medium Only</option>
          <option value="LOW">Low Only</option>
        </select>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/50 text-slate-400">
            <tr>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Issue</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">URL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredIssues.slice(0, 50).map(issue => (
              <tr key={issue.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium 
                    ${issue.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' : 
                      issue.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' : 
                      issue.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 
                      'bg-slate-500/20 text-slate-400'}`}>
                    {issue.severity}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">{issue.category}</td>
                <td className="px-4 py-3 font-medium text-white">{issue.title}</td>
                <td className="px-4 py-3 text-slate-400">{issue.description}</td>
                <td className="px-4 py-3 text-slate-500 truncate max-w-xs">
                  {issue.page ? (
                    <a href={issue.page.url} target="_blank" rel="noreferrer" className="hover:text-indigo-400 transition-colors">
                      {issue.page.url.replace(/^https?:\/\/[^\/]+/, '')}
                    </a>
                  ) : '-'}
                </td>
              </tr>
            ))}
            {filteredIssues.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No issues found matching the filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {filteredIssues.length > 50 && (
          <div className="text-center p-4 text-sm text-slate-500">
            Showing 50 of {filteredIssues.length} issues
          </div>
        )}
      </div>
    </div>
  )
}
