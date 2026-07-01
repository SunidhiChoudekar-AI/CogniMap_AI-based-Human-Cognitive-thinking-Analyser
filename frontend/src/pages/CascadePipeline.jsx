import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTelemetry } from '../components/TelemetryContext'

const AGE_CONFIG = {
  '11-14': { cols: 4, rows: 3, maxFailures: 1, cascadeDepth: 2, speed: 3000 },
  '15-24': { cols: 6, rows: 4, maxFailures: 2, cascadeDepth: 3, speed: 2500 },
  '25-64': { cols: 8, rows: 5, maxFailures: 3, cascadeDepth: 4, speed: 2000 },
  '65+':  { cols: 6, rows: 4, maxFailures: 2, cascadeDepth: 3, speed: 3500 },
}

function initPath(cols, rows) {
  const path = []
  for (let c = 0; c < cols; c++) {
    path.push({ row: Math.floor(rows / 2), col: c })
  }
  return path
}

function getNeighbors(row, col, cols, rows) {
  const n = []
  if (row > 0) n.push({ row: row - 1, col })
  if (row < rows - 1) n.push({ row: row + 1, col })
  if (col > 0) n.push({ row, col: col - 1 })
  if (col < cols - 1) n.push({ row, col: col + 1 })
  return n
}

export default function CascadePipeline() {
  const navigate = useNavigate()
  const { logEvent, ageBracket, sessionId, flushEvents } = useTelemetry()
  const cfg = AGE_CONFIG[ageBracket] || AGE_CONFIG['15-24']

  const [path, setPath] = useState(() => initPath(cfg.cols, cfg.rows))
  const [overheated, setOverheated] = useState([])
  const [rerouting, setRerouting] = useState(null)
  const [rerouteOptions, setRerouteOptions] = useState([])
  const [score, setScore] = useState(100)
  const [dropped, setDropped] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [microReport, setMicroReport] = useState(null)
  const [energyPos, setEnergyPos] = useState(null)
  const [lastFeedback, setLastFeedback] = useState(null)
  const intervalRef = useRef(null)
  const energyTimerRef = useRef(null)
  const pathSetRef = useRef(new Set(path.map((p) => `${p.row},${p.col}`)))

  const isPath = useCallback((row, col) => pathSetRef.current.has(`${row},${col}`), [])

  function animateEnergy(pathCells, speed) {
    let idx = 0
    setEnergyPos(pathCells[0] || null)
    function step() {
      idx++
      if (idx >= pathCells.length) {
        setEnergyPos(null)
        return
      }
      setEnergyPos(pathCells[idx])
      energyTimerRef.current = setTimeout(step, speed)
    }
    energyTimerRef.current = setTimeout(step, speed)
  }

  const spawnOverheat = useCallback(() => {
    const nonPath = []
    for (let r = 0; r < cfg.rows; r++) {
      for (let c = 0; c < cfg.cols; c++) {
        if (!isPath(r, c)) nonPath.push({ row: r, col: c })
      }
    }
    if (nonPath.length === 0) return
    const count = Math.min(cfg.maxFailures, nonPath.length)
    const newOverheated = []
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * nonPath.length)
      newOverheated.push(nonPath.splice(idx, 1)[0])
    }
    setOverheated((prev) => {
      const existing = new Set(prev.map((n) => `${n.row},${n.col}`))
      const unique = newOverheated.filter((n) => !existing.has(`${n.row},${n.col}`))
      return [...prev, ...unique]
    })
  }, [cfg.cols, cfg.rows, cfg.maxFailures, isPath])

  useEffect(() => {
    spawnOverheat()
    intervalRef.current = setInterval(() => {
      spawnOverheat()
    }, cfg.speed)
    return () => {
      clearInterval(intervalRef.current)
      clearTimeout(energyTimerRef.current)
    }
  }, [spawnOverheat, cfg.speed])

  const handleNodeClick = useCallback((row, col) => {
    if (completed || dropped) return
    if (isPath(row, col)) return

    const idx = overheated.findIndex((n) => n.row === row && n.col === col)
    if (idx === -1) return

    logEvent('cascade.reroute', { row, col })

    const pathArr = [...path]
    const preceding = [...pathArr].reverse().find((p) => p.col < col)
    if (!preceding) {
      setLastFeedback('Cannot reroute here')
      setTimeout(() => setLastFeedback(null), 1500)
      return
    }

    const options = getNeighbors(preceding.row, preceding.col, cfg.cols, cfg.rows)
      .filter((n) => !isPath(n.row, n.col))
      .slice(0, 3)

    if (options.length === 0) {
      setLastFeedback('No adjacent reroute available')
      setTimeout(() => setLastFeedback(null), 1500)
      return
    }

    setRerouting({ row, col })
    setRerouteOptions(options)
  }, [completed, dropped, isPath, overheated, path, cfg.cols, cfg.rows, logEvent])

  const confirmReroute = useCallback((target) => {
    const pathArr = [...path]
    const precedingIdx = pathArr.findLastIndex((p) => p.col < target.col)
    const segment = precedingIdx >= 0 ? pathArr.slice(0, precedingIdx + 1) : []
    segment.push({ row: target.row, col: target.col })
    for (let c = target.col + 1; c < cfg.cols; c++) {
      segment.push({ row: target.row, col: c })
    }
    setPath(segment)
    pathSetRef.current = new Set(segment.map((p) => `${p.row},${p.col}`))

    setOverheated((prev) => prev.filter((n) => !(n.row === target.row && n.col === target.col)))

    const cascadeNodes = getNeighbors(target.row, target.col, cfg.cols, cfg.rows)
      .filter((n) => !isPath(n.row, n.col))
      .slice(0, cfg.cascadeDepth)
    setOverheated((prev) => {
      const existing = new Set(prev.map((n) => `${n.row},${n.col}`))
      const unique = cascadeNodes.filter((n) => !existing.has(`${n.row},${n.col}`))
      return [...prev, ...unique]
    })

    animateEnergy(segment, 200)

    setRerouting(null)
    setRerouteOptions([])
    setScore((prev) => Math.max(0, prev - 5))

    if (segment.length >= cfg.cols * 2) {
      setCompleted(true)
      clearInterval(intervalRef.current)
      logEvent('cascade.complete', { finalScore: score, dropped })
      const finalScore = score
      setMicroReport({ score: finalScore, dropped: false })
    }
  }, [path, isPath, cfg.cols, cfg.rows, cfg.cascadeDepth, score, dropped, logEvent])

  useEffect(() => {
    if (overheated.length > cfg.maxFailures + 1) {
      setDropped(true)
      setCompleted(true)
      clearInterval(intervalRef.current)
      logEvent('cascade.drop', { overheatedCount: overheated.length })
      setMicroReport({ score, dropped: true })
    }
  }, [overheated, cfg.maxFailures, score, logEvent])

  return (
    <div className="relative min-h-screen px-6 py-10 text-deep-slate">
      <div className="pointer-events-none fixed inset-0 bg-grain" />
      <div className="mx-auto max-w-5xl border-2 border-deep-slate card-glass shadow-hard rounded-3xl p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Cascade Pipeline</h1>
            <p className="mt-1 text-sm text-mind-teal">Phase 2 &mdash; Problem Solving</p>
            <p className="mt-2 text-deep-slate/60">Reroute energy around overheating nodes before the cascade breaks the system.</p>
          </div>
          <Link to="/dashboard" className="rounded-2xl bg-canvas border border-deep-slate px-4 py-2 text-deep-slate hover:shadow-hard">
            Dashboard
          </Link>
        </div>

        {microReport ? (
          <div className="mt-8 rounded-3xl border border-mind-teal border-2 border-deep-slate card-glass shadow-hard rounded-3xl p-6">
            <h3 className="text-2xl font-semibold text-mind-teal">Micro-Report: Cascade Pipeline</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <p className="text-sm text-deep-slate/60">System Stability</p>
                <p className="text-3xl font-bold text-mind-teal">{microReport.score}%</p>
              </div>
              <div className="rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <p className="text-sm text-deep-slate/60">Status</p>
                <p className="text-3xl font-bold text-mind-teal">{microReport.dropped ? 'Failed' : 'Stabilized'}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/dashboard" className="inline-flex rounded-2xl bg-mind-teal px-6 py-3 font-semibold text-slate-950 hover:opacity-90">
                Back to Dashboard
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await flushEvents()
                  navigate('/report')
                }}
                className="inline-flex rounded-2xl border-2 border-deep-slate bg-white px-6 py-3 font-semibold text-deep-slate transition-pop hover:shadow-hard"
              >
                View Full Report
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-6">
              <div>
                <p className="text-sm text-deep-slate/60">Stability</p>
                <p className="text-2xl font-bold text-mind-teal">{score}%</p>
              </div>
              <div>
                <p className="text-sm text-deep-slate/60">Overheating nodes</p>
                <p className="text-2xl font-bold text-red-600">{overheated.length}</p>
              </div>
            </div>

            {lastFeedback && (
              <div className="mt-2 rounded-xl bg-red-50 text-red-600 px-4 py-2 text-sm text-red-600">
                {lastFeedback}
              </div>
            )}

            {rerouteOptions.length > 0 && (
              <div className="mt-2 rounded-xl bg-mind-teal/10 px-4 py-2 text-sm text-mind-teal">
                Click a highlighted cyan cell to reroute the path
              </div>
            )}

            <div className="relative mt-6">
              <div
                className="grid gap-2 rounded-2xl border border-deep-slate bg-canvas p-4"
                style={{ gridTemplateColumns: `repeat(${cfg.cols}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: cfg.rows }, (_, r) =>
                  Array.from({ length: cfg.cols }, (_, c) => {
                    const onPath = isPath(r, c)
                    const isOverheated = overheated.some((n) => n.row === r && n.col === c)
                    const isOption = rerouteOptions.some((n) => n.row === r && n.col === c)
                    const isSource = r === Math.floor(cfg.rows / 2) && c === 0
                    const isSink = r === Math.floor(cfg.rows / 2) && c === cfg.cols - 1
                    const isEnergyCell = energyPos && energyPos.row === r && energyPos.col === c

                    let bg = 'border-2 border-deep-slate bg-white shadow-hard rounded-3xl'
                    if (isSource) bg = 'bg-green-900'
                    else if (isSink) bg = 'bg-blue-900'
                    else if (isOverheated) bg = 'bg-red-900'
                    else if (isOption) bg = 'bg-cyan-900'
                    else if (onPath) bg = 'bg-canvas border border-deep-slate'

                    let border = 'border-deep-slate'
                    if (isOverheated) border = 'border-red-500'
                    else if (isOption) border = 'border-cyan-500'
                    else if (onPath) border = 'border-deep-slate'
                    if (isEnergyCell) border = 'border-mind-teal'

                    return (
                      <button
                        key={`${r}-${c}`}
                        type="button"
                        onClick={() => {
                          if (isOption) confirmReroute({ row: r, col: c })
                          else handleNodeClick(r, c)
                        }}
                        className={`relative aspect-square rounded-xl border ${bg} ${border} transition-all ${
                          isOverheated || isOption ? 'cursor-pointer hover:scale-105' : 'cursor-default'
                        } ${isOverheated ? 'animate-pulse' : ''}`}
                      >
                        {isSource && <span className="text-xs text-green-300">S</span>}
                        {isSink && <span className="text-xs text-blue-300">T</span>}
                        {isEnergyCell && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-lg shadow-cyan-300/70" />
                          </span>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <p className="mt-4 text-sm text-deep-slate/50">
              Click on a red overheating node, then choose a highlighted reroute path to redirect energy flow.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
