import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { useTelemetry } from '../components/TelemetryContext'

const ItemTypes = { PRISM: 'prism' }

const AGE_CONFIG = {
  '11-14': { cols: 6, rows: 4, hiddenCount: 2, pulseLimit: 3, targetDiff: 1,
             prismTypes: ['reflect-right', 'pass-straight'], beamSpeed: 80,
             targetColors: ['cyan', 'yellow'] },
  '15-24': { cols: 7, rows: 5, hiddenCount: 3, pulseLimit: 4, targetDiff: 2,
             prismTypes: ['reflect-right', 'reflect-left', 'pass-straight', 'split'], beamSpeed: 120,
             targetColors: ['cyan', 'magenta', 'yellow'] },
  '25-64': { cols: 8, rows: 5, hiddenCount: 5, pulseLimit: 5, targetDiff: 2,
             prismTypes: ['reflect-right', 'reflect-left', 'pass-straight', 'split', 'delay'], beamSpeed: 160,
             targetColors: ['cyan', 'magenta', 'yellow', 'white'] },
  '65+':   { cols: 7, rows: 5, hiddenCount: 3, pulseLimit: 6, targetDiff: 1,
             prismTypes: ['reflect-right', 'reflect-left', 'pass-straight', 'split'], beamSpeed: 0,
             targetColors: ['cyan', 'magenta', 'yellow'], noTimer: true },
}

const COLORS = ['#06b6d4', '#ec4899', '#eab308', '#f8fafc']
const COLOR_NAMES = ['cyan', 'magenta', 'yellow', 'white']

const PRISM_META = {
  'reflect-right': { label: '↱', color: '#06b6d4', desc: 'Turns beam 90° clockwise' },
  'reflect-left':  { label: '↰', color: '#8b5cf6', desc: 'Turns beam 90° counter-clockwise' },
  'pass-straight': { label: '→', color: '#22c55e', desc: 'Beam passes straight through' },
  'split':         { label: '↕', color: '#f59e0b', desc: 'Splits beam in two directions' },
  'delay':         { label: '⏱', color: '#f43f5e', desc: 'Holds beam momentarily' },
}

const DIR = { E: [0, 1], W: [0, -1], N: [-1, 0], S: [1, 0] }
const REFLECT_R = { E: 'S', S: 'W', W: 'N', N: 'E' }
const REFLECT_L = { E: 'N', N: 'W', W: 'S', S: 'E' }

const HINTS = [
  'Observe what happens when the beam passes through certain cells...',
  'Some cells have hidden effects. Try different paths through the grid.',
  'The beam\'s color matters at the destination. Watch how colors shift.',
  'Pay attention to which cells change the beam\'s direction unexpectedly.',
]

const BOUNDARY_EFFECTS = ['color-shift', 'color-lock', 'reflect', 'absorb']

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function generateGrid(cfg) {
  const rows = cfg.rows
  const cols = cfg.cols
  const grid = []
  for (let r = 0; r < rows; r++) {
    grid[r] = []
    for (let c = 0; c < cols; c++) {
      grid[r][c] = { type: 'empty', prism: null, hiddenEffect: null, requiredColorIndex: null }
    }
  }
  const startRow = Math.floor(rows / 2)
  const targetRow = Math.min(rows - 1, Math.max(0, startRow + (Math.random() > 0.5 ? cfg.targetDiff : -cfg.targetDiff)))
  const targetColorIdx = Math.floor(Math.random() * cfg.targetColors.length)

  grid[startRow][0].type = 'start'
  grid[targetRow][cols - 1].type = 'target'
  grid[targetRow][cols - 1].requiredColorIndex = targetColorIdx

  const candidates = []
  for (let r = 0; r < rows; r++) {
    for (let c = 1; c < cols - 1; c++) {
      if (r !== startRow || c > 2) candidates.push({ row: r, col: c })
    }
  }
  const chosen = shuffle(candidates).slice(0, cfg.hiddenCount)
  chosen.forEach(({ row, col }) => {
    grid[row][col].hiddenEffect = pickRandom(BOUNDARY_EFFECTS)
    if (grid[row][col].hiddenEffect === 'color-lock') {
      grid[row][col].requiredColorIndex = Math.floor(Math.random() * cfg.targetColors.length)
    }
  })

  return { grid, startRow, targetRow, targetColorIdx, cols, rows }
}

