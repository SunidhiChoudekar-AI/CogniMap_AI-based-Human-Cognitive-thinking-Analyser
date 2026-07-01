import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { useTelemetry } from '../components/TelemetryContext'

const AGE_CONFIG = {
  '11-14': { stateCount: 3, flashMs: 5000, darkMs: 800 },
  '15-24': { stateCount: 5, flashMs: 2500, darkMs: 800 },
  '25-64': { stateCount: 5, flashMs: 3000, darkMs: 800 },
  '65+':  { stateCount: 4, flashMs: 6000, darkMs: 800 },
}

const ROOM_STATES = [
  {
    day: 0, label: 'Day 0 — Baseline',
    mutations: {
      laptop: { screenOn: false, glow: false },
      mug: { pos: 'right', color: '#FFFFFF' },
      plants: { vineLen: 'short' },
      blanket: { color: '#E8D5B7', folded: false },
      garland: { slipped: false },
    },
  },
  {
    day: 1, label: 'Day 1 — Morning Light',
    mutations: {
      laptop: { screenOn: true, glow: true },
      mug: { pos: 'left', color: '#FF6B6B' },
      plants: { vineLen: 'short' },
      blanket: { color: '#E8D5B7', folded: false },
      garland: { slipped: false },
    },
  },
  {
    day: 2, label: 'Day 2 — Growth',
    mutations: {
      laptop: { screenOn: true, glow: true },
      mug: { pos: 'left', color: '#FF6B6B' },
      plants: { vineLen: 'long' },
      blanket: { color: '#E8D5B7', folded: false },
      garland: { slipped: false },
    },
  },
  {
    day: 3, label: 'Day 3 — Neat & Tidy',
    mutations: {
      laptop: { screenOn: true, glow: true },
      mug: { pos: 'left', color: '#FF6B6B' },
      plants: { vineLen: 'long' },
      blanket: { color: '#4EA8DE', folded: true },
      garland: { slipped: false },
    },
  },
  {
    day: 4, label: 'Day 4 — Shift',
    mutations: {
      laptop: { screenOn: true, glow: true },
      mug: { pos: 'left', color: '#FF6B6B' },
      plants: { vineLen: 'long' },
      blanket: { color: '#4EA8DE', folded: true },
      garland: { slipped: true },
    },
  },
]

