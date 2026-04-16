import { motion } from 'framer-motion'
import { Github } from 'lucide-react'
import { SearchBar } from '@/components/SearchBar'

const floatingLogos = [
  { className: 'left-[4%] top-[8%] h-16 w-16', delay: 0.1, duration: 10.6, angle: -16, driftX: 8, driftY: 12 },
  { className: 'left-[9%] top-[24%] h-12 w-12', delay: 0.8, duration: 12.4, angle: 22, driftX: -7, driftY: 10 },
  { className: 'left-[14%] top-[56%] h-14 w-14', delay: 0.4, duration: 11.1, angle: -8, driftX: 9, driftY: -11 },
  { className: 'left-[20%] top-[14%] h-10 w-10', delay: 1.2, duration: 13.2, angle: 28, driftX: -6, driftY: 9 },
  { className: 'left-[23%] top-[74%] h-12 w-12', delay: 0.3, duration: 10.8, angle: -24, driftX: 8, driftY: -8 },
  { className: 'left-[30%] top-[30%] h-20 w-20', delay: 1.0, duration: 14.0, angle: 12, driftX: 10, driftY: 13 },
  { className: 'left-[36%] top-[9%] h-11 w-11', delay: 0.6, duration: 11.7, angle: -20, driftX: -8, driftY: 10 },
  { className: 'left-[41%] top-[63%] h-10 w-10', delay: 0.2, duration: 12.6, angle: 18, driftX: 7, driftY: -10 },
  { className: 'left-[47%] top-[18%] h-[3.75rem] w-[3.75rem]', delay: 1.3, duration: 13.6, angle: -10, driftX: -9, driftY: 11 },
  { className: 'left-[52%] top-[42%] h-12 w-12', delay: 0.7, duration: 10.9, angle: 26, driftX: 6, driftY: -9 },
  { className: 'left-[58%] top-[11%] h-[4.25rem] w-[4.25rem]', delay: 0.5, duration: 12.2, angle: -28, driftX: -7, driftY: 12 },
  { className: 'left-[63%] top-[67%] h-12 w-12', delay: 1.5, duration: 14.3, angle: 14, driftX: 8, driftY: -12 },
  { className: 'left-[68%] top-[27%] h-10 w-10', delay: 0.15, duration: 11.5, angle: -14, driftX: -8, driftY: 9 },
  { className: 'left-[73%] top-[52%] h-[4.5rem] w-[4.5rem]', delay: 0.95, duration: 13.9, angle: 20, driftX: 10, driftY: -11 },
  { className: 'left-[80%] top-[16%] h-11 w-11', delay: 0.35, duration: 10.4, angle: -26, driftX: -7, driftY: 10 },
  { className: 'left-[86%] top-[36%] h-13 w-13', delay: 1.1, duration: 12.8, angle: 8, driftX: 7, driftY: -8 },
  { className: 'left-[91%] top-[58%] h-9 w-9', delay: 0.55, duration: 11.0, angle: -18, driftX: -6, driftY: 8 },
  { className: 'left-[7%] bottom-[16%] h-12 w-12', delay: 1.4, duration: 12.9, angle: 24, driftX: 8, driftY: -10 },
  { className: 'left-[15%] bottom-[8%] h-10 w-10', delay: 0.25, duration: 10.7, angle: -12, driftX: -7, driftY: 9 },
  { className: 'left-[27%] bottom-[20%] h-16 w-16', delay: 1.0, duration: 14.1, angle: 18, driftX: 10, driftY: -12 },
  { className: 'left-[38%] bottom-[12%] h-11 w-11', delay: 0.45, duration: 11.6, angle: -22, driftX: -8, driftY: 8 },
  { className: 'left-[49%] bottom-[24%] h-14 w-14', delay: 0.9, duration: 13.3, angle: 10, driftX: 9, driftY: -11 },
  { className: 'left-[61%] bottom-[18%] h-12 w-12', delay: 1.25, duration: 12.1, angle: -8, driftX: -7, driftY: 10 },
  { className: 'left-[72%] bottom-[10%] h-10 w-10', delay: 0.3, duration: 10.5, angle: 28, driftX: 7, driftY: -8 },
  { className: 'left-[83%] bottom-[26%] h-[3.75rem] w-[3.75rem]', delay: 0.75, duration: 13.7, angle: -20, driftX: -9, driftY: 12 },
  { className: 'left-[89%] bottom-[12%] h-11 w-11', delay: 1.35, duration: 11.9, angle: 16, driftX: 8, driftY: -9 },
  { className: 'left-[44%] top-[80%] h-9 w-9', delay: 0.65, duration: 10.3, angle: -30, driftX: 6, driftY: 7 },
  { className: 'left-[56%] top-[74%] h-10 w-10', delay: 1.05, duration: 12.7, angle: 30, driftX: -6, driftY: -8 },
]

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.05),transparent_32%)]" />
      <div aria-hidden className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px]" />

      {floatingLogos.map((item, index) => (
        <motion.div
          key={`${item.className}-${index}`}
          aria-hidden
          className={`absolute flex items-center justify-center rounded-full ${item.className}`}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{
            opacity: [0.2, 0.42, 0.25],
            scale: [0.96, 1.08, 0.99],
            y: [0, item.driftY, 0],
            x: [0, item.driftX, 0],
            rotate: [item.angle, item.angle + 7, item.angle],
          }}
          transition={{ duration: item.duration, repeat: Infinity, ease: 'easeInOut', delay: item.delay }}
        >
          <Github className="h-full w-full text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.28)]" />
        </motion.div>
      ))}

      <div className="relative z-10 flex min-h-screen flex-col">
        <main className="flex-1 px-4 py-12 md:px-6 md:py-16">
          <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-5xl flex-col items-center justify-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.05 }}
              className="relative mt-10 space-y-6"
            >
                <h1 className="max-w-5xl text-5xl font-black tracking-tight text-white md:text-6xl lg:text-7xl xl:text-[6rem] xl:leading-[0.92]">
                GitInsight
              </h1>
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
