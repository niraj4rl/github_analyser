import { SearchBar } from "@/components/SearchBar"

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0b0f14] text-white flex flex-col overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.06),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.03),transparent_35%)]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0f14]/75 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md border border-white/15 bg-white/5 flex items-center justify-center text-xs font-semibold tracking-wide">RA</div>
                <div>
                  <div className="text-base font-semibold text-white/85">Recruiting Assistant</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-3xl text-center space-y-5">
            <p className="text-sm md:text-base text-white/55 max-w-xl mx-auto">
              Find developer insights in seconds.
            </p>
            <div className="mx-auto rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
              <SearchBar />
            </div>
          </div>
        </main>

        <footer className="border-t border-white/10 py-6 text-center text-xs text-white/45">
          <p>GitHub Developer Hiring Intelligence System</p>
        </footer>
      </div>
    </div>
  )
}