function RoomSVG({ stateIndex, label, compact }) {
  const m = ROOM_STATES[stateIndex]?.mutations || ROOM_STATES[0].mutations
  const vb = compact ? '0 0 320 225' : '0 0 640 450'
  const s = compact ? 0.5 : 1

  function sx(v) { return Math.round(v * s) }
  function sy(v) { return Math.round(v * s) }

  return (
    <svg viewBox={vb} className="w-full h-full">
      <defs>
        <radialGradient id="laptop-glow-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4EA8DE" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#4EA8DE" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#4EA8DE" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* White canvas */}
      <rect x={sx(0)} y={sx(0)} width={sx(640)} height={sx(450)} rx={sx(6)} fill="#FAFAFA" />

      {/* Label */}
      {label && !compact && (
        <text x={sx(320)} y={sx(22)} textAnchor="middle" fill="#1A1D2E" fontSize={sx(14)} fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif">
          {label}
        </text>
      )}

      {/* === BACK WALL === */}
      {/* Navy accent wall — left 35% */}
      <rect x={sx(30)} y={sx(35)} width={sx(220)} height={sx(265)} fill="#1A1D2E" rx={sx(2)} />
      {/* Window wall — right 65% */}
      <rect x={sx(250)} y={sx(35)} width={sx(360)} height={sx(265)} fill="#C6E6F5" rx={sx(2)} />

      {/* Window */}
      <rect x={sx(290)} y={sx(60)} width={sx(290)} height={sx(155)} fill="#E8F4FD" rx={sx(4)} />
      <rect x={sx(290)} y={sx(60)} width={sx(290)} height={sx(155)} fill="none" stroke="#FFFFFF" strokeWidth={sx(4)} rx={sx(4)} />
      {/* Window cross */}
      <line x1={sx(435)} y1={sx(60)} x2={sx(435)} y2={sx(215)} stroke="#FFFFFF" strokeWidth={sx(2.5)} />
      <line x1={sx(290)} y1={sx(137)} x2={sx(580)} y2={sx(137)} stroke="#FFFFFF" strokeWidth={sx(2.5)} />
      {/* Window sill */}
      <rect x={sx(285)} y={sx(215)} width={sx(300)} height={sx(8)} fill="#D0D0D0" rx={sx(2)} />

      {/* Pendant light */}
      <line x1={sx(320)} y1={sx(30)} x2={sx(320)} y2={sx(50)} stroke="#555" strokeWidth={sx(1.5)} />
      <polygon points={sx(312)+','+sy(50)+' '+sx(328)+','+sy(50)+' '+sx(324)+','+sy(58)+' '+sx(316)+','+sy(58)} fill="#FFD166" />
      <circle cx={sx(320)} cy={sx(58)} r={sx(4)} fill="#FFE066" />

      {/* === FLOOR === */}
      <rect x={sx(30)} y={sx(300)} width={sx(580)} height={sx(120)} fill="#E8C896" />
      {/* Floor plank lines */}
      <line x1={sx(30)} y1={sx(320)} x2={sx(610)} y2={sx(320)} stroke="#D4B07A" strokeWidth={sx(0.8)} />
      <line x1={sx(30)} y1={sx(350)} x2={sx(610)} y2={sx(350)} stroke="#D4B07A" strokeWidth={sx(0.8)} />
      <line x1={sx(30)} y1={sx(390)} x2={sx(610)} y2={sx(390)} stroke="#D4B07A" strokeWidth={sx(0.8)} />

      {/* === FURNITURE === */}

      {/* Storage dresser (far left) */}
      <rect x={sx(35)} y={sx(340)} width={sx(45)} height={sx(65)} fill="#8B5E3C" rx={sx(2)} />
      <rect x={sx(38)} y={sx(345)} width={sx(39)} height={sx(14)} fill="#A07040" rx={sx(1)} />
      <rect x={sx(38)} y={sx(363)} width={sx(39)} height={sx(14)} fill="#A07040" rx={sx(1)} />
      <rect x={sx(38)} y={sx(381)} width={sx(39)} height={sx(14)} fill="#A07040" rx={sx(1)} />

      {/* Desk */}
      <rect x={sx(85)} y={sx(332)} width={sx(160)} height={sx(8)} fill="#A07040" rx={sx(2)} />
      {/* Desk shadow */}
      <rect x={sx(87)} y={sx(340)} width={sx(156)} height={sx(4)} fill="#1A1D2E" opacity="0.08" rx={sx(1)} />
      {/* Desk legs */}
      <rect x={sx(92)} y={sx(340)} width={sx(6)} height={sx(28)} fill="#8B5E3C" rx={sx(1)} />
      <rect x={sx(232)} y={sx(340)} width={sx(6)} height={sx(28)} fill="#8B5E3C" rx={sx(1)} />

      {/* Chair */}
      <rect x={sx(120)} y={sx(358)} width={sx(90)} height={sx(8)} fill="#E8E8E8" rx={sx(2)} />
      {/* Chair back */}
      <rect x={sx(120)} y={sx(320)} width={sx(6)} height={sx(38)} fill="#E8E8E8" rx={sx(1)} />
      <rect x={sx(204)} y={sx(320)} width={sx(6)} height={sx(38)} fill="#E8E8E8" rx={sx(1)} />
      {/* Chair shadow */}
      <rect x={sx(120)} y={sx(366)} width={sx(90)} height={sx(4)} fill="#1A1D2E" opacity="0.08" rx={sx(1)} />

      {/* Bed frame */}
      <rect x={sx(310)} y={sx(315)} width={sx(275)} height={sx(85)} fill="#A0B4C8" rx={sx(3)} />
      {/* Mattress */}
      <rect x={sx(315)} y={sx(318)} width={sx(265)} height={sx(45)} fill="#F5F5F5" rx={sx(2)} />
      {/* Pillow */}
      <rect x={sx(520)} y={sx(320)} width={sx(55)} height={sx(18)} fill="#FFFFFF" rx={sx(6)} />
      <rect x={sx(520)} y={sx(320)} width={sx(55)} height={sx(18)} fill="none" stroke="#E0E0E0" strokeWidth={sx(0.5)} rx={sx(6)} />

      {/* Rug */}
      <ellipse cx={sx(480)} cy={sx(380)} rx={sx(55)} ry={sx(18)} fill="#4EA8DE" opacity="0.2" />
      <ellipse cx={sx(480)} cy={sx(380)} rx={sx(42)} ry={sx(13)} fill="#FFFFFF" opacity="0.3" />
      <ellipse cx={sx(480)} cy={sx(380)} rx={sx(28)} ry={sx(8)} fill="#FFD166" opacity="0.2" />

      {/* Rattan ottoman (foreground right) */}
      <ellipse cx={sx(520)} cy={sx(438)} rx={sx(55)} ry={sx(12)} fill="#D2B48C" stroke="#C4A67A" strokeWidth={sx(1)} />
      <rect x={sx(480)} y={sx(432)} width={sx(80)} height={sx(6)} fill="#D2B48C" rx={sx(2)} />

      {/* === DYNAMIC TARGETS === */}

      {/* Shelf on navy wall */}
      <rect x={sx(45)} y={sx(75)} width={sx(190)} height={sx(6)} fill="#8B5E3C" rx={sx(1)} />

      {/* Shelf plants */}
      <g id="target-shelf-plants">
        {/* Pots */}
        <rect x={sx(65)} y={sx(65)} width={sx(16)} height={sx(12)} fill="#8B4513" rx={sx(1)} />
        <rect x={sx(105)} y={sx(65)} width={sx(16)} height={sx(12)} fill="#8B4513" rx={sx(1)} />
        <rect x={sx(145)} y={sx(65)} width={sx(16)} height={sx(12)} fill="#8B4513" rx={sx(1)} />
        {/* Leaves in pot */}
        <circle cx={sx(73)} cy={sx(60)} r={sx(6)} fill="#22c55e" />
        <circle cx={sx(113)} cy={sx(60)} r={sx(6)} fill="#22c55e" />
        <circle cx={sx(153)} cy={sx(60)} r={sx(6)} fill="#22c55e" />
        {/* Vines — short vs dramatically overgrown */}
        {m.plants.vineLen === 'short' ? (
          <>
            <path d={'M73,77 Q68,90 70,102'} fill="none" stroke="#22c55e" strokeWidth={sx(2)} />
            <path d={'M113,77 Q118,88 115,100'} fill="none" stroke="#22c55e" strokeWidth={sx(2)} />
            <circle cx={sx(70)} cy={sx(102)} r={sx(3)} fill="#22c55e" />
            <circle cx={sx(115)} cy={sx(100)} r={sx(3)} fill="#22c55e" />
          </>
        ) : (
          <>
            <path d={'M73,77 Q60,110 68,155 Q70,165 65,180'} fill="none" stroke="#22c55e" strokeWidth={sx(2.5)} />
            <path d={'M113,77 Q125,105 118,145 Q115,158 120,170'} fill="none" stroke="#22c55e" strokeWidth={sx(2.5)} />
            <path d={'M153,77 Q145,95 150,120 Q152,135 148,145'} fill="none" stroke="#22c55e" strokeWidth={sx(2)} />
            {/* Extra leaves on long vines */}
            <circle cx={sx(65)} cy={sx(180)} r={sx(4)} fill="#22c55e" />
            <circle cx={sx(68)} cy={sx(145)} r={sx(3)} fill="#4ade80" />
            <circle cx={sx(120)} cy={sx(170)} r={sx(4)} fill="#22c55e" />
            <circle cx={sx(116)} cy={sx(130)} r={sx(3)} fill="#4ade80" />
            <circle cx={sx(148)} cy={sx(145)} r={sx(3.5)} fill="#22c55e" />
            <circle cx={sx(65)} cy={sx(110)} r={sx(2.5)} fill="#4ade80" />
            <circle cx={sx(118)} cy={sx(95)} r={sx(2.5)} fill="#4ade80" />
          </>
        )}
      </g>

      {/* Bell garland on navy wall */}
      <g id="target-bell-garland">
        {m.garland.slipped ? (
          <>
            <path d={'M45,240 Q100,280 210,248'} fill="none" stroke="#D4AF37" strokeWidth={sx(2)} />
            <circle cx={sx(65)} cy={sx(248)} r={sx(6)} fill="#D4AF37" />
            <circle cx={sx(100)} cy={sx(272)} r={sx(6)} fill="#D4AF37" />
            <circle cx={sx(145)} cy={sx(268)} r={sx(6)} fill="#D4AF37" />
            <circle cx={sx(190)} cy={sx(252)} r={sx(6)} fill="#D4AF37" />
          </>
        ) : (
          <>
            <path d={'M45,240 Q130,260 210,248'} fill="none" stroke="#D4AF37" strokeWidth={sx(1.5)} />
            <circle cx={sx(75)} cy={sx(248)} r={sx(5)} fill="#D4AF37" />
            <circle cx={sx(115)} cy={sx(256)} r={sx(5)} fill="#D4AF37" />
            <circle cx={sx(155)} cy={sx(254)} r={sx(5)} fill="#D4AF37" />
            <circle cx={sx(195)} cy={sx(250)} r={sx(5)} fill="#D4AF37" />
          </>
        )}
      </g>

      {/* Laptop glow — large visible ellipse */}
      {m.laptop.glow && (
        <ellipse cx={sx(210)} cy={sx(310)} rx={sx(50)} ry={sx(40)} fill="url(#laptop-glow-grad)" />
      )}

      {/* Laptop on desk */}
      <g id="target-desk-laptop">
        <rect x={sx(185)} y={sx(322)} width={sx(45)} height={sx(4)} fill="#555" rx={sx(1)} />
        <rect x={sx(188)} y={sx(312)} width={sx(39)} height={sx(10)} fill={m.laptop.screenOn ? '#4EA8DE' : '#333'} rx={sx(1)} />
        {m.laptop.screenOn && (
          <rect x={sx(190)} y={sx(314)} width={sx(35)} height={sx(6)} fill="#7AC5F5" rx={sx(0.5)} opacity="0.6" />
        )}
      </g>

      {/* Mug + Succulent on desk */}
      <g id="target-desk-items">
        {/* Mug — changes position AND color between states */}
        <rect x={m.mug.pos === 'left' ? sx(100) : sx(120)} y={sx(318)} width={sx(10)} height={sx(14)} fill={m.mug.color} rx={sx(1)} />
        <path d={m.mug.pos === 'left'
          ? 'M110,320 Q114,322 110,328'
          : 'M130,320 Q134,322 130,328'}
          fill="none" stroke={m.mug.color} strokeWidth={sx(1.5)} />
        {/* Succulent */}
        <circle cx={m.mug.pos === 'left' ? sx(135) : sx(155)} cy={sx(327)} r={sx(6)} fill="#22c55e" />
        <circle cx={m.mug.pos === 'left' ? sx(135) : sx(155)} cy={sx(325)} r={sx(4)} fill="#4ade80" />
        <rect x={m.mug.pos === 'left' ? sx(133) : sx(153)} y={sx(330)} width={sx(5)} height={sx(3)} fill="#8B4513" rx={sx(0.5)} />
      </g>

      {/* Boho blanket on bed — changes color AND shape between states */}
      <g id="target-boho-blanket">
        {m.blanket.folded ? (
          <rect x={sx(320)} y={sx(348)} width={sx(90)} height={sx(14)} fill={m.blanket.color} rx={sx(2)} stroke={m.blanket.color} strokeWidth={sx(0.5)} />
        ) : (
          <path d={'M325,336 Q355,350 380,335 Q395,348 420,336 L420,362 Q395,375 380,362 Q355,375 325,362 Z'} fill={m.blanket.color} opacity="0.9" />
        )}
      </g>

      {/* Sunlight shadow shift (25-64 visual noise) */}
      {stateIndex > 0 && stateIndex < 4 && (
        <rect x={sx(385)} y={sx(300)} width={sx(60)} height={sx(45)} fill="#1A1D2E" opacity={0.02 + stateIndex * 0.01} rx={sx(2)} />
      )}
    </svg>
  )
}