function computeBeamPaths(grid, cfg, startRow, targetRow, targetCol) {
  const allPaths = []

  function trace(row, col, dir, colorIdx, visited, branchPath) {
    const key = `${row},${col},${dir},${colorIdx}`
    if (visited.has(key)) return
    visited.add(key)

    const steps = []
    let cr = row, cc = col, cdir = dir, ccolor = colorIdx
    let alive = true
    let maxIter = 200

    while (alive && maxIter-- > 0) {
      steps.push({ row: cr, col: cc, color: COLORS[ccolor], dir: cdir })

      const cell = grid[cr][cc]

      if (cell.hiddenEffect) {
        switch (cell.hiddenEffect) {
          case 'color-shift': ccolor = (ccolor + 1) % COLORS.length; break
          case 'color-lock':
            if (cell.requiredColorIndex !== null && ccolor !== cell.requiredColorIndex) {
              steps.push({ row: cr, col: cc, color: COLORS[ccolor], dir: cdir, action: 'blocked' })
              alive = false
            }
            break
          case 'reflect': cdir = REFLECT_R[cdir] || 'E'; break
          case 'absorb':
            steps.push({ row: cr, col: cc, color: COLORS[ccolor], dir: cdir, action: 'absorbed' })
            alive = false
            break
        }
      }

      if (!alive) break

      if (cell.prism) {
        switch (cell.prism.type) {
          case 'reflect-right': cdir = REFLECT_R[cdir] || 'E'; break
          case 'reflect-left': cdir = REFLECT_L[cdir] || 'E'; break
          case 'pass-straight': break
          case 'split': {
            const perpDir = REFLECT_R[cdir] || 'S'
            trace(cr, cc, perpDir, ccolor, new Set(visited), [...branchPath, ...steps])
            break
          }
          case 'delay': break
        }
      }

      const [dr, dc] = DIR[cdir] || [0, 1]
      cr += dr
      cc += dc

      if (cr < 0 || cr >= cfg.rows || cc < 0 || cc >= cfg.cols) {
        steps.push({ row: cr, col: cc, color: COLORS[ccolor], dir: cdir, action: 'out-of-bounds' })
        alive = false
        break
      }

      if (cc === targetCol && cr === targetRow) {
        const cell2 = grid[cr][cc]
        steps.push({
          row: cr, col: cc, color: COLORS[ccolor], dir: cdir,
          action: cell2.requiredColorIndex === ccolor ? 'success' : 'wrong-color',
        })
        alive = false
        break
      }
    }

    allPaths.push({ steps, terminated: !alive })
  }

  trace(startRow, 0, 'E', 0, new Set(), [])
  return allPaths
}

function DraggablePrism({ prismType, remaining }) {
  const meta = PRISM_META[prismType]
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: ItemTypes.PRISM,
    item: () => ({ prismType, id: `${prismType}-${Date.now()}` }),
    canDrag: () => remaining > 0,
    collect: (m) => ({ isDragging: m.isDragging() }),
  }), [prismType, remaining])

  return (
    <div
      ref={dragRef}
      className={`flex cursor-grab flex-col items-center rounded-2xl border-2 p-3 transition ${
        isDragging ? 'opacity-30 border-cyan-500' : remaining > 0 ? 'border-deep-slate bg-canvas hover:border-mind-teal' : 'border-deep-slate/30 bg-white opacity-40'
      }`}
    >
      <span className="text-2xl" style={{ color: meta.color }}>{meta.label}</span>
      <span className="mt-1 text-xs text-deep-slate/60">{remaining}</span>
    </div>
  )
}

