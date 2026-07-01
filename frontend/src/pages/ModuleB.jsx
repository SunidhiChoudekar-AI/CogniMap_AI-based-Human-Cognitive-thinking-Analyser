import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTelemetry } from '../components/TelemetryContext'

function getTier(value) {
  if (value <= 33) return 'low'
  if (value <= 66) return 'medium'
  return 'high'
}

function countRegrets(events) {
  const bySlider = {}
  for (const e of events) {
    if (!bySlider[e.slider]) bySlider[e.slider] = []
    bySlider[e.slider].push(e)
  }

  let regrets = 0
  for (const evts of Object.values(bySlider)) {
    for (let i = 1; i < evts.length; i++) {
      const delta = evts[i].value - evts[i - 1].value
      if (Math.abs(delta) >= 30) {
        for (let j = i + 1; j < evts.length; j++) {
          const revert = evts[j].value - evts[i].value
          if (Math.abs(revert) >= 20 && revert * delta < 0) {
            regrets++
            break
          }
        }
      }
    }
  }
  return regrets
}

const SLIDER_CONFIG = [
  {
    key: 'empathy',
    label: 'Empathy',
    color: 'accent-pink-500',
    track: 'bg-pink-900/40',
    fill: 'bg-pink-500',
    thumb: 'accent-pink-500',
    description: 'Warmth & validation',
  },
  {
    key: 'logic',
    label: 'Logic',
    color: 'accent-blue-500',
    track: 'bg-blue-900/40',
    fill: 'bg-blue-500',
    thumb: 'accent-blue-500',
    description: 'Facts & reasoning',
  },
  {
    key: 'directness',
    label: 'Directness',
    color: 'accent-amber-500',
    track: 'bg-amber-900/40',
    fill: 'bg-amber-500',
    thumb: 'accent-amber-500',
    description: 'Boundaries & clarity',
  },
]