const DRAG_TYPE = 'STATE_THUMB'

function DraggableThumb({ stateIndex, index, onPlace }) {
  const [, dragRef] = useDrag(() => ({
    type: DRAG_TYPE,
    item: { stateIndex, index },
  }), [stateIndex, index])

  return (
    <div
      ref={dragRef}
      className="w-52 shrink-0 cursor-grab rounded-xl border-2 border-deep-slate card-glass shadow-hard transition-pop hover:shadow-hard-hover active:cursor-grabbing"
    >
      <div className="h-32 overflow-hidden rounded-xl">
        <RoomSVG stateIndex={stateIndex} compact />
      </div>
    </div>
  )
}

function DropSlot({ position, assignedIndex, onDrop, children }) {
  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: DRAG_TYPE,
    drop: (item) => onDrop(item.stateIndex, position),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }), [position, onDrop])

  return (
    <div
      ref={dropRef}
      className={`flex items-center gap-2 rounded-2xl border-2 p-3 transition-pop ${
        isOver
          ? 'border-mind-teal bg-mind-teal/10 shadow-hard'
          : assignedIndex !== null
            ? 'border-mind-teal card-glass shadow-hard'
            : 'border-deep-slate/40 bg-canvas'
      }`}
    >
      <span className="shrink-0 w-10 text-center text-lg font-bold text-mind-teal">{position + 1}</span>
      {assignedIndex !== null ? (
        <div className="flex items-center gap-3 flex-1">
          <div className="h-20 w-32 shrink-0 overflow-hidden rounded-xl border border-deep-slate bg-canvas">
            <RoomSVG stateIndex={assignedIndex} compact />
          </div>
          <span className="text-xs text-deep-slate/60">{ROOM_STATES[assignedIndex]?.label}</span>
        </div>
      ) : (
        <span className="text-sm text-deep-slate/40">Drop a state here</span>
      )}
      {children}
    </div>
  )
}