function DroppableCell({ cell, row, col, onDrop, onRemove, isTargetCell, targetColor }) {
  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: ItemTypes.PRISM,
    drop: (item) => { onDrop(item, row, col); return undefined },
    collect: (m) => ({ isOver: m.isOver() }),
  }), [row, col, onDrop])

  const bg = isOver ? 'bg-mind-teal/10 border-mind-teal' :
    cell.type === 'start' ? 'bg-green-50 border-green-500' :
    isTargetCell ? `border-deep-slate` :
    cell.prism ? 'bg-canvas border-mind-teal' :
    'bg-white border-deep-slate'

  return (
    <div
      ref={dropRef}
      onClick={() => cell.prism && onRemove(row, col)}
      className={`relative flex aspect-square items-center justify-center rounded-xl border ${bg} transition-all cursor-default`}
    >
      {cell.type === 'start' && (
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-3 w-3 animate-pulse rounded-full bg-green-400 shadow-lg shadow-green-400/50" />
        </div>
      )}
      {isTargetCell && (
        <div className="flex flex-col items-center">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[cell.requiredColorIndex] }} />
          <span className="mt-0.5 text-[8px] text-deep-slate/50">{COLOR_NAMES[cell.requiredColorIndex]}</span>
        </div>
      )}
      {cell.prism && (
        <span className="text-lg" style={{ color: PRISM_META[cell.prism.type]?.color }}>
          {PRISM_META[cell.prism.type]?.label}
        </span>
      )}
      {cell.prism && (
        <span className="absolute -right-1 -top-1 flex h-3 w-3 cursor-pointer items-center justify-center rounded-full bg-red-600 text-[8px] text-white opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => onRemove(row, col)}>x</span>
      )}
    </div>
  )
}

