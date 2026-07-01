import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTelemetry } from '../components/TelemetryContext'

const moduleDefinitions = {
  'object-alchemist': {
    name: 'Object Alchemist',
    description: 'Blend creative choices into a new problem-solving formula.',
    phase: 'Phase 3 — Creativity',
    prompt: 'Choose the elements you would combine to solve the challenge.',
  },
  'trust-wager': {
    name: 'Trust Wager',
    description: 'Balance risk and trust by committing to a bold or cautious move.',
    phase: 'Phase 3 — Social Cognition',
    prompt: 'Do you bet on the safer route or the higher reward path?',
  },
  'fog-of-war': {
    name: 'Fog of War',
    description: 'Push through uncertainty using the information you can still see.',
    phase: 'Phase 4 — Decision Making',
    prompt: 'How do you proceed when critical details are hidden?',
  },
  'confidence-calibrator': {
    name: 'Confidence Calibrator',
    description: 'Gauge your confidence and adjust the intensity of your decision.',
    phase: 'Phase 4 — Metacognition',
    prompt: 'Rate how confident you feel about the last choice.',
  },
}

export default function ModulePage() {
  const { moduleKey } = useParams()
  const module = moduleDefinitions[moduleKey]
  const { logEvent } = useTelemetry()
  const [answer, setAnswer] = useState('')
  const [status, setStatus] = useState('')

  if (!module) {
    return (
      <div className="min-h-screen px-6 py-10 text-deep-slate">
        <div className="mx-auto max-w-3xl rounded-3xl border border-deep-slate card-glass p-10 text-center">
          <h1 className="text-3xl font-semibold">Module not found</h1>
          <p className="mt-4 text-deep-slate/60">The requested module does not exist. Return to the dashboard to continue.</p>
          <Link to="/dashboard" className="mt-8 inline-flex rounded-2xl bg-mind-teal px-6 py-3 text-slate-950 hover:opacity-90">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  function handleComplete() {
    if (!answer.trim()) {
      setStatus('Please enter a short response before completing the module.')
      return
    }

    logEvent('module.interact', {
      module: moduleKey,
      response: answer.trim(),
    })
    setStatus('Activity logged. Great work — move to the next module when ready.')
  }

  return (
    <div className="relative min-h-screen px-6 py-10 text-deep-slate">
      <div className="pointer-events-none fixed inset-0 bg-grain" />
      <div className="relative mx-auto max-w-5xl border-2 border-deep-slate card-glass shadow-hard rounded-3xl p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">{module.name}</h1>
            <p className="mt-1 text-sm text-mind-teal">{module.phase}</p>
            <p className="mt-2 text-deep-slate/60">{module.description}</p>
          </div>
          <div className="space-x-3">
            <Link to="/dashboard" className="rounded-2xl bg-canvas border border-deep-slate px-4 py-2 text-deep-slate hover:shadow-hard">
              Dashboard
            </Link>
            <Link to="/report" className="rounded-2xl bg-mind-teal px-4 py-2 text-slate-950 hover:opacity-90">
              View report
            </Link>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-deep-slate border-2 border-deep-slate card-glass shadow-hard rounded-3xl p-6">
          <p className="text-lg text-deep-slate/80">{module.prompt}</p>
          <p className="mt-2 text-sm text-deep-slate/50">This module will have a custom interactive experience in a future update.</p>
          <textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            rows="6"
            className="mt-4 w-full rounded-3xl border border-deep-slate bg-canvas px-4 py-4 text-deep-slate"
            placeholder="Write your answer here..."
          />
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleComplete}
              className="rounded-2xl bg-mind-teal px-6 py-3 font-semibold text-slate-950 hover:opacity-90"
            >
              Complete activity
            </button>
            <button
              type="button"
              onClick={() => {
                logEvent('module.skip', { module: moduleKey })
                setStatus('Skipped this activity and moved on.')
              }}
              className="rounded-2xl border border-deep-slate px-6 py-3 text-deep-slate hover:border-slate-500"
            >
              Skip module
            </button>
          </div>

          {status && <p className="mt-4 rounded-2xl bg-canvas border border-deep-slate px-4 py-3 text-deep-slate">{status}</p>}
        </div>
      </div>
    </div>
  )
}
