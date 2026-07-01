import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTelemetry } from '../components/TelemetryContext'

const AGED_CONFIG = {
  '11-14': { rounds: 3, forgiveness: 0, probeChance: 0, label: 'Simple' },
  '15-24': { rounds: 5, forgiveness: 0.1, probeChance: 0, label: 'Standard' },
  '25-64': { rounds: 7, forgiveness: 0, probeChance: 0.15, label: 'Advanced' },
  '65+': { rounds: 5, forgiveness: 0.2, probeChance: 0, label: 'Patient' },
}

function computeAiChoice(history, config) {
  if (history.length === 0) return 'share'
  const last = history[history.length - 1]
  if (config.probeChance > 0 && Math.random() < config.probeChance) return 'keep'
  if (last.user === 'keep') return 'keep'
  if (last.user === 'share' && Math.random() < config.forgiveness) return 'share'
  return last.user
}

function getOutcome(user, ai) {
  if (user === 'share' && ai === 'share') return { userScore: 3, aiScore: 3, label: 'Mutual trust — both gain 3' }
  if (user === 'keep' && ai === 'keep') return { userScore: 1, aiScore: 1, label: 'Mutual caution — both gain 1' }
  if (user === 'share' && ai === 'keep') return { userScore: 0, aiScore: 5, label: 'You were exploited — AI gains 5' }
  return { userScore: 5, aiScore: 0, label: 'You exploited — you gain 5' }
}

const AI_EMOJIS = { thinking: '🤔', share: '🤝', keep: '💰' }

