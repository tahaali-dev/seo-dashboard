"use client";

export default function SEOScoreWidget({ scores, minimal = false }: { scores: any, minimal?: boolean }) {
  const { overall, categories } = scores;

  return (
    <div className={`bg-black/5 dark:bg-white/5 text-foreground dark:text-white p-8 rounded-xl border border-black/20 dark:border-white/20 shadow-lg flex flex-col ${minimal ? 'items-center justify-center' : 'md:flex-row gap-8 items-center md:items-start'}`}>
      {/* Left: Donut Chart */}
      <div className="shrink-0 flex flex-col items-center">
        <div className="relative w-48 h-48">
          <svg
            viewBox="0 0 36 36"
            className="w-full h-full transform -rotate-90 drop-shadow-md"
          >
            {/* Background Circle */}
            <path
              className="text-slate-700/50"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
            />
            {/* Foreground Circle */}
            <path
              className="text-emerald-400"
              strokeDasharray={`${overall}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-foreground dark:text-white drop-shadow">
              {overall}%
            </span>
            <span className="text-xs text-black-60 dark:text-white/60 mt-1 uppercase tracking-widest font-medium">
              Score
            </span>
          </div>
        </div>
      </div>

      {/* Right: Progress Bars */}
      {!minimal && (
        <div className="flex-1 w-full mt-4 md:mt-0 pt-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
            {Object.entries(categories).map(([name, score]: [string, any]) => (
              <div key={name} className="group">
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span className="text-black-60 dark:text-white/60 group-hover:text-foreground dark:text-white transition-colors">
                    {name}
                  </span>
                  <span className="text-foreground dark:text-white font-semibold">{score}%</span>
                </div>
                <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2.5 overflow-hidden border border-black/20 dark:border-white/20/50">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(52,211,153,0.5)] 
                      ${score > 80 ? "bg-emerald-400" : score > 50 ? "bg-amber-400" : "bg-rose-500"}`}
                    style={{ width: `${score}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
