import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTelemetry } from '../components/TelemetryContext'
import QUESTIONS from '../data/calibrator-questions'

const AGED_CONFIG = {
  '11-14': { confidenceSteps: 20, label: 'Beginner' },
  '15-24': { confidenceSteps: 10, label: 'Standard' },
  '25-64': { confidenceSteps: 5, label: 'Advanced' },
  '65+': { confidenceSteps: 10, label: 'Standard' },
}

export default function ConfidenceCalibrator() {
  const { logEvent, ageBracket } = useTelemetry()
  const config = AGED_CONFIG[ageBracket] || AGED_CONFIG['15-24']
  const questions = QUESTIONS[ageBracket] || QUESTIONS['15-24']

  const shuffled = useMemo(() => {
    const qs = [...questions]
    for (let i = qs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[qs[i], qs[j]] = [qs[j], qs[i]]
    }
    return qs
  }, [questions])

  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [confidence, setConfidence] = useState(50)
  const [answers, setAnswers] = useState([])
  const [phase, setPhase] = useState('answer')
  const [done, setDone] = useState(false)
  const [report, setReport] = useState(null)
  const startRef = useRef(performance.now())

  const q = shuffled[current]

  function handleSubmit() {
    if (selected === null) return

    const isCorrect = selected === q.correctIndex

    logEvent('calibrator.answer', {
      question_id: q.id,
      selected,
      correct_index: q.correctIndex,
      is_correct: isCorrect,
    })
    logEvent('calibrator.confidence', {
      question_id: q.id,
      confidence_level: confidence,
    })

    setAnswers((prev) => [
      ...prev,
      {
        questionId: q.id,
        selected,
        correct: q.correctIndex,
        isCorrect,
        confidence,
      },
    ])
    setPhase('feedback')
  }

  function handleNext() {
    if (current + 1 >= shuffled.length) {
      finishModule([...answers, {
        questionId: q.id,
        selected,
        correct: q.correctIndex,
        isCorrect: selected === q.correctIndex,
        confidence,
      }])
    } else {
      setCurrent((c) => c + 1)
      setSelected(null)
      setConfidence(50)
      setPhase('answer')
    }
  }

  function finishModule(allAnswers) {
    const correctCount = allAnswers.filter((a) => a.isCorrect).length
    const avgConfidence = Math.round(
      allAnswers.reduce((s, a) => s + a.confidence, 0) / allAnswers.length,
    )

    const gaps = allAnswers.map((a) => {
      const accuracy = a.isCorrect ? 100 : 0
      return Math.abs(a.confidence - accuracy)
    })
    const calibrationScore = Math.max(0, Math.round(100 - gaps.reduce((s, g) => s + g, 0) / gaps.length))
    const avgGap = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length)
    const variance = Math.round(
      gaps.reduce((s, g) => s + (g - avgGap) ** 2, 0) / gaps.length,
    )

    const overconfident = avgConfidence > (correctCount / allAnswers.length) * 100 + 15
    const underconfident = avgConfidence < (correctCount / allAnswers.length) * 100 - 15

    const consistencyBonus = variance < 500 ? 5 : 0

    let metaScore = 20 + calibrationScore
    if (overconfident) metaScore -= 10
    if (underconfident) metaScore += 10
    metaScore = Math.min(100, Math.max(0, metaScore + consistencyBonus))

    logEvent('calibrator.complete', {
      total_questions: allAnswers.length,
      correct_count: correctCount,
      avg_confidence: avgConfidence,
      calibration_score: calibrationScore,
      overconfidence_bias: overconfident,
      underconfidence_bias: underconfident,
      metacognition_score: metaScore,
    })

    setDone(true)
    setReport({
      correctCount,
      totalQuestions: allAnswers.length,
      avgConfidence,
      calibrationScore,
      overconfident,
      underconfident,
      metaScore,
      avgGap,
    })
  }

  if (done && report) {
    return (
      <div className="relative min-h-screen px-6 py-10 text-deep-slate">
        <div className="pointer-events-none fixed inset-0 bg-grain" />
        <div className="relative mx-auto max-w-5xl border-2 border-deep-slate card-glass shadow-hard rounded-3xl p-8">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold sm:text-3xl">Confidence Calibrator</h1>
            <Link to="/dashboard" className="rounded-2xl bg-canvas border border-deep-slate px-3 py-2 text-sm text-deep-slate hover:shadow-hard sm:px-4">Dashboard</Link>
          </div>
          <div className="mx-auto mt-8 max-w-md rounded-3xl border border-indigo-600/40 border-2 border-deep-slate card-glass shadow-hard rounded-3xl p-6">
            <h3 className="text-lg font-semibold text-indigo-300">Metacognition Report</h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <span className="text-sm text-deep-slate/60">Metacognition Score</span>
                <span className="text-xl font-bold text-indigo-400">{report.metaScore}%</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <span className="text-sm text-deep-slate/60">Calibration Accuracy</span>
                <span className="text-xl font-bold text-deep-slate">{report.calibrationScore}%</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <span className="text-sm text-deep-slate/60">Correct Answers</span>
                <span className="text-xl font-bold text-deep-slate">{report.correctCount}/{report.totalQuestions}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <span className="text-sm text-deep-slate/60">Avg Confidence</span>
                <span className="text-xl font-bold text-deep-slate">{report.avgConfidence}%</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <span className="text-sm text-deep-slate/60">Avg Calibration Gap</span>
                <span className="text-xl font-bold text-deep-slate">{report.avgGap}%</span>
              </div>
              {report.overconfident && (
                <p className="rounded-2xl bg-amber-900/30 px-4 py-3 text-sm text-amber-300">Tendency toward overconfidence</p>
              )}
              {report.underconfident && (
                <p className="rounded-2xl bg-green-50 text-green-600 px-4 py-3 text-sm text-emerald-300">Tendency toward underconfidence (humble)</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isCorrect = phase === 'feedback' && selected === q.correctIndex

  return (
    <div className="relative min-h-screen px-6 py-10 text-deep-slate">
      <div className="pointer-events-none fixed inset-0 bg-grain" />
      <div className="relative mx-auto max-w-5xl border-2 border-deep-slate card-glass shadow-hard rounded-3xl p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">Confidence Calibrator</h1>
            <p className="mt-1 text-sm text-deep-slate/60">Answer each question, then rate your confidence.</p>
          </div>
          <Link to="/dashboard" className="shrink-0 rounded-2xl bg-canvas border border-deep-slate px-3 py-2 text-sm text-deep-slate hover:shadow-hard sm:px-4">Dashboard</Link>
        </div>

        <div className="mx-auto mt-6 max-w-lg">
          <div className="mb-4 flex items-center justify-between text-sm text-deep-slate/50">
            <span>Question {current + 1} of {shuffled.length}</span>
            <span>{config.label} mode</span>
          </div>

          <div className="rounded-3xl border border-deep-slate border-2 border-deep-slate card-glass shadow-hard rounded-3xl p-6">
            <p className="text-lg font-medium text-deep-slate">{q.question}</p>

            <div className="mt-5 grid gap-3">
              {q.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={phase === 'feedback'}
                  onClick={() => setSelected(idx)}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    selected === idx
                      ? phase === 'feedback'
                        ? isCorrect
                          ? 'border-emerald-500 bg-green-50 text-green-600 text-emerald-200'
                          : 'border-red-500 bg-red-50 text-red-600 text-red-200'
                        : 'border-cyan-500 bg-cyan-900/20 text-cyan-200'
                      : 'border-deep-slate bg-canvas border border-deep-slate text-deep-slate/80 hover:border-slate-500'
                  } ${phase === 'feedback' ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <span className="mr-3 text-xs text-deep-slate/50">{String.fromCharCode(65 + idx)}</span>
                  {opt}
                  {phase === 'feedback' && idx === q.correctIndex && (
                    <span className="ml-2 text-green-600">✓</span>
                  )}
                </button>
              ))}
            </div>

            {phase === 'answer' && (
              <>
                <div className="mt-6">
                  <label className="text-sm text-deep-slate/60">
                    How confident are you? <span className="font-bold text-mind-teal">{confidence}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step={config.confidenceSteps}
                    value={confidence}
                    onChange={(e) => setConfidence(Number(e.target.value))}
                    className="accent-cyan-500 accent-mind-teal mt-2 w-full"
                  />
                  <div className="mt-1 flex justify-between text-xs text-slate-600">
                    <span>Not confident</span>
                    <span>Very confident</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={selected === null}
                  className="mt-5 w-full rounded-2xl bg-mind-teal px-5 py-3 font-semibold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Submit Answer
                </button>
              </>
            )}

            {phase === 'feedback' && (
              <div className="mt-5">
                <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                  isCorrect ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                }`}>
                  {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                  <span className="ml-2 text-xs opacity-70">
                    Your confidence: {confidence}%
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-3 rounded-2xl bg-canvas border border-deep-slate px-4 py-3 text-xs text-deep-slate/60">
                  <span>Calibration:</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isCorrect
                          ? confidence >= 70
                            ? 'bg-emerald-500'
                            : confidence <= 30
                              ? 'bg-amber-500'
                              : 'bg-mind-teal'
                          : confidence >= 70
                            ? 'bg-red-600'
                            : confidence <= 30
                              ? 'bg-emerald-500'
                              : 'bg-mind-teal'
                      }`}
                      style={{ width: `${confidence}%` }}
                    />
                  </div>
                  <span>
                    {isCorrect
                      ? confidence >= 70
                        ? 'Well calibrated'
                        : confidence <= 30
                          ? 'Underconfident'
                          : 'Moderate'
                      : confidence >= 70
                        ? 'Overconfident'
                        : confidence <= 30
                          ? 'Good awareness'
                          : 'Moderate'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  className="mt-4 w-full rounded-2xl bg-mind-teal px-5 py-3 font-semibold text-slate-950 transition hover:opacity-90"
                >
                  {current + 1 >= shuffled.length ? 'See Results' : 'Next Question'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
