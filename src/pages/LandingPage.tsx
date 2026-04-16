import { motion } from 'framer-motion'
import { Github } from 'lucide-react'
import { SearchBar } from '@/components/SearchBar'

const floatingCapsules = [
  'left-[8%] top-[12%] h-10 w-64 rotate-[12deg] bg-[linear-gradient(90deg,rgba(127,140,255,0.30),rgba(255,255,255,0.05))]',
  'right-[7%] top-[12%] h-10 w-60 -rotate-[22deg] bg-[linear-gradient(90deg,rgba(244,184,96,0.20),rgba(255,255,255,0.04))]',
  'left-[15%] bottom-[16%] h-12 w-72 -rotate-[8deg] bg-[linear-gradient(90deg,rgba(124,230,212,0.18),rgba(255,255,255,0.04))]',
  'right-[6%] bottom-[11%] h-12 w-80 -rotate-[16deg] bg-[linear-gradient(90deg,rgba(240,157,207,0.18),rgba(255,255,255,0.04))]',
]

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020305] text-white">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.06),transparent_28%),radial-gradient(circle_at_18%_28%,rgba(127,140,255,0.08),transparent_18%),radial-gradient(circle_at_82%_24%,rgba(244,184,96,0.06),transparent_16%)]" />
      <div aria-hidden className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px]" />

      {floatingCapsules.map((className, index) => (
        <motion.div
          key={className}
          aria-hidden
          className={`absolute rounded-full border border-white/10 blur-[1px] ${className}`}
          animate={{ y: [0, index % 2 === 0 ? -10 : 10, 0], rotate: [0, index % 2 === 0 ? 2 : -2, 0] }}
          transition={{ duration: 8 + index, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b border-white/8 bg-[#020305]/70 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] shadow-[0_0_40px_rgba(127,140,255,0.08)]">
                <Github className="h-4 w-4 text-white/90" />
              </div>
              <div>
                <div className="text-sm font-medium text-white/86">GitHub Hiring Intelligence</div>
              </div>
            </div>

            <a
              href="#start"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/78 shadow-[0_12px_40px_rgba(0,0,0,0.25)] transition-all hover:border-white/20 hover:bg-white/[0.06]"
            >
              Open Search
            </a>
          </div>
        </header>

        <main className="flex-1 px-4 py-12 md:px-6 md:py-16">
          <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-5xl flex-col items-center justify-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70 backdrop-blur-xl"
            >
              <span className="h-2 w-2 rounded-full bg-gradient-to-r from-[#7f8cff] via-[#f0a8d2] to-[#7ce6d4] shadow-[0_0_18px_rgba(127,140,255,0.8)]" />
              Shape Landing Hero inspired GitHub scoring
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.05 }}
              className="relative mt-10 space-y-6"
            >
              <h1 className="max-w-5xl text-5xl font-black tracking-tight text-white md:text-6xl lg:text-7xl xl:text-[6rem] xl:leading-[0.92]">
                Elevate Your{' '}
                <span className="bg-gradient-to-r from-[#a6b0ff] via-[#f4d3ff] to-[#ffc4d7] bg-clip-text text-transparent">
                  GitHub Vision
                </span>
              </h1>
              <p className="mx-auto max-w-2xl text-base leading-7 text-white/60 md:text-lg md:leading-8">
                Premium GitHub intelligence with a dark geometric system, soft capsule shapes, subtle motion, and a score that treats repository quality and project complexity as the primary signal.
              </p>
            </motion.div>

            <div id="start" className="mt-12 w-full">
              <SearchBar />
            </div>

          </div>
        </main>

      </div>
    </div>
  )
}
