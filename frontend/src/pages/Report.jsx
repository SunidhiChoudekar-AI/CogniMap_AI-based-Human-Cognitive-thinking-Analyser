import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'
import { useTelemetry } from '../components/TelemetryContext'

export default function Report() {
  const { sessionId, logEvent, flushEvents } = useTelemetry()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true)
        await flushEvents()
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        const response = await axios.get(`${apiUrl}/api/profile/${sessionId}`)
        setProfile(response.data)
        logEvent('report.view', { session_id: sessionId })
      } catch (err) {
        setError('Unable to load the cognitive report. Please try again later.')
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [sessionId, logEvent, flushEvents])

  const scoreKeys = ['attention_focus', 'memory', 'reasoning', 'problem_solving', 'executive_functions', 'creativity', 'emotional_intelligence', 'social_cognition', 'decision_making', 'metacognition']
  const radarData = profile?.score_data
    ? scoreKeys.map((key) => ({
        subject: key.charAt(0).toUpperCase() + key.slice(1),
        A: profile.score_data[key] ?? 0,
        fullMark: 100,
      }))
    : []

  return (
    <div className="relative min-h-screen px-6 py-10 text-deep-slate">
      <div className="pointer-events-none fixed inset-0 bg-grain" />
      <div className="relative mx-auto max-w-5xl rounded-3xl border-2 border-deep-slate card-glass p-8 shadow-hard">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h1 className="text-3xl font-semibold">Cognitive Report</h1>
            <p className="mt-2 text-deep-slate/60">A session summary based on telemetry and heuristic scoring.</p>
          </div>
          <Link to="/dashboard" className="rounded-2xl bg-canvas border border-deep-slate px-4 py-2 text-deep-slate hover:shadow-hard">
            Back to Dashboard
          </Link>
        </div>

        {loading && <p className="mt-8 text-deep-slate/80">Loading report...</p>}
        {error && <p className="mt-8 text-red-600">{error}</p>}

        {!loading && profile && (
          <div className="mt-8 space-y-8">
            <div className="rounded-3xl border-2 border-deep-slate card-glass p-6 shadow-hard">
              <h2 className="text-2xl font-semibold">Cognitive Twin Narrative</h2>
              <p className="mt-4 whitespace-pre-line text-deep-slate">{profile.narrative}</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border-2 border-deep-slate card-glass p-6 shadow-hard">
                <h2 className="text-2xl font-semibold">Radar scores</h2>
                <div className="mt-6 h-[320px] w-full">
                  <ResponsiveContainer>
                    <RadarChart data={radarData} outerRadius="80%">
                      <PolarGrid stroke="#1A1D2E" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#1A1D2E' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar name="Profile" dataKey="A" stroke="#4EA8DE" fill="#4EA8DE" fillOpacity={0.4} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-3xl border-2 border-deep-slate card-glass p-6 shadow-hard">
                <h2 className="text-2xl font-semibold">Score details</h2>
                <div className="mt-5 space-y-3 text-deep-slate">
                  {Object.entries(profile.score_data ?? {}).map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between rounded-2xl bg-canvas border border-deep-slate px-4 py-3">
                      <span className="capitalize text-deep-slate/80">{label.replace('_', ' ')}</span>
                      <span className="font-semibold text-mind-teal">{typeof value === 'number' ? value : JSON.stringify(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
