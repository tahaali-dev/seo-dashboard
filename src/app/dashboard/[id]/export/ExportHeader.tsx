"use client";

export default function ExportHeader() {
  return (
    <header className="no-print mb-8 pb-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
      <div>
        <h1 className="text-lg font-bold text-slate-800">SEO Report Print Preview</h1>
        <p className="text-xs text-slate-500 font-normal">Configure your print settings (select Save as PDF) in the system print dialog.</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => window.print()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print / Save to PDF
        </button>
        <button
          onClick={() => window.close()}
          className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          Close Window
        </button>
      </div>
    </header>
  );
}
