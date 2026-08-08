"use client"

import { useState } from "react"
import { verifySharePassword } from "./action"
import { useRouter } from "next/navigation"

export default function PasswordForm({ projectId, projectName }: { projectId: string, projectName: string }) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    const res = await verifySharePassword(projectId, password)
    if (res.error) {
      setError(res.error)
      setLoading(false)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-4 relative overflow-hidden">
      {/* Background glowing orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-pulse"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-500/20 rounded-full mix-blend-screen filter blur-[80px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="max-w-md w-full bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-[2rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] p-10 relative z-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-8 shadow-[0_0_30px_rgba(99,102,241,0.5)] border border-white/20">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-3 tracking-tight">Protected Report</h2>
        <p className="text-slate-400 mb-10 text-sm leading-relaxed px-4">
          Enter the password to view the SEO report for <strong className="text-indigo-300 font-semibold">{projectName}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500 group-focus-within:opacity-100"></div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="relative w-full bg-[#0f111a] border border-white/10 text-white rounded-xl px-4 py-4 focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600 text-center text-xl tracking-[0.3em] font-mono shadow-[inset_0_0_0_1000px_#0f111a] [-webkit-text-fill-color:white]"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full relative group overflow-hidden bg-white/5 text-white font-semibold rounded-xl px-4 py-4 transition-all disabled:opacity-50 border border-white/10 hover:border-white/20 hover:bg-white/10"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </>
              ) : "View Report"}
            </span>
          </button>
        </form>
      </div>
    </div>
  )
}
