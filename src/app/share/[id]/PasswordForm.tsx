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
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7] p-4 sm:p-8 font-sans">
      <div className="w-full max-w-[1100px] bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col md:flex-row min-h-[650px] border border-gray-100">

        {/* Left Panel - White Form */}
        <div className="w-full md:w-1/2 flex flex-col justify-center p-8 md:p-16 lg:p-20 bg-white dark:bg-[#1E1E1E] relative z-10">
          <div className="max-w-[340px] mx-auto w-full text-center">

            <h2 className="text-[26px] md:text-[28px] font-semibold text-[#252423] tracking-tight mb-2 leading-tight">
              Log in to view <br />
              <span className="font-bold">{projectName}</span>
            </h2>

            <div className="w-full flex items-center gap-4 my-8">
              <div className="h-[1px] bg-gray-200 flex-1"></div>
              <span className="text-[#252423]/40 text-xs font-medium uppercase tracking-wider">Secure Report</span>
              <div className="h-[1px] bg-gray-200 flex-1"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {error && (
                <div className="p-3 bg-[#FFF5F5] text-[#E80C08] rounded-lg text-sm border border-[#E80C08]/20 animate-in fade-in">
                  {error}
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-[#252423]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] text-[#252423] rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-[#252423] focus:ring-1 focus:ring-[#252423] transition-all placeholder:text-[#252423]/40 text-[15px]"
                  placeholder="Your Password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#E80C08] hover:bg-[#920403] text-white font-semibold rounded-xl px-4 py-3.5 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E80C08] disabled:opacity-70 disabled:cursor-not-allowed mt-2 flex items-center justify-center text-[15px]"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </>
                ) : "Log in"}
              </button>
            </form>

            <div className="mt-8 text-[13px] text-[#252423]/60">
              Need access? <a href="#" className="font-semibold text-[#252423] hover:text-[#E80C08] transition-colors">Request password</a>
            </div>
          </div>
        </div>

        {/* Right Panel - Abstract Visual (Charcoal & Crimson) */}
        <div className="hidden md:block md:w-1/2 relative bg-[#111111] overflow-hidden">
          {/* Noise overlay */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.15] mix-blend-overlay pointer-events-none z-20">
            <filter id="noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noise)" />
          </svg>

          {/* Abstract Red Shapes mimicking the inspiration */}
          <div className="absolute top-[-10%] right-[-20%] w-[80%] h-[120%] bg-[#E80C08] blur-[100px] rounded-full opacity-60 mix-blend-screen transform rotate-12 z-0 animate-pulse" style={{ animationDuration: '8s' }}></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[90%] h-[80%] bg-[#920403] blur-[120px] rounded-full opacity-80 z-0"></div>

          {/* Geometric slashes */}
          <div className="absolute top-[10%] left-[20%] w-[120%] h-[20%] bg-gradient-to-r from-[#E80C08] to-transparent opacity-40 transform -rotate-45 blur-md z-10"></div>
          <div className="absolute top-[30%] left-[10%] w-[150%] h-[15%] bg-gradient-to-r from-[#FACECE] to-transparent opacity-20 transform -rotate-45 blur-lg z-10"></div>

          {/* Bottom gradient fade to charcoal */}
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#252423] to-transparent z-10"></div>

          {/* Tagline overlay */}
          <div className="absolute bottom-8 left-8 z-30 flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-[#FACECE] flex items-center justify-center shadow-lg">
              <div className="w-2 h-2 rounded-full bg-[#E80C08]"></div>
            </div>
            <span className="text-white text-sm font-medium tracking-wide">SEO Dashboard <span className="text-white/40">by Hexcode Studio</span></span>
          </div>
        </div>

      </div>
    </div>
  )
}