export default function TimeLapseRoom() {
  const { logEvent, ageBracket } = useTelemetry()
  const cfg = AGE_CONFIG[ageBracket] || AGE_CONFIG['15-24']
  const states = useMemo(() => ROOM_STATES.slice(0, cfg.stateCount), [cfg.stateCount])

  const [phase, setPhase] = useState('intro')
  const [currentStateIndex, setCurrentStateIndex] = useState(0)
  const [isDark, setIsDark] = useState(false)
  const [hoverData, setHoverData] = useState([])
  const [hoverTimers, setHoverTimers] = useState({})
  const darkTimerRef = useRef(null)

  const [slots, setSlots] = useState([])
  const [availableThumbs, setAvailableThumbs] = useState([])
  const [totalMoves, setTotalMoves] = useState(0)
  const [startTime, setStartTime] = useState(null)
  const [microReport, setMicroReport] = useState(null)

  const targetIds = ['target-desk-laptop', 'target-desk-items', 'target-shelf-plants', 'target-boho-blanket', 'target-bell-garland']

  function handleTargetEnter(targetId) {
    setHoverTimers((prev) => ({ ...prev, [targetId]: Date.now() }))
  }

  function handleTargetLeave(targetId) {
    setHoverTimers((prev) => {
      const start = prev[targetId]
      if (start && currentStateIndex < states.length) {
        const duration = Date.now() - start
        setHoverData((prevData) => [
          ...prevData,
          { stateIndex: currentStateIndex, target: targetId, durationMs: duration },
        ])
      }
      const copy = { ...prev }
      delete copy[targetId]
      return copy
    })
  }

  function startTimeline() {
    setPhase('observing')
    setCurrentStateIndex(0)
    setHoverData([])
  }

  function handleNextDay() {
    const nextIdx = currentStateIndex + 1
    if (nextIdx >= states.length) {
      finishObservation()
      return
    }
    setIsDark(true)
    darkTimerRef.current = setTimeout(() => {
      setCurrentStateIndex(nextIdx)
      setIsDark(false)
    }, cfg.darkMs)
  }

  function finishObservation() {
    if (darkTimerRef.current) clearTimeout(darkTimerRef.current)
    setIsDark(false)
    logEvent('timelapse.observation', { hoverData, stateCount: states.length })

    const indices = states.map((_, i) => i)
    const shuffled = [...indices].sort(() => Math.random() - 0.5)
    setSlots(new Array(states.length).fill(null))
    setAvailableThumbs(shuffled)
    setPhase('reconstruction')
    setStartTime(Date.now())
  }

  function handleDrop(stateIndex, slotPos) {
    setTotalMoves((prev) => prev + 1)
    setSlots((prev) => {
      const next = [...prev]
      const existingIdx = next.indexOf(stateIndex)
      if (existingIdx !== -1) next[existingIdx] = null
      next[slotPos] = stateIndex
      return next
    })
    setAvailableThumbs((prev) => prev.filter((i) => i !== stateIndex))
  }

  function removeFromSlot(pos) {
    const idx = slots[pos]
    if (idx === null) return
    setSlots((prev) => {
      const next = [...prev]
      next[pos] = null
      return next
    })
    setAvailableThumbs((prev) => [...prev, idx])
    setTotalMoves((prev) => prev + 1)
  }

  function handleSubmit() {
    const elapsed = Date.now() - startTime
    const finalSequence = slots.map((s) => s + 1)
    const initialCorrectness = slots.map((s, i) => s === i)
    const correctCount = slots.reduce((acc, s, i) => acc + (s === i ? 1 : 0), 0)
    const accuracy = correctCount / states.length
    const correctionsOn = []
    if (slots[1] !== 1) correctionsOn.push('target-shelf-plants')
    if (slots[2] !== 2) correctionsOn.push('target-boho-blanket')
    if (slots[3] !== 3) correctionsOn.push('target-bell-garland')

    const distanceScore = (() => {
      let dist = 0
      for (let i = 0; i < slots.length; i++) {
        dist += Math.abs((slots[i] ?? 0) - i)
      }
      return Math.max(0, 100 - dist * 20)
    })()

    const correctionEfficiency = slots.length > 0
      ? Math.max(0, 100 - (totalMoves / slots.length) * 30)
      : 0

    logEvent('timelapse.reconstruct', {
      totalSortingMs: elapsed,
      totalMoves,
      initialPlacementCorrectness: initialCorrectness,
      finalSequence,
      correctionsOn,
      accuracy,
      distanceScore,
      correctionEfficiency,
    })

    setMicroReport({
      accuracy: Math.round(accuracy * 100),
      distanceScore: Math.round(distanceScore),
      efficiency: Math.round(correctionEfficiency),
      memoryScore: Math.round(accuracy * 50 + distanceScore * 0.3 + correctionEfficiency * 0.2),
    })
  }

  useEffect(() => {
    return () => {
      if (darkTimerRef.current) clearTimeout(darkTimerRef.current)
    }
  }, [])

  const allSlotsFilled = slots.every((s) => s !== null)

  return (
    <div className="relative min-h-screen px-6 py-10 text-deep-slate">
      <div className="pointer-events-none fixed inset-0 bg-grain" />
      <div className="relative mx-auto max-w-5xl border-2 border-deep-slate card-glass shadow-hard rounded-3xl p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Time-Lapse Room</h1>
            <p className="mt-1 text-sm text-mind-teal">Phase 1 &mdash; Memory</p>
            <p className="mt-2 text-deep-slate/60">Watch the room evolve through time, then reconstruct the chronological order.</p>
          </div>
          <Link to="/dashboard" className="rounded-2xl bg-canvas border border-deep-slate px-4 py-2 text-deep-slate hover:shadow-hard">
            Dashboard
          </Link>
        </div>

        {microReport ? (
          <div className="mt-8 border-2 border-mind-teal card-glass shadow-hard rounded-3xl p-6">
            <h3 className="text-2xl font-semibold text-mind-teal">Micro-Report: Time-Lapse Room</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-4">
              <div className="rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <p className="text-sm text-deep-slate/60">Chronology Accuracy</p>
                <p className="text-3xl font-bold text-mind-teal">{microReport.accuracy}%</p>
              </div>
              <div className="rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <p className="text-sm text-deep-slate/60">Distance Score</p>
                <p className="text-3xl font-bold text-mind-teal">{microReport.distanceScore}%</p>
              </div>
              <div className="rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <p className="text-sm text-deep-slate/60">Correction Efficiency</p>
                <p className="text-3xl font-bold text-mind-teal">{microReport.efficiency}%</p>
              </div>
              <div className="rounded-2xl bg-mind-teal/10 border border-mind-teal px-5 py-4">
                <p className="text-sm text-mind-teal/80">Memory Score</p>
                <p className="text-3xl font-bold text-mind-teal">{microReport.memoryScore}</p>
              </div>
            </div>
            <Link to="/dashboard" className="mt-6 inline-flex rounded-2xl bg-mind-teal px-6 py-3 font-semibold text-white hover:opacity-90">
              Back to Dashboard
            </Link>
          </div>
        ) : phase === 'intro' ? (
          <>
            <div className="mt-6 flex items-center justify-between">
              <p className="text-deep-slate/60">
                This room will evolve through {states.length} time jumps. Watch closely &mdash; each day brings subtle changes. Then reconstruct the correct order.
              </p>
              <button
                type="button"
                onClick={startTimeline}
                className="rounded-2xl bg-mind-teal px-6 py-3 font-semibold text-white hover:opacity-90"
              >
                Begin Time-Lapse
              </button>
            </div>
            <div className="mt-6 h-[340px] rounded-2xl border-2 border-deep-slate bg-canvas p-4">
              <RoomSVG stateIndex={0} label="Initial Room State" />
            </div>
          </>
        ) : phase === 'observing' ? (
          <>
            <div className="mt-6 flex items-center justify-between">
              <p className="text-deep-slate/60">
                {states[currentStateIndex]?.label || 'Observing...'} &mdash; {currentStateIndex + 1} of {states.length}
              </p>
              <button
                type="button"
                onClick={handleNextDay}
                disabled={isDark}
                className="rounded-2xl bg-mind-teal px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-40"
              >
                {isDark ? '...' : currentStateIndex >= states.length - 1 ? 'Done — Reconstruct →' : 'Next Day →'}
              </button>
            </div>
            <div className="mt-6 transition-opacity duration-700" style={{ opacity: isDark ? 0 : 1 }}>
              <div className="h-[340px] rounded-2xl border-2 border-deep-slate bg-canvas p-4 relative">
                {!isDark && (
                  <div
                    className="absolute inset-0 z-10 cursor-crosshair"
                    onMouseEnter={() => {}}
                  >
                    {/* Hover tracking overlay over each target */}
                    <div className="absolute top-[69%] left-[24%] w-[12%] h-[8%]" style={{ pointerEvents: 'auto' }}
                      onMouseEnter={() => handleTargetEnter('target-desk-laptop')}
                      onMouseLeave={() => handleTargetLeave('target-desk-laptop')} />
                    <div className="absolute top-[70%] left-[12%] w-[10%] h-[8%]" style={{ pointerEvents: 'auto' }}
                      onMouseEnter={() => handleTargetEnter('target-desk-items')}
                      onMouseLeave={() => handleTargetLeave('target-desk-items')} />
                    <div className="absolute top-[12%] left-[8%] w-[20%] h-[22%]" style={{ pointerEvents: 'auto' }}
                      onMouseEnter={() => handleTargetEnter('target-shelf-plants')}
                      onMouseLeave={() => handleTargetLeave('target-shelf-plants')} />
                    <div className="absolute top-[74%] left-[50%] w-[16%] h-[8%]" style={{ pointerEvents: 'auto' }}
                      onMouseEnter={() => handleTargetEnter('target-boho-blanket')}
                      onMouseLeave={() => handleTargetLeave('target-boho-blanket')} />
                    <div className="absolute top-[52%] left-[6%] w-[28%] h-[6%]" style={{ pointerEvents: 'auto' }}
                      onMouseEnter={() => handleTargetEnter('target-bell-garland')}
                      onMouseLeave={() => handleTargetLeave('target-bell-garland')} />
                  </div>
                )}
                <RoomSVG stateIndex={currentStateIndex} label={states[currentStateIndex]?.label} />
              </div>
            </div>
            {isDark && (
              <div className="mt-6 flex items-center justify-center">
                <div className="h-2 w-full max-w-md rounded-full bg-deep-slate/10 overflow-hidden">
                  <div className="h-full rounded-full bg-deep-slate/30 animate-pulse" style={{ width: '100%' }} />
                </div>
              </div>
            )}
          </>
        ) : (
          <DndProvider backend={HTML5Backend}>
            <div className="mt-6">
              <div className="mb-6 h-[240px] rounded-2xl border-2 border-deep-slate bg-canvas p-4">
                <RoomSVG stateIndex={0} label="Baseline Room (Day 0)" />
              </div>
              <p className="text-deep-slate/60">
                Drag the room snapshots into the correct chronological order (earliest to latest).
              </p>

              {/* Available thumbnails */}
              {availableThumbs.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-sm text-deep-slate/50">Available snapshots:</p>
                  <div className="flex flex-wrap gap-3">
                    {availableThumbs.map((stateIdx) => (
                      <DraggableThumb key={stateIdx} stateIndex={stateIdx} index={stateIdx} />
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline slots */}
              <div className="mt-6 space-y-3">
                {slots.map((assignedIdx, pos) => (
                  <DropSlot key={pos} position={pos} assignedIndex={assignedIdx} onDrop={handleDrop}>
                    {assignedIdx !== null && (
                      <button
                        type="button"
                        onClick={() => removeFromSlot(pos)}
                        className="ml-auto shrink-0 rounded-xl bg-red-50 border border-red-300 px-3 py-1.5 text-xs text-red-600 hover:bg-red-100"
                      >
                        Remove
                      </button>
                    )}
                  </DropSlot>
                ))}
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!allSlotsFilled}
                className="mt-6 rounded-2xl bg-mind-teal px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-40"
              >
                Submit Order
              </button>

              {!allSlotsFilled && (
                <p className="mt-2 text-xs text-deep-slate/50">Fill all timeline slots to submit.</p>
              )}
            </div>
          </DndProvider>
        )}
      </div>
    </div>
  )
}