export default function ModuleB() {
  const { logEvent, ageBracket } = useTelemetry()
  const [scenario, setScenario] = useState(null)
  const [loading, setLoading] = useState(true)
  const [empathy, setEmpathy] = useState(50)
  const [logic, setLogic] = useState(50)
  const [directness, setDirectness] = useState(50)
  const [sliderEvents, setSliderEvents] = useState([])
  const [sent, setSent] = useState(false)
  const [report, setReport] = useState(null)

  const startTimeRef = useRef(performance.now())
  const firstInteractionRef = useRef(null)

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    fetch(
      `${apiUrl}/api/module/tone-mixer/scenario?age_bracket=${encodeURIComponent(ageBracket)}`,
    )
      .then((res) => res.json())
      .then((data) => {
        setScenario(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [ageBracket])

  const handleSliderChange = useCallback((slider, setter, newValue) => {
    const now = performance.now()
    if (firstInteractionRef.current === null) {
      firstInteractionRef.current = now
    }

    setter(newValue)
    setSliderEvents((prev) => [
      ...prev,
      {
        slider,
        value: newValue,
        timestamp: Math.round(now - startTimeRef.current),
      },
    ])
  }, [])

  const draftReply = scenario
    ? `${scenario.matrix.empathy[getTier(empathy)]} ${scenario.matrix.logic[getTier(logic)]} ${scenario.matrix.directness[getTier(directness)]}`
    : ''

  function handleSend() {
    if (sent || !scenario) return

    const now = performance.now()
    const totalTimeMs = Math.round(now - startTimeRef.current)
    const timeToFirstInteractionMs =
      firstInteractionRef.current !== null
        ? Math.round(firstInteractionRef.current - startTimeRef.current)
        : totalTimeMs

    const finalMix = { empathy, logic, directness }
    const optimalMix = scenario.optimal_mix

    const dist = Math.sqrt(
      (empathy - optimalMix.empathy) ** 2 +
        (logic - optimalMix.logic) ** 2 +
        (directness - optimalMix.directness) ** 2,
    )
    const proximityScore = Math.max(
      0,
      Math.min(100, Math.round(100 - dist * 0.6)),
    )

    const draftRegretCount = countRegrets(sliderEvents)

    const firstEvent = sliderEvents[0]
    const empathyBias = firstEvent ? firstEvent.slider === 'empathy' : false

    const reportData = {
      proximityScore,
      draftRegretCount,
      empathyBias,
      finalMix,
      optimalMix,
    }
    setReport(reportData)
    setSent(true)

    logEvent('tone_mixer.send', {
      scenario_id: scenario.scenario_id,
      metrics: {
        time_to_first_interaction_ms: timeToFirstInteractionMs,
        total_time_ms: totalTimeMs,
        final_mix: finalMix,
        optimal_mix: optimalMix,
        proximity_score: proximityScore,
        draft_regret_count: draftRegretCount,
        empathy_bias: empathyBias,
      },
      slider_events: sliderEvents,
    })
  }

  const sliders = [
    { key: 'empathy', value: empathy, setter: setEmpathy },
    { key: 'logic', value: logic, setter: setLogic },
    { key: 'directness', value: directness, setter: setDirectness },
  ]

  return (
    <div className="relative min-h-screen px-6 py-10 text-deep-slate">
      <div className="pointer-events-none fixed inset-0 bg-grain" />
      <div className="relative mx-auto max-w-5xl border-2 border-deep-slate card-glass shadow-hard rounded-3xl p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">
              Tone Mixer
            </h1>
            <p className="mt-1 text-sm text-deep-slate/60 sm:text-base">
              Tune your reply with empathy, logic, and directness.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="shrink-0 rounded-2xl bg-canvas border border-deep-slate px-3 py-2 text-sm text-deep-slate hover:shadow-hard sm:px-4"
          >
            Back to Dashboard
          </Link>
        </div>

        {loading && (
          <div className="mt-12 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-cyan-400" />
          </div>
        )}

        {!loading && !scenario && (
          <div className="mt-12 text-center text-deep-slate/60">
            Could not load scenario. Please try again.
          </div>
        )}

        {!loading && scenario && (
          <div className="mt-6 sm:mt-8">
            <div className="mx-auto max-w-md rounded-3xl border border-deep-slate border-2 border-deep-slate card-glass shadow-hard rounded-3xl p-4 shadow-xl">
              <div className="mb-3 flex items-center gap-2 border-b border-deep-slate pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-deep-slate/80">
                  C
                </div>
                <div className="text-sm font-medium text-deep-slate/80">
                  Contact
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="max-w-[85%] self-start rounded-2xl rounded-bl-md bg-slate-700 px-4 py-3 text-sm leading-relaxed text-deep-slate">
                  {scenario.inbound_message}
                </div>

                {draftReply && (
                  <div className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-cyan-600 px-4 py-3 text-sm leading-relaxed text-white shadow-md">
                    <p>{draftReply}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mx-auto mt-6 max-w-md space-y-5">
              {sliders.map(({ key, value, setter }) => {
                const cfg = SLIDER_CONFIG.find((s) => s.key === key)
                return (
                  <div key={key}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium text-deep-slate">
                        {cfg.label}
                      </span>
                      <span className="text-xs text-deep-slate/50">
                        {cfg.description}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="w-8 text-right text-xs font-medium text-deep-slate/50">
                        {value}%
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={value}
                        disabled={sent}
                        onChange={(event) =>
                          handleSliderChange(
                            key,
                            setter,
                            Number(event.target.value),
                          )
                        }
                        className={`w-full ${cfg.thumb} cursor-pointer disabled:cursor-not-allowed disabled:opacity-50`}
                      />
                    </div>
                  </div>
                )
              })}

              <button
                type="button"
                onClick={handleSend}
                disabled={sent}
                className="mt-2 w-full rounded-2xl bg-mind-teal px-5 py-3 font-semibold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sent ? 'Sent ✓' : 'Send Reply'}
              </button>
            </div>
          </div>
        )}

        {report && (
          <div className="mx-auto mt-8 max-w-md rounded-3xl border border-mind-teal/40 border-2 border-deep-slate card-glass shadow-hard rounded-3xl p-6">
            <h3 className="text-lg font-semibold text-mind-teal">
              Tone Analysis
            </h3>

            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <span className="text-sm text-deep-slate/60">
                  Proximity to Ideal Tone
                </span>
                <span className="text-xl font-bold text-mind-teal">
                  {report.proximityScore}%
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <span className="text-sm text-deep-slate/60">
                  Self-Regulation (Draft Adjustments)
                </span>
                <span className="text-xl font-bold text-violet-400">
                  {report.draftRegretCount}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <span className="text-sm text-deep-slate/60">
                  Empathy-First Bias
                </span>
                <span
                  className={`text-xl font-bold ${report.empathyBias ? 'text-pink-400' : 'text-deep-slate/60'}`}
                >
                  {report.empathyBias ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            <div className="mt-4 border-t border-deep-slate pt-4">
              <p className="text-xs text-deep-slate/50">Your final mix</p>
              <div className="mt-2 flex gap-3">
                {Object.entries(report.finalMix).map(([key, val]) => {
                  const opt = report.optimalMix[key]
                  const diff = val - opt
                  const sign = diff > 0 ? '+' : ''
                  return (
                    <div
                      key={key}
                      className="flex-1 rounded-xl bg-canvas border border-deep-slate px-3 py-2 text-center"
                    >
                      <p className="text-xs capitalize text-deep-slate/60">
                        {key}
                      </p>
                      <p className="text-lg font-bold text-deep-slate">
                        {val}
                      </p>
                      <p
                        className={`text-xs ${Math.abs(diff) <= 10 ? 'text-green-600' : 'text-deep-slate/50'}`}
                      >
                        {sign}
                        {diff} vs ideal
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
