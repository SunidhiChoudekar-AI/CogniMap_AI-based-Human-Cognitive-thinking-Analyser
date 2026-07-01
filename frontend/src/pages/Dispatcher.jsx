import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { useTelemetry } from '../components/TelemetryContext'

const ItemTypes = { BLOCK: 'block', WORD: 'word' }

const COLORS = ['#f43f5e', '#3b82f6', '#22c55e', '#f59e0b']

const AGE_CONFIG = {
  '11-14': { taskCount: 2, batteryDrain: 2, bonusFreq: 15000, mathMax: 10, wordCount: 3 },
  '15-24': { taskCount: 3, batteryDrain: 3, bonusFreq: 12000, mathMax: 50, wordCount: 4 },
  '25-64': { taskCount: 3, batteryDrain: 4, bonusFreq: 10000, mathMax: 100, wordCount: 5 },
  '65+':  { taskCount: 2, batteryDrain: 2, bonusFreq: 18000, mathMax: 20, wordCount: 3 },
}

function DraggableBlock({ block, onDrop }) {
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: ItemTypes.BLOCK,
    item: () => block,
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult()
      if (dropResult) onDrop(item, dropResult)
    },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [block, onDrop])

  return (
    <div
      ref={dragRef}
      className={`inline-flex h-10 w-10 cursor-grab items-center justify-center rounded-xl border-2 transition ${isDragging ? 'opacity-30' : 'opacity-100'}`}
      style={{ backgroundColor: block.color, borderColor: block.color }}
    >
      <span className="text-xs font-bold text-white">{block.label}</span>
    </div>
  )
}

function DroppableBin({ color, label, children }) {
  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: ItemTypes.BLOCK,
    drop: () => ({ binColor: color }),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }), [color])

  return (
    <div
      ref={dropRef}
        className={`flex min-h-[80px] flex-col items-center justify-center rounded-2xl border-2 p-3 transition ${
          isOver ? 'border-mind-teal bg-mind-teal/10' : 'border-deep-slate card-glass shadow-hard'
        }`}
    >
      <div className="h-6 w-6 rounded-full" style={{ backgroundColor: color }} />
      <span className="mt-1 text-xs text-deep-slate/60">{label}</span>
      {children}
    </div>
  )
}

function DraggableWord({ word, onDrop }) {
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: ItemTypes.WORD,
    item: () => word,
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult()
      if (dropResult) onDrop(item, dropResult)
    },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [word, onDrop])

  return (
    <div
      ref={dragRef}
        className={`cursor-grab rounded-xl border px-3 py-2 text-sm transition ${
          isDragging ? 'opacity-30 border-mind-teal' : 'border-deep-slate bg-canvas border border-deep-slate hover:border-slate-500'
        }`}
    >
      {word.text}
    </div>
  )
}

function DroppableCategory({ category, color, children }) {
  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: ItemTypes.WORD,
    drop: () => ({ category }),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }), [category])

  return (
    <div
      ref={dropRef}
        className={`flex min-h-[60px] flex-col items-center justify-center rounded-2xl border-2 p-2 transition ${
          isOver ? 'border-mind-teal bg-mind-teal/10' : 'border-deep-slate card-glass shadow-hard'
        }`}
    >
      <span className="text-xs font-semibold" style={{ color }}>{category}</span>
      {children}
    </div>
  )
}