export default function CircuitWeaver() {
  const { logEvent, ageBracket } = useTelemetry()
  const cfg = AGE_CONFIG[ageBracket] || AGE_CONFIG['15-24']

  const [gridData, setGridData] = useState(() => generateGrid(cfg))
  const [phase, setPhase] = useState('inductive')
  const [pulseCount, setPulseCount] = useState(0)
  const [failCount, setFailCount] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [beamPaths, setBeamPaths] = useState([])
  const [lastResult, setLastResult] = useState(null)
  const [deductiveTarget, setDeductiveTarget] = useState(null)
  const [finalPrismType, setFinalPrismType] = useState(null)
  const [hesitationStart, setHesitationStart] = useState(0)
  const [microReport, setMicroReport] = useState(null)
  const [hint, setHint] = useState('')
  const [prismInventory, setPrismInventory] = useState(() => {
    const inv = {}
    cfg.prismTypes.forEach((pt) => { inv[pt] = 3 })
    return inv
  })

  const telemetryRef = useRef([])
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const gridRef = useRef(null)
  const prevPrismPositionsRef = useRef([])
  const lastFailCountRef = useRef(0)
  const deductiveStartedRef = useRef(false)

  useEffect(() => {
    lastFailCountRef.current = failCount
    if (failCount > 0 && failCount % 3 === 0) {
      const idx = Math.min(Math.floor(failCount / 3) - 1, HINTS.length - 1)
      setHint(HINTS[idx])
      setTimeout(() => setHint(''), 5000)
    }
  }, [failCount])

  useEffect(() => {
    if (phase === 'deductive' && !deductiveStartedRef.current) {
      deductiveStartedRef.current = true
      setHesitationStart(Date.now())
    }
  }, [phase])

  const handleDrop = useCallback((item, row, col) => {
    setGridData((prev) => {
      const g = { ...prev, grid: prev.grid.map((r) => r.map((c) => ({ ...c }))) }
      if (g.grid[row][col].prism || g.grid[row][col].type !== 'empty') return g
      if (!prismInventory[item.prismType] || prismInventory[item.prismType] <= 0) return g
      g.grid[row][col].prism = { type: item.prismType, id: item.id }
      return g
    })
    setPrismInventory((prev) => ({ ...prev, [item.prismType]: prev[item.prismType] - 1 }))
    telemetryRef.current.push({ type: 'circuit.prism.place', timestamp: Date.now(), data: { prismType: item.prismType, row, col } })
    logEvent('circuit.prism.place', { prismType: item.prismType, row, col })
  }, [prismInventory, logEvent])

  const handleRemove = useCallback((row, col) => {
    setGridData((prev) => {
      const g = { ...prev, grid: prev.grid.map((r) => r.map((c) => ({ ...c }))) }
      const prism = g.grid[row][col].prism
      if (prism) {
        setPrismInventory((prev2) => ({ ...prev2, [prism.type]: (prev2[prism.type] || 0) + 1 }))
        g.grid[row][col].prism = null
      }
      return g
    })
  }, [])

  const drawBeam = useCallback((paths) => {
    const canvas = canvasRef.current
    const gridEl = gridRef.current
    if (!canvas || !gridEl) return
    const rect = gridEl.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
    const ctx = canvas.getContext('2d')
    const cellW = rect.width / gridData.cols
    const cellH = rect.height / gridData.rows

    let allSteps = []
    paths.forEach((p) => { allSteps = allSteps.concat(p.steps) })
    if (allSteps.length === 0) return

    let stepIdx = 0
    const speed = cfg.beamSpeed || 80

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i <= stepIdx && i < allSteps.length; i++) {
        const s = allSteps[i]
        const x = s.col * cellW + cellW / 2
        const y = s.row * cellH + cellH / 2
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fillStyle = s.color || '#06b6d4'
        ctx.fill()
        if (i > 0) {
          const prev = allSteps[i - 1]
          ctx.beginPath()
          ctx.moveTo(prev.col * cellW + cellW / 2, prev.row * cellH + cellH / 2)
          ctx.lineTo(x, y)
          ctx.strokeStyle = s.color || '#06b6d4'
          ctx.lineWidth = 3
          ctx.globalAlpha = 0.6
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      }

      if (stepIdx < allSteps.length - 1) {
        stepIdx++
        animRef.current = requestAnimationFrame(animate)
      } else {
        const last = allSteps[allSteps.length - 1]
        if (last.action === 'success') {
          ctx.fillStyle = '#22c55e'
          ctx.font = 'bold 20px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('✓', canvas.width / 2, 30)
        } else if (last.action) {
          ctx.fillStyle = '#f43f5e'
          ctx.font = 'bold 16px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(last.action.replace('-', ' '), canvas.width / 2, 30)
        }
      }
    }

    animRef.current = requestAnimationFrame(animate)
  }, [gridData.cols, gridData.rows, cfg.beamSpeed])

  const handleFirePulse = useCallback(() => {
    if (animating || phase !== 'inductive') return

    const paths = computeBeamPaths(gridData.grid, cfg, gridData.startRow, gridData.targetRow, gridData.cols - 1)
    setAnimating(true)
    setBeamPaths(paths)
    setLastResult(null)
    drawBeam(paths)

    const currentPositions = []
    gridData.grid.forEach((row, r) => row.forEach((cell, c) => {
      if (cell.prism) currentPositions.push({ row: r, col: c, type: cell.prism.type })
    }))
    const prevPos = prevPrismPositionsRef.current
    let movedCount = 0
    currentPositions.forEach((p) => {
      if (!prevPos.some((pp) => pp.row === p.row && pp.col === p.col && pp.type === p.type)) movedCount++
    })
    prevPrismPositionsRef.current = currentPositions

    const reached = paths.some((p) => p.steps.some((s) => s.action === 'success'))
    const newCount = pulseCount + 1

    telemetryRef.current.push({ type: 'circuit.pulse.fire', timestamp: Date.now(), data: { pulseNumber: newCount, prismsMoved: movedCount } })
    logEvent('circuit.pulse.fire', { pulseNumber: newCount, prismsMoved: movedCount })

    setTimeout(() => {
      telemetryRef.current.push({ type: 'circuit.pulse.result', timestamp: Date.now(), data: { reachedTarget: reached } })
      logEvent('circuit.pulse.result', { reachedTarget: reached, pulseNumber: newCount })
      setAnimating(false)
      setPulseCount(newCount)
      if (!reached) setFailCount((prev) => prev + 1)
      setLastResult(reached ? { type: 'success', msg: 'Beam reached the target!' } : { type: 'failure', msg: 'Beam did not reach the target.' })

      if (newCount >= cfg.pulseLimit) {
        setTimeout(() => {
          setPhase('deductive')
          setDeductiveTarget(pickRandom(cfg.targetColors))
          const availTypes = cfg.prismTypes.filter((pt) => pt !== 'delay')
          setFinalPrismType(pickRandom(availTypes))
          telemetryRef.current.push({ type: 'circuit.phase.transition', timestamp: Date.now(), data: { phase: 'deductive', targetColor: deductiveTarget } })
          logEvent('circuit.phase.transition', { phase: 'deductive' })
        }, 2000)
      }
    }, Math.max(500, cfg.noTimer ? 800 : 300))
  }, [animating, phase, gridData, cfg, pulseCount, logEvent, deductiveTarget, drawBeam])

  const handleRunFinal = useCallback(() => {
    if (animating || phase !== 'deductive') return
    const hesitation = Date.now() - hesitationStart

    setAnimating(true)
    const paths = computeBeamPaths(gridData.grid, cfg, gridData.startRow, gridData.targetRow, gridData.cols - 1)
    setBeamPaths(paths)
    drawBeam(paths)

    const success = paths.some((p) => p.steps.some((s) => s.action === 'success'))

    const totalPulses = pulseCount
    const isolationEvents = telemetryRef.current.filter((t) => t.type === 'circuit.pulse.fire')
    const totalMoves = isolationEvents.reduce((sum, e) => sum + (e.data.prismsMoved || 0), 0)
    const isolationRatio = totalPulses > 0 ? (isolationEvents.filter((e) => e.data.prismsMoved <= 1).length / totalPulses) : 0

    telemetryRef.current.push({ type: 'circuit.final.simulate', timestamp: Date.now(), data: { hesitationMs: hesitation, success } })
    logEvent('circuit.final.simulate', { hesitationMs: hesitation, success })

    setTimeout(() => {
      setAnimating(false)
      setMicroReport({
        success,
        pulsesFired: totalPulses,
        isolationRatio: Math.round(isolationRatio * 100),
        overCorrectionDelta: Math.round(totalPulses > 0 ? totalMoves / totalPulses : 0),
        deductiveHesitation: hesitation,
      })
      telemetryRef.current.push({ type: 'circuit.complete', timestamp: Date.now(), data: { score: success ? 100 : 30, pulsesFired: totalPulses, isolationRatio, deductiveHesitation: hesitation } })
      logEvent('circuit.complete', { score: success ? 100 : 30 })
    }, Math.max(500, cfg.noTimer ? 1000 : 300))
  }, [animating, phase, gridData, cfg, hesitationStart, pulseCount, logEvent, drawBeam])

  const handleReset = useCallback(() => {
    cancelAnimationFrame(animRef.current)
    setGridData(generateGrid(cfg))
    setPhase('inductive')
    setPulseCount(0)
    setFailCount(0)
    setAnimating(false)
    setBeamPaths([])
    setLastResult(null)
    setDeductiveTarget(null)
    setFinalPrismType(null)
    setMicroReport(null)
    setHint('')
    const inv = {}
    cfg.prismTypes.forEach((pt) => { inv[pt] = 3 })
    setPrismInventory(inv)
    telemetryRef.current = []
    prevPrismPositionsRef.current = []
    deductiveStartedRef.current = false
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [cfg])

  const totalPlaced = useMemo(() => {
    let count = 0
    gridData.grid.forEach((row) => row.forEach((cell) => { if (cell.prism) count++ }))
    return count
  }, [gridData])

  return (
    <div className="relative min-h-screen px-6 py-10 text-deep-slate">
      <div className="pointer-events-none fixed inset-0 bg-grain" />
      <div className="relative mx-auto max-w-5xl card rounded-3xl p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Circuit Weaver</h1>
            <p className="mt-1 text-sm text-mind-teal">Phase 2 &mdash; Reasoning</p>
            <p className="mt-2 text-deep-slate/60">Discover the hidden laws of the circuit by placing prisms and firing test pulses.</p>
          </div>
          <Link to="/dashboard" className="rounded-2xl bg-canvas border border-deep-slate px-4 py-2 text-deep-slate hover:shadow-hard">
            Dashboard
          </Link>
        </div>

        {microReport ? (
          <div className="mt-8 rounded-3xl border border-mind-teal border-2 border-deep-slate card-glass shadow-hard rounded-3xl p-6">
            <h3 className="text-2xl font-semibold text-mind-teal">Micro-Report: Circuit Weaver</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <p className="text-sm text-deep-slate/60">Result</p>
                <p className={`text-3xl font-bold ${microReport.success ? 'text-green-600' : 'text-red-400'}`}>
                  {microReport.success ? 'Solved' : 'Missed'}
                </p>
              </div>
              <div className="rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <p className="text-sm text-deep-slate/60">Pulses fired</p>
                <p className="text-3xl font-bold text-mind-teal">{microReport.pulsesFired}</p>
              </div>
              <div className="rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <p className="text-sm text-deep-slate/60">Isolation ratio</p>
                <p className="text-3xl font-bold text-mind-teal">{microReport.isolationRatio}%</p>
              </div>
              <div className="rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <p className="text-sm text-deep-slate/60">Ded. hesitation</p>
                <p className="text-3xl font-bold text-mind-teal">{(microReport.deductiveHesitation / 1000).toFixed(1)}s</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-canvas border border-deep-slate px-5 py-3">
              <p className="text-sm text-deep-slate/60">Reasoning style</p>
              <p className="mt-1 text-deep-slate">
                {microReport.isolationRatio > 60
                  ? 'Systematic &mdash; you isolated variables before testing.'
                  : microReport.isolationRatio > 30
                    ? 'Balanced &mdash; mixed isolated changes with broad experiments.'
                    : 'Exploratory &mdash; you rearranged multiple pieces between tests.'}
              </p>
            </div>
            <Link to="/dashboard" className="mt-6 inline-flex rounded-2xl bg-mind-teal px-6 py-3 font-semibold text-slate-950 hover:opacity-90">
              Back to Dashboard
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-4">
                <div>
                  <p className="text-xs text-deep-slate/60">Phase</p>
                  <p className="text-sm font-semibold text-mind-teal capitalize">{phase}</p>
                </div>
                <div>
                  <p className="text-xs text-deep-slate/60">Pulses</p>
                  <p className="text-sm font-semibold text-mind-teal">{pulseCount}/{cfg.pulseLimit}</p>
                </div>
                <div>
                  <p className="text-xs text-deep-slate/60">Prisms placed</p>
                  <p className="text-sm font-semibold text-mind-teal">{totalPlaced}</p>
                </div>
              </div>
              {!cfg.noTimer && (
                <div className="rounded-xl bg-amber-50 px-3 py-1 text-xs text-amber-600">
                  Speed tier: {ageBracket}
                </div>
              )}
            </div>

            {hint && (
              <div className="mt-3 animate-pulse rounded-2xl border border-amber-600 bg-amber-50 px-5 py-3 text-sm text-amber-600">
                {hint}
              </div>
            )}

            <DndProvider backend={HTML5Backend}>
              <div className="mt-5 flex gap-6">
                <div className="flex-1">
                  <div
                    ref={gridRef}
                    className="group relative rounded-2xl border border-deep-slate bg-canvas p-2"
                  >
                    <div
                      className="grid gap-1.5"
                      style={{ gridTemplateColumns: `repeat(${gridData.cols}, 1fr)` }}
                    >
                      {gridData.grid.map((row, r) =>
                        row.map((cell, c) => (
                          <DroppableCell
                            key={`${r}-${c}`}
                            cell={cell}
                            row={r}
                            col={c}
                            onDrop={handleDrop}
                            onRemove={handleRemove}
                            isTargetCell={c === gridData.cols - 1 && cell.type === 'target'}
                            targetColor={cell.requiredColorIndex != null ? COLORS[cell.requiredColorIndex] : null}
                          />
                        ))
                      )}
                    </div>
                    <canvas
                      ref={canvasRef}
                      className="pointer-events-none absolute inset-0 h-full w-full rounded-2xl"
                    />
                  </div>
                </div>

                <div className="w-36 shrink-0 space-y-3">
                  <p className="text-xs uppercase tracking-wider text-deep-slate/50">Toolbox</p>
                  {cfg.prismTypes.map((pt) => (
                    <DraggablePrism key={pt} prismType={pt} remaining={prismInventory[pt] || 0} />
                  ))}
                  {phase === 'deductive' && (
                    <div className="mt-4 rounded-2xl border border-insight-yellow bg-yellow-50 p-3 text-center">
                      <p className="text-xs text-yellow-600">Target color</p>
                      <div className="mt-1 flex justify-center gap-1">
                        {cfg.targetColors.map((name) => {
                          const idx = COLOR_NAMES.indexOf(name)
                          return (
                            <span
                              key={name}
                              className={`inline-block h-4 w-4 rounded-full ${deductiveTarget === name ? 'ring-2 ring-white ring-offset-1 ring-offset-white' : 'opacity-30'}`}
                              style={{ backgroundColor: COLORS[idx] }}
                            />
                          )
                        })}
                      </div>
                      {finalPrismType && (
                        <p className="mt-2 text-xs text-deep-slate/60">
                          Bonus prism: <span style={{ color: PRISM_META[finalPrismType]?.color }}>{PRISM_META[finalPrismType]?.label}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </DndProvider>

            <div className="mt-5 flex items-center justify-between">
              <div className="flex gap-3">
                {phase === 'inductive' && (
                  <button
                    type="button"
                    onClick={handleFirePulse}
                    disabled={animating}
                    className="rounded-2xl bg-mind-teal px-6 py-3 font-semibold text-slate-950 hover:opacity-90 disabled:opacity-40"
                  >
                    {animating ? 'Firing pulse...' : `Fire Test Pulse (${pulseCount}/${cfg.pulseLimit})`}
                  </button>
                )}
                {phase === 'deductive' && (
                  <button
                    type="button"
                    onClick={handleRunFinal}
                    disabled={animating}
                    className="rounded-2xl bg-insight-yellow px-6 py-3 font-semibold text-slate-950 hover:opacity-90 disabled:opacity-40"
                  >
                    {animating ? 'Simulating...' : 'Run Final Simulation'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-2xl border border-deep-slate px-6 py-3 text-deep-slate hover:border-slate-500"
                >
                  Reset
                </button>
              </div>

              {lastResult && (
                <div className={`rounded-2xl px-5 py-3 text-sm font-semibold ${
                  lastResult.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                }`}>
                  {lastResult.msg}
                </div>
              )}
            </div>

            {phase === 'deductive' && (
              <div className="mt-4 rounded-2xl border border-insight-yellow bg-yellow-900/10 p-4">
                <p className="text-sm text-yellow-600">
                  Deductive Reasoning Phase &mdash; The target color has changed. Place your remaining prism and 
                  run the final simulation. You cannot fire test pulses.
                </p>
              </div>
            )}

            <p className="mt-3 text-xs text-deep-slate/40">
              Drag prisms from the toolbox onto the grid. Click a placed prism to remove it.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
