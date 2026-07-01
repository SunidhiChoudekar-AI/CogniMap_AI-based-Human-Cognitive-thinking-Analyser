import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTelemetry } from '../components/TelemetryContext'

const AGED_CONFIG = {
  '11-14': { size: 4, probes: 8, traps: 0, treasures: 4, label: 'Discovery' },
  '15-24': { size: 5, probes: 10, traps: 3, treasures: 5, label: 'Balanced' },
  '25-64': { size: 6, probes: 14, traps: 5, treasures: 7, label: 'Risky' },
  '65+': { size: 5, probes: 12, traps: 3, treasures: 5, label: 'Careful' },
}

const RESULT_ICONS = {
  treasure: '💎',
  resource: '🪙',
  empty: '⚪',
  trap: '💀',
  unknown: '❓',
}

function generateGrid(size, traps, treasures) {
  const total = size * size
  const cells = Array(total).fill('empty')
  const indices = Array.from({ length: total }, (_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  let pos = 0
  for (let t = 0; t < traps && pos < total; t++, pos++) cells[indices[pos]] = 'trap'
  for (let t = 0; t < treasures && pos < total; t++, pos++) cells[indices[pos]] = 'treasure'
  for (let i = pos; i < total; i++) {
    if (Math.random() < 0.4) cells[indices[i]] = 'resource'
  }
  return cells
}

const POINT_VALUES = { treasure: 3, resource: 1, empty: 0, trap: -2 }

export default function FogOfWar() {
  const { logEvent, ageBracket } = useTelemetry()
  const config = AGED_CONFIG[ageBracket] || AGED_CONFIG['15-24']

  const grid = useMemo(
    () => generateGrid(config.size, config.traps, config.treasures),
    [config.size, config.traps, config.treasures],
  )

  const [revealed, setRevealed] = useState({})
  const [probesLeft, setProbesLeft] = useState(config.probes)
  const [score, setScore] = useState(0)
  const [trapsHit, setTrapsHit] = useState(0)
  const [banked, setBanked] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [report, setReport] = useState(null)
  const [lastProbe, setLastProbe] = useState(null)
  const startRef = useRef(performance.now())
  const probesUsedRef = useRef(0)

  const maxPossible = useMemo(() => {
    return grid.reduce((sum, cell) => {
      if (cell === 'treasure') return sum + 3
      if (cell === 'resource') return sum + 1
      return sum
    }, 0)
  }, [grid])

  const bankVisible = !gameOver && !banked && probesLeft > 0

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Enter' && bankVisible) {
        handleBank()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  function handleProbe(index) {
    if (revealed[index] !== undefined || probesLeft <= 0 || banked || gameOver) return

    probesUsedRef.current++
    const result = grid[index]
    const pts = POINT_VALUES[result]
    const newScore = score + pts
    const newTraps = result === 'trap' ? trapsHit + 1 : trapsHit

    setRevealed((r) => ({ ...r, [index]: result }))
    setProbesLeft((p) => p - 1)
    setScore(newScore)
    setTrapsHit(newTraps)
    setLastProbe({ index, result, pts })

    logEvent('fog.probe', {
      row: Math.floor(index / config.size),
      col: index % config.size,
      result,
      score_after: newScore,
      probes_remaining: probesLeft - 1,
      traps_hit: newTraps,
    })

    if (newTraps >= 3 && config.traps > 0) {
      logEvent('fog.bank', { final_score: 0, probes_used: probesUsedRef.current, traps_hit: newTraps, reason: 'three_traps' })
      setGameOver(true)
      finishModule(0, probesUsedRef.current, newTraps, true)
    } else if (probesLeft - 1 <= 0) {
      logEvent('fog.bank', { final_score: newScore, probes_used: probesUsedRef.current, traps_hit: newTraps, reason: 'no_probes_left' })
      finishModule(newScore, probesUsedRef.current, newTraps, false)
    }
  }

  function handleBank() {
    if (banked || gameOver) return
    setBanked(true)
    logEvent('fog.bank', { final_score: score, probes_used: probesUsedRef.current, traps_hit: trapsHit, reason: 'banked_early' })
    finishModule(score, probesUsedRef.current, trapsHit, false)
  }

  function finishModule(finalScore, probesUsed, trapsTriggered, lostAll) {
    const efficiency = maxPossible > 0 ? Math.round((finalScore / maxPossible) * 40) : 0
    const bankBonus = trapsTriggered >= 2 && !lostAll ? 15 : 0
    const penalty = lostAll ? 15 : 0
    const probeEfficiency = probesUsed >= Math.floor(config.probes * 0.7) ? 5 : 0
    const fogScore = Math.min(100, Math.max(0, 20 + efficiency + bankBonus + probeEfficiency - penalty))

    logEvent('fog.complete', {
      total_probes: probesUsed,
      traps_hit: trapsTriggered,
      score: lostAll ? 0 : finalScore,
      banked_early: !lostAll && probesUsed < config.probes,
      max_possible: maxPossible,
      fog_score: fogScore,
    })

    setReport({
      finalScore: lostAll ? 0 : finalScore,
      probesUsed,
      trapsTriggered,
      maxPossible,
      lostAll,
      fogScore,
      bankedEarly: !lostAll && probesUsed < config.probes,
    })
  }

  function getCellColor(result) {
    if (!result) return 'bg-canvas border border-deep-slate hover:shadow-hard cursor-pointer'
    if (result === 'treasure') return 'bg-amber-900/60 border-amber-500/40'
    if (result === 'resource') return 'bg-cyan-900/40 border-cyan-500/30'
    if (result === 'empty') return 'bg-slate-700/50'
    return 'bg-red-900/40 border-red-500/40'
  }

  if (report) {
    return (
      <div className="relative min-h-screen px-6 py-10 text-deep-slate">
        <div className="pointer-events-none fixed inset-0 bg-grain" />
        <div className="relative mx-auto max-w-5xl border-2 border-deep-slate card-glass shadow-hard rounded-3xl p-8">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold sm:text-3xl">Fog of War</h1>
            <Link to="/dashboard" className="rounded-2xl bg-canvas border border-deep-slate px-3 py-2 text-sm text-deep-slate hover:shadow-hard sm:px-4">Dashboard</Link>
          </div>
          <div className="mx-auto mt-8 max-w-md rounded-3xl border border-orange-600/40 border-2 border-deep-slate card-glass shadow-hard rounded-3xl p-6">
            <h3 className="text-lg font-semibold text-orange-300">Decision Making Report</h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <span className="text-sm text-deep-slate/60">Decision Score</span>
                <span className="text-xl font-bold text-orange-400">{report.fogScore}%</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <span className="text-sm text-deep-slate/60">Score Earned</span>
                <span className="text-xl font-bold text-deep-slate">{report.finalScore} / {report.maxPossible}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <span className="text-sm text-deep-slate/60">Probes Used</span>
                <span className="text-xl font-bold text-deep-slate">{report.probesUsed} / {config.probes}</span>
              </div>
              {report.bankedEarly && (
                <div className="flex items-center justify-between rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                  <span className="text-sm text-deep-slate/60">Banked Early</span>
                  <span className="text-xl font-bold text-mind-teal">&#10003;</span>
                </div>
              )}
              {report.lostAll && (
                <div className="flex items-center justify-between rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                  <span className="text-sm text-deep-slate/60">Hit 3 Traps</span>
                  <span className="text-xl font-bold text-red-600">Loss</span>
                </div>
              )}
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
            <h1 className="text-2xl font-semibold sm:text-3xl">Fog of War</h1>
            <p className="mt-1 text-sm text-deep-slate/60">Probe cells for resources. Avoid traps. Bank wisely.</p>
          </div>
          <Link to="/dashboard" className="shrink-0 rounded-2xl bg-canvas border border-deep-slate px-3 py-2 text-sm text-deep-slate hover:shadow-hard sm:px-4">Dashboard</Link>
        </div>

        <div className="mx-auto mt-6 max-w-md">
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border-2 border-deep-slate card-glass shadow-hard rounded-3xl px-4 py-3 text-center">
              <p className="text-xs text-deep-slate/50">Score</p>
              <p className="text-xl font-bold text-mind-teal">{score}</p>
            </div>
            <div className="rounded-2xl border-2 border-deep-slate card-glass shadow-hard rounded-3xl px-4 py-3 text-center">
              <p className="text-xs text-deep-slate/50">Probes</p>
              <p className="text-xl font-bold text-deep-slate">{probesLeft}</p>
            </div>
            <div className="rounded-2xl border-2 border-deep-slate card-glass shadow-hard rounded-3xl px-4 py-3 text-center">
              <p className="text-xs text-deep-slate/50">Traps hit</p>
              <p className="text-xl font-bold text-red-600">{trapsHit}/{config.traps}</p>
            </div>
          </div>

          {lastProbe && (
            <div className="mb-4 animate-pulse rounded-2xl bg-canvas border border-deep-slate px-4 py-2 text-center text-sm text-deep-slate/80">
              {RESULT_ICONS[lastProbe.result]} Cell revealed: {lastProbe.result}
              {lastProbe.pts !== 0 && ` (${lastProbe.pts > 0 ? '+' : ''}${lastProbe.pts})`}
            </div>
          )}

          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${config.size}, 1fr)` }}
          >
            {grid.map((_, index) => {
              const result = revealed[index]
              const isLast = lastProbe?.index === index
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleProbe(index)}
                  disabled={result !== undefined || probesLeft <= 0 || gameOver}
                  className={`flex aspect-square items-center justify-center rounded-xl border text-xl transition disabled:cursor-not-allowed ${
                    result
                      ? `${getCellColor(result)} ${isLast ? 'scale-105' : ''}`
                      : 'border-deep-slate bg-canvas border border-deep-slate text-deep-slate/50 hover:border-slate-500 disabled:opacity-40'
                  }`}
                >
                  {result ? RESULT_ICONS[result] : '❓'}
                </button>
              )
            })}
          </div>

          {!gameOver && !banked && probesLeft > 0 && (
            <button
              type="button"
              onClick={handleBank}
              className="mt-5 w-full rounded-2xl bg-amber-600 px-5 py-3 font-semibold text-white transition hover:bg-amber-500"
            >
              Bank Score ({score} pts) & End
            </button>
          )}

          {(gameOver || banked) && (
            <p className="mt-4 text-center text-sm text-deep-slate/60">
              {gameOver ? 'You hit 3 traps — score lost.' : 'Score banked. Report loading...'}
            </p>
          )}

          <div className="mt-3 text-center text-xs text-slate-600">
            Difficulty: {config.label} ({config.size}&times;{config.size}, {config.probes} probes)
          </div>
        </div>
      </div>
    </div>
  )
}
