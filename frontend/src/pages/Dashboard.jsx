import { Link } from 'react-router-dom'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'
import { useTelemetry } from '../components/TelemetryContext'
import { useTheme } from '../components/ThemeContext'

const moduleCards = [
  { key: 'signal-calibrator', name: 'Signal Calibrator', phase: '1. Attention & Focus', weight: '10%', accent: 'mind-teal' },
  { key: 'time-lapse-room', name: 'Time-Lapse Room', phase: '1. Memory', weight: '10%', accent: 'mind-teal' },
  { key: 'circuit-weaver', name: 'Circuit Weaver', phase: '2. Reasoning', weight: '15%', accent: 'insight-yellow' },
  { key: 'cascade-pipeline', name: 'Cascade Pipeline', phase: '2. Problem Solving', weight: '15%', accent: 'insight-yellow' },
  { key: 'dispatcher', name: 'Dispatcher', phase: '2. Executive Functions', weight: '15%', accent: 'creativity-pink' },
  { key: 'tone-mixer', name: 'Tone Mixer', phase: '3. Emotional Intelligence', weight: '10%', accent: 'warm-coral' },
  { key: 'object-alchemist', name: 'Object Alchemist', phase: '3. Creativity', weight: '10%', accent: 'creativity-pink' },
  { key: 'trust-wager', name: 'Trust Wager', phase: '3. Social Cognition', weight: '5%', accent: 'warm-coral' },
  { key: 'fog-of-war', name: 'Fog of War', phase: '4. Decision Making', weight: '5%', accent: 'warm-coral' },
  { key: 'confidence-calibrator', name: 'Confidence Calibrator', phase: '4. Metacognition', weight: '5%', accent: 'mind-teal' },
]

const accentColorMap = {
  'mind-teal': { bg: 'bg-mind-teal', text: 'text-mind-teal', border: 'border-mind-teal', hex: '#4EA8DE' },
  'insight-yellow': { bg: 'bg-insight-yellow', text: 'text-insight-yellow', border: 'border-insight-yellow', hex: '#FFD166' },
  'creativity-pink': { bg: 'bg-creativity-pink', text: 'text-creativity-pink', border: 'border-creativity-pink', hex: '#FF85A1' },
  'warm-coral': { bg: 'bg-warm-coral', text: 'text-warm-coral', border: 'border-warm-coral', hex: '#F4A261' },
}

const radarData = [
  { subject: 'Focus', A: 40, fullMark: 100 },
  { subject: 'Memory', A: 30, fullMark: 100 },
  { subject: 'Reasoning', A: 20, fullMark: 100 },
  { subject: 'Problem\nSolving', A: 45, fullMark: 100 },
  { subject: 'Exec\nFunction', A: 35, fullMark: 100 },
  { subject: 'EQ', A: 25, fullMark: 100 },
  { subject: 'Creativity', A: 15, fullMark: 100 },
  { subject: 'Social\nCog', A: 10, fullMark: 100 },
  { subject: 'Decision', A: 20, fullMark: 100 },
  { subject: 'Meta\nCog', A: 5, fullMark: 100 },
]

export default function Dashboard() {
  const { logEvent } = useTelemetry()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="relative min-h-screen px-6 py-10 text-deep-slate">
      <div className="pointer-events-none fixed inset-0 bg-grain" />
      <div className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section className="card card-glass rounded-3xl p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-heading text-3xl font-bold text-deep-slate">
                CogniMap Dashboard
              </h2>
              <p className="mt-3 text-deep-slate/60">
                Explore all ten modules and review your live cognitive report.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="btn-primary rounded-2xl bg-canvas px-3 py-2 text-sm text-deep-slate"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              >
                {theme === 'light' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                )}
              </button>
              <Link
                to="/"
                className="btn-primary rounded-2xl border-2 border-deep-slate bg-white px-4 py-2 text-sm text-deep-slate"
              >
                Home
              </Link>
              <Link
                to="/report"
                className="btn-primary rounded-2xl bg-mind-teal px-4 py-2 text-sm text-deep-slate"
              >
                View report
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {moduleCards.map((module) => {
              const accent = accentColorMap[module.accent]
              return (
                <Link
                  key={module.key}
                  to={`/module/${module.key}`}
                  onClick={() => logEvent('module.open', { module: module.key })}
                  className={`card rounded-3xl p-5 transition-pop hover:shadow-hard-hover hover:-translate-y-0.5 ${accent.border}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-deep-slate">
                        {module.name}
                      </h3>
                      <p className="mt-1 text-sm text-deep-slate/50">
                        {module.phase} &middot; {module.weight}
                      </p>
                    </div>
                    <span className={`rounded-full ${accent.bg} px-4 py-2 text-sm font-semibold text-deep-slate shadow-hard transition-pop hover:shadow-hard-hover`}>
                      Open
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>

          <div className="card card-glass mt-10 rounded-3xl p-6">
            <h3 className="font-heading text-xl font-bold text-deep-slate">
              Your Thinking Snapshot
            </h3>
            <p className="mt-2 text-deep-slate/60">
              This radar updates after each completed module, giving you a baseline view of current cognitive signals.
            </p>

            <div className="mt-7 h-[320px] w-full">
              <ResponsiveContainer>
                <RadarChart data={radarData} outerRadius="80%">
                  <PolarGrid stroke="#1A1D2E" strokeOpacity={0.15} />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#1A1D2E', fontSize: 11, fontWeight: 500 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#1A1D2E', fontSize: 10, opacity: 0.4 }} />
                  <Radar
                    name="This session"
                    dataKey="A"
                    stroke="#4EA8DE"
                    fill="#4EA8DE"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <aside className="card card-glass rounded-3xl p-8">
          <div>
            <h3 className="font-heading text-2xl font-bold text-deep-slate">
              Modules queue
            </h3>
            <p className="mt-2 text-deep-slate/60">
              Ten modules are waiting. Start with the reasoning and emotional intelligence paths.
            </p>
          </div>

          <div className="mt-6 grid gap-3">
            {moduleCards.map((module) => {
              const accent = accentColorMap[module.accent]
              return (
                <Link
                  key={module.key}
                  to={`/module/${module.key}`}
                  onClick={() => logEvent('module.open', { module: module.key })}
                  className="rounded-2xl border-2 border-deep-slate bg-white px-4 py-4 text-deep-slate transition-pop hover:shadow-hard"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{module.name}</p>
                      <p className="text-xs text-deep-slate/50">{module.phase}</p>
                    </div>
                    <span className={`rounded-full ${accent.bg} px-3 py-1 text-xs font-semibold text-deep-slate`}>
                      {module.weight}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </aside>
      </div>
    </div>
  )
}