function SortTask({ cfg, onScoreChange, onExpire }) {
  const [blocks, setBlocks] = useState(() =>
    COLORS.slice(0, 3).map((c, i) => ({ id: i, color: c, label: String.fromCharCode(65 + i) })),
  )
  const [placed, setPlaced] = useState({})

  const handleDrop = useCallback((block, dropResult) => {
    const binColor = dropResult.binColor
    const correct = block.color === binColor
    setBlocks((prev) => prev.filter((b) => b.id !== block.id))
    setPlaced((prev) => ({ ...prev, [block.id]: correct }))
    onScoreChange(correct ? 10 : -5)
  }, [onScoreChange])

  return (
    <div className="rounded-2xl border-2 border-deep-slate card-glass shadow-hard p-4">
      <h4 className="text-sm font-semibold text-deep-slate/80">Sort Blocks</h4>
      <p className="text-xs text-deep-slate/50">Drag each block to its matching bin</p>
      <div className="mt-3 flex gap-2">
        {blocks.map((block) => (
          <DraggableBlock key={block.id} block={block} onDrop={handleDrop} />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {COLORS.slice(0, 3).map((color) => (
          <DroppableBin key={color} color={color} label="Bin" />
        ))}
      </div>
      {Object.keys(placed).length > 0 && (
        <p className="mt-2 text-xs text-deep-slate/50">
          Placed: {Object.values(placed).filter(Boolean).length}/{Object.keys(placed).length} correct
        </p>
      )}
    </div>
  )
}

function MathTask({ cfg, onScoreChange }) {
  const [a, setA] = useState(() => Math.floor(Math.random() * cfg.mathMax))
  const [b, setB] = useState(() => Math.floor(Math.random() * cfg.mathMax))
  const [answer, setAnswer] = useState('')
  const [solved, setSolved] = useState(false)

  const handleSubmit = useCallback(() => {
    const val = parseInt(answer, 10)
    if (val === a + b) {
      onScoreChange(15)
      setSolved(true)
      setTimeout(() => {
        setA(Math.floor(Math.random() * cfg.mathMax))
        setB(Math.floor(Math.random() * cfg.mathMax))
        setAnswer('')
        setSolved(false)
      }, 1000)
    } else {
      onScoreChange(-3)
      setAnswer('')
    }
  }, [answer, a, b, cfg.mathMax, onScoreChange])

  return (
    <div className="rounded-2xl border-2 border-deep-slate card-glass shadow-hard p-4">
      <h4 className="text-sm font-semibold text-deep-slate/80">Math</h4>
      <p className="mt-2 text-2xl font-bold text-mind-teal">{a} + {b} = ?</p>
      <div className="mt-3 flex gap-2">
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          type="number"
          className="w-24 rounded-xl border border-deep-slate bg-canvas px-3 py-2 text-center text-deep-slate"
        />
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded-xl bg-mind-teal px-4 py-2 font-semibold text-white hover:opacity-90"
        >
          Answer
        </button>
      </div>
        {solved && <p className="mt-2 text-xs text-green-600">Correct!</p>}
    </div>
  )
}

const WORD_POOL = [
  { text: 'Apple', category: 'Fruit', catColor: '#22c55e' },
  { text: 'Carrot', category: 'Vegetable', catColor: '#f59e0b' },
  { text: 'Dog', category: 'Animal', catColor: '#3b82f6' },
  { text: 'Rose', category: 'Flower', catColor: '#f43f5e' },
  { text: 'Table', category: 'Furniture', catColor: '#a855f7' },
]

function MatchTask({ cfg, onScoreChange }) {
  const categories = useMemo(() => {
    const cats = [...new Set(WORD_POOL.map((w) => w.category))]
    return cats.slice(0, 2)
  }, [])

  const [words, setWords] = useState(() => {
    return WORD_POOL.filter((w) => categories.includes(w.category)).sort(() => Math.random() - 0.5)
  })
  const [matched, setMatched] = useState({})

  const handleDrop = useCallback((word, dropResult) => {
    const correct = word.category === dropResult.category
    setWords((prev) => prev.filter((w) => w.text !== word.text))
    setMatched((prev) => ({ ...prev, [word.text]: correct }))
    onScoreChange(correct ? 10 : -5)
  }, [onScoreChange])

  return (
    <div className="rounded-2xl border-2 border-deep-slate card-glass shadow-hard p-4">
      <h4 className="text-sm font-semibold text-deep-slate/80">Match Words</h4>
      <p className="text-xs text-deep-slate/50">Drag each word to its category</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {words.map((word) => (
          <DraggableWord key={word.text} word={word} onDrop={handleDrop} />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {categories.map((cat) => (
          <DroppableCategory key={cat} category={cat} color={WORD_POOL.find((w) => w.category === cat)?.catColor} />
        ))}
      </div>
      {Object.keys(matched).length > 0 && (
        <p className="mt-2 text-xs text-deep-slate/50">
          Matched: {Object.values(matched).filter(Boolean).length}/{Object.keys(matched).length} correct
        </p>
      )}
    </div>
  )
}

export default function Dispatcher() {
  const { logEvent, ageBracket } = useTelemetry()
  const cfg = AGE_CONFIG[ageBracket] || AGE_CONFIG['15-24']
  const [battery, setBattery] = useState(100)
  const [score, setScore] = useState(0)
  const [bonus, setBonus] = useState(null)
  const [completed, setCompleted] = useState(false)
  const [microReport, setMicroReport] = useState(null)
  const bonusRef = useRef(null)

  const handleScoreChange = useCallback((delta) => {
    setScore((prev) => Math.max(0, prev + delta))
  }, [])

  useEffect(() => {
    const batteryInterval = setInterval(() => {
      setBattery((prev) => {
        const next = prev - cfg.batteryDrain
        if (next <= 0) {
          clearInterval(batteryInterval)
          clearInterval(bonusRef.current)
          setCompleted(true)
          logEvent('dispatcher.complete', { finalScore: score })
          setMicroReport({ score, reason: 'Battery depleted' })
          return 0
        }
        return next
      })
    }, 2000)
    return () => clearInterval(batteryInterval)
  }, [cfg.batteryDrain, score, logEvent])

  useEffect(() => {
    bonusRef.current = setInterval(() => {
      const bonuses = [
        { text: 'Sort is now 2x points!', task: 'sort', multiplier: 2 },
        { text: 'Math is now 2x points!', task: 'math', multiplier: 2 },
        { text: 'Match is now 2x points!', task: 'match', multiplier: 2 },
      ]
      const active = bonuses[Math.floor(Math.random() * bonuses.length)]
      setBonus(active)
      logEvent('dispatcher.bonusApplied', { task: active.task })
      setTimeout(() => setBonus(null), 8000)
    }, cfg.bonusFreq)
    return () => clearInterval(bonusRef.current)
  }, [cfg.bonusFreq, logEvent])

  useEffect(() => {
    if (battery <= 0 && !completed) {
      setCompleted(true)
      logEvent('dispatcher.complete', { finalScore: score })
      setMicroReport({ score, reason: 'Battery depleted' })
    }
  }, [battery, completed, score, logEvent])

  const tasks = useMemo(() => {
    const list = []
    list.push(<SortTask key="sort" cfg={cfg} onScoreChange={handleScoreChange} />)
    list.push(<MathTask key="math" cfg={cfg} onScoreChange={handleScoreChange} />)
    if (cfg.taskCount >= 3) {
      list.push(<MatchTask key="match" cfg={cfg} onScoreChange={handleScoreChange} />)
    }
    return list
  }, [cfg, handleScoreChange])

  return (
    <div className="relative min-h-screen px-6 py-10 text-deep-slate">
      <div className="pointer-events-none fixed inset-0 bg-grain" />
      <div className="relative mx-auto max-w-5xl border-2 border-deep-slate card-glass shadow-hard rounded-3xl p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Dispatcher</h1>
            <p className="mt-1 text-sm text-mind-teal">Phase 2 &mdash; Executive Functions</p>
            <p className="mt-2 text-deep-slate/60">Manage multiple tasks with limited battery. Priorities change constantly.</p>
          </div>
          <Link to="/dashboard" className="rounded-2xl bg-canvas border border-deep-slate px-4 py-2 text-deep-slate hover:shadow-hard">
            Dashboard
          </Link>
        </div>

        {microReport ? (
          <div className="mt-8 rounded-3xl border-2 border-mind-teal card-glass shadow-hard p-6">
            <h3 className="text-2xl font-semibold text-mind-teal">Micro-Report: Dispatcher</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <p className="text-sm text-deep-slate/60">Final Score</p>
                <p className="text-3xl font-bold text-mind-teal">{microReport.score}</p>
              </div>
              <div className="rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <p className="text-sm text-deep-slate/60">Outcome</p>
                <p className="text-3xl font-bold text-mind-teal">{microReport.reason}</p>
              </div>
            </div>
            <Link to="/dashboard" className="mt-6 inline-flex rounded-2xl bg-mind-teal px-6 py-3 font-semibold text-white hover:opacity-90">
              Back to Dashboard
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-deep-slate/60">Battery</p>
                  <p className="text-sm font-bold text-mind-teal">{battery}%</p>
                </div>
                <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-canvas border border-deep-slate">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${battery}%`,
                      backgroundColor: battery > 50 ? '#06b6d4' : battery > 20 ? '#f59e0b' : '#f43f5e',
                    }}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm text-deep-slate/60">Score</p>
                <p className="text-2xl font-bold text-mind-teal">{score}</p>
              </div>
            </div>

            {bonus && (
              <div className="mt-4 animate-pulse rounded-2xl bg-yellow-900/40 p-4 text-center border border-yellow-600">
                <p className="text-lg font-bold text-yellow-300">{bonus.text}</p>
              </div>
            )}

            <div className="mt-6">
              <DndProvider backend={HTML5Backend}>
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cfg.taskCount}, minmax(0, 1fr))` }}>
                  {tasks}
                </div>
              </DndProvider>
            </div>

            <p className="mt-4 text-sm text-deep-slate/50">
              Keep all tasks running. Battery drains over time &mdash; prioritise wisely.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