export default function TrustWager() {
  const { logEvent, ageBracket } = useTelemetry()
  const config = AGED_CONFIG[ageBracket] || AGED_CONFIG['15-24']

  const [round, setRound] = useState(0)
  const [history, setHistory] = useState([])
  const [userScore, setUserScore] = useState(0)
  const [aiChoice, setAiChoice] = useState(null)
  const [thinking, setThinking] = useState(false)
  const [confidence, setConfidence] = useState(3)
  const [confidences, setConfidences] = useState([])
  const [done, setDone] = useState(false)
  const [report, setReport] = useState(null)
  const [roundResult, setRoundResult] = useState(null)
  const [phase, setPhase] = useState('choose')

  const startRef = useRef(performance.now())

  const handleChoice = useCallback(
    (choice) => {
      if (thinking || phase !== 'choose') return
      setThinking(true)
      setAiChoice(null)
      setRoundResult(null)

      setTimeout(() => {
        const ai = computeAiChoice(history, config)
        setAiChoice(ai)
        const outcome = getOutcome(choice, ai)
        setRoundResult(outcome)
        setUserScore((s) => s + outcome.userScore)
        setHistory((h) => [...h, { user: choice, ai }])
        setPhase('result')
        setThinking(false)
      }, 1200)
    },
    [thinking, phase, history, config],
  )

  function handleConfirmResult() {
    logEvent('trust.wager', {
      round: round + 1,
      user_choice: history[history.length - 1].user,
      ai_choice: history[history.length - 1].ai,
      round_score: roundResult.userScore,
      cumulative_score: userScore,
    })

    logEvent('trust.confidence', {
      round: round + 1,
      rating: confidence,
    })
    setConfidences((c) => [...c, confidence])

    if (round + 1 >= config.rounds) {
      finishModule([...confidences, confidence], [...history, { user: history[history.length - 1].user, ai: history[history.length - 1].ai }], userScore)
    } else {
      setRound((r) => r + 1)
      setAiChoice(null)
      setRoundResult(null)
      setPhase('choose')
      setConfidence(3)
    }
  }

  function finishModule(allConfidences, allHistory, finalScore) {
    const cooperateCount = allHistory.filter((h) => h.user === 'share').length
    const cooperatePct = Math.round((cooperateCount / allHistory.length) * 100)

    const reciprocity = allHistory.filter(
      (h, i) => i > 0 && h.user === allHistory[i - 1].ai,
    ).length
    const reciprocityScore = Math.round((reciprocity / (allHistory.length - 1)) * 100)

    const maxPossible = allHistory.length * 5
    const scoreRatio = finalScore / maxPossible

    let socialScore = 20
    socialScore += allHistory.filter((h, i) => i > 0 && h.user === 'share' && allHistory[i - 1].ai === 'share').length * 10
    socialScore += allHistory.filter((h, i) => i > 0 && h.user === 'keep' && allHistory[i - 1].ai === 'keep').length * 5
    if (cooperatePct > 50) socialScore += 15
    if (scoreRatio > 0.6) socialScore += 10
    socialScore = Math.min(100, socialScore)

    logEvent('trust.complete', {
      total_rounds: allHistory.length,
      cooperate_pct: cooperatePct,
      defection_pct: 100 - cooperatePct,
      final_score: finalScore,
      reciprocity_score: reciprocityScore,
      social_cognition_score: socialScore,
    })

    setDone(true)
    setReport({
      cooperatePct,
      finalScore,
      reciprocityScore,
      socialScore,
      roundsPlayed: allHistory.length,
    })
  }

  if (done && report) {
    return (
      <div className="relative min-h-screen px-6 py-10 text-deep-slate">
        <div className="pointer-events-none fixed inset-0 bg-grain" />
        <div className="relative mx-auto max-w-5xl border-2 border-deep-slate card-glass shadow-hard rounded-3xl p-8">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold sm:text-3xl">Trust Wager</h1>
            <Link to="/dashboard" className="rounded-2xl bg-canvas border border-deep-slate px-3 py-2 text-sm text-deep-slate hover:shadow-hard sm:px-4">Dashboard</Link>
          </div>
          <div className="mx-auto mt-8 max-w-md rounded-3xl border border-emerald-600/40 border-2 border-deep-slate card-glass shadow-hard rounded-3xl p-6">
            <h3 className="text-lg font-semibold text-emerald-300">Social Cognition Report</h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <span className="text-sm text-deep-slate/60">Social Cognition Score</span>
                <span className="text-xl font-bold text-green-600">{report.socialScore}%</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <span className="text-sm text-deep-slate/60">Cooperation Rate</span>
                <span className="text-xl font-bold text-deep-slate">{report.cooperatePct}%</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <span className="text-sm text-deep-slate/60">Final Score</span>
                <span className="text-xl font-bold text-deep-slate">{report.finalScore}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <span className="text-sm text-deep-slate/60">Reciprocity</span>
                <span className="text-xl font-bold text-deep-slate">{report.reciprocityScore}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen px-6 py-10 text-deep-slate">
      <div className="pointer-events-none fixed inset-0 bg-grain" />
      <div className="relative mx-auto max-w-5xl border-2 border-deep-slate card-glass shadow-hard rounded-3xl p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">Trust Wager</h1>
            <p className="mt-1 text-sm text-deep-slate/60">Decide: share or keep? Round {round + 1} of {config.rounds}</p>
          </div>
          <Link to="/dashboard" className="shrink-0 rounded-2xl bg-canvas border border-deep-slate px-3 py-2 text-sm text-deep-slate hover:shadow-hard sm:px-4">Dashboard</Link>
        </div>

        <div className="mx-auto mt-6 max-w-md">
          <div className="mb-4 flex items-center justify-between rounded-2xl border-2 border-deep-slate card-glass shadow-hard rounded-3xl px-5 py-3 text-sm">
            <span className="text-deep-slate/60">Your score</span>
            <span className="text-xl font-bold text-mind-teal">{userScore}</span>
          </div>

          {phase === 'choose' && !thinking && (
            <>
              <div className="rounded-3xl border border-deep-slate border-2 border-deep-slate card-glass shadow-hard rounded-3xl p-6 text-center">
                <p className="mb-2 text-xs uppercase tracking-wider text-deep-slate/50">Payoff Matrix</p>
                <div className="mx-auto grid max-w-[260px] grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-canvas border border-deep-slate p-2 text-deep-slate/60">Both Share → +3 each</div>
                  <div className="rounded-xl bg-canvas border border-deep-slate p-2 text-deep-slate/60">Both Keep → +1 each</div>
                  <div className="rounded-xl bg-canvas border border-deep-slate p-2 text-deep-slate/60">You Share / AI Keeps → +0 / +5</div>
                  <div className="rounded-xl bg-canvas border border-deep-slate p-2 text-deep-slate/60">You Keep / AI Shares → +5 / +0</div>
                </div>
              </div>

              <div className="mt-6 flex gap-4">
                <button
                  type="button"
                  onClick={() => handleChoice('share')}
                  className="flex-1 rounded-2xl bg-warm-coral hover:opacity-90 text-white font-bold px-5 py-4 transition"
                >
                  Share 🤝
                </button>
                <button
                  type="button"
                  onClick={() => handleChoice('keep')}
                  className="flex-1 rounded-2xl bg-warm-coral hover:opacity-90 text-white font-bold px-5 py-4 transition"
                >
                  Keep 💰
                </button>
              </div>
            </>
          )}

          {thinking && (
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-deep-slate border-2 border-deep-slate card-glass shadow-hard rounded-3xl py-12">
              <span className="text-5xl">{AI_EMOJIS.thinking}</span>
              <p className="text-sm text-deep-slate/60">AI is deciding...</p>
            </div>
          )}

          {phase === 'result' && roundResult && (
            <div className="rounded-3xl border border-deep-slate border-2 border-deep-slate card-glass shadow-hard rounded-3xl p-6 text-center">
              <div className="mb-4 flex items-center justify-center gap-8">
                <div className="text-center">
                  <p className="text-xs text-deep-slate/50">You chose</p>
                  <p className="mt-1 text-3xl">{history[history.length - 1].user === 'share' ? '🤝' : '💰'}</p>
                  <p className="text-xs font-medium text-deep-slate/80">{history[history.length - 1].user === 'share' ? 'Share' : 'Keep'}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-deep-slate/50">AI chose</p>
                  <p className="mt-1 text-3xl">{AI_EMOJIS[aiChoice]}</p>
                  <p className="text-xs font-medium text-deep-slate/80">{aiChoice === 'share' ? 'Share' : 'Keep'}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-mind-teal">{roundResult.label}</p>
              <p className="mt-1 text-2xl font-bold text-deep-slate">+{roundResult.userScore} pts</p>

              <div className="mt-4">
                <label className="text-sm text-deep-slate/60">Confidence in your choice (1-5):</label>
                <div className="mt-2 flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setConfidence(n)}
                      className={`h-10 w-10 rounded-full text-sm font-bold transition ${
                        confidence === n
                          ? 'bg-warm-coral text-slate-950'
                          : 'bg-slate-700 text-deep-slate/80 hover:bg-slate-600'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmResult}
                className="mt-5 w-full rounded-2xl bg-warm-coral px-5 py-3 font-semibold text-slate-950 transition hover:opacity-90"
              >
                {round + 1 >= config.rounds ? 'See Results' : 'Next Round'}
              </button>
            </div>
          )}

          <div className="mt-4 text-center text-xs text-slate-600">
            AI Strategy: {config.label}
          </div>
        </div>
      </div>
    </div>
  )
}
