import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { useTelemetry } from '../components/TelemetryContext'

const ITEM_TYPE = 'OBJECT'

const AGED_CONFIG = {
  '11-14': { rounds: 2, poolSize: 6 },
  '15-24': { rounds: 3, poolSize: 7 },
  '25-64': { rounds: 3, poolSize: 8 },
  '65+': { rounds: 3, poolSize: 7 },
}

const ALL_OBJECTS = [
  { id: 'rope', name: 'Rope', emoji: '🪢' },
  { id: 'stick', name: 'Stick', emoji: '🪵' },
  { id: 'cloth', name: 'Cloth', emoji: '🧵' },
  { id: 'wheel', name: 'Wheel', emoji: '⚙️' },
  { id: 'bucket', name: 'Bucket', emoji: '🪣' },
  { id: 'magnet', name: 'Magnet', emoji: '🧲' },
  { id: 'spring', name: 'Spring', emoji: '🔄' },
  { id: 'lens', name: 'Lens', emoji: '🔍' },
]

const PROMPTS = {
  '11-14': [
    { id: 'fix-toy', text: 'Fix a broken toy so it can roll again.' },
    { id: 'reach-shelf', text: 'Reach something high on a shelf.' },
  ],
  '15-24': [
    { id: 'cross-river', text: 'Get across a narrow river without getting wet.' },
    { id: 'signal-help', text: 'Signal for help from a distance without electronics.' },
    { id: 'keep-cool', text: 'Keep food cool during a power outage.' },
  ],
  '25-64': [
    { id: 'persuade', text: 'Persuade someone to change their mind using only physical objects.' },
    { id: 'bridge-gap', text: 'Bridge a gap with limited materials.' },
    { id: 'store-water', text: 'Store and transport water with everyday items.' },
  ],
  '65+': [
    { id: 'daily-easier', text: 'Make daily life easier with common household items.' },
    { id: 'reach-object', text: 'Reach an object that fell behind heavy furniture.' },
    { id: 'organize', text: 'Organize a cluttered space using simple tools.' },
  ],
}

function DraggableObject({ obj, disabled }) {
  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: ITEM_TYPE,
      item: { id: obj.id },
      canDrag: !disabled,
      collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
    }),
    [obj.id, disabled],
  )

  return (
    <div
      ref={dragRef}
      className={`flex cursor-grab flex-col items-center gap-1 rounded-2xl border border-deep-slate bg-canvas border border-deep-slate px-4 py-3 transition hover:border-cyan-500 hover:shadow-md ${
        isDragging ? 'opacity-40' : ''
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <span className="text-2xl">{obj.emoji}</span>
      <span className="text-xs text-deep-slate/80">{obj.name}</span>
    </div>
  )
}

function DropZone({ children, onDrop, maxItems }) {
  const [{ isOver }, dropRef] = useDrop(
    () => ({
      accept: ITEM_TYPE,
      drop: (item) => {
        onDrop(item.id)
      },
      collect: (monitor) => ({ isOver: !!monitor.isOver() }),
    }),
    [onDrop],
  )

  return (
    <div
      ref={dropRef}
      className={`flex min-h-[100px] flex-wrap items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-4 transition ${
        isOver ? 'border-cyan-400 bg-cyan-900/20' : 'border-deep-slate'
      } ${children.length >= maxItems ? 'opacity-60' : ''}`}
    >
      {children.length === 0 && (
        <span className="text-sm text-deep-slate/50">Drag objects here (max {maxItems})</span>
      )}
      {children}
    </div>
  )
}

function CombinerObject({ obj, onRemove }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-mind-teal bg-mind-teal/10 px-3 py-2">
      <span className="text-lg">{obj.emoji}</span>
      <span className="text-sm text-cyan-200">{obj.name}</span>
      <button
        type="button"
        onClick={() => onRemove(obj.id)}
        className="ml-1 text-xs text-deep-slate/60 hover:text-red-600"
      >
        ✕
      </button>
    </div>
  )
}

function shuffled(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function ObjectAlchemist() {
  const { logEvent, ageBracket } = useTelemetry()
  const config = AGED_CONFIG[ageBracket] || AGED_CONFIG['15-24']
  const prompts = PROMPTS[ageBracket] || PROMPTS['15-24']

  const [round, setRound] = useState(0)
  const [combinedIds, setCombinedIds] = useState([])
  const [description, setDescription] = useState('')
  const [submissions, setSubmissions] = useState([])
  const [done, setDone] = useState(false)
  const [report, setReport] = useState(null)
  const [pool, setPool] = useState([])

  const roundStartRef = useRef(performance.now())

  useEffect(() => {
    const poolObjs = shuffled(ALL_OBJECTS).slice(0, config.poolSize)
    setPool(poolObjs)
  }, [config.poolSize])

  const currentPrompt = prompts[round]

  const handleDrop = useCallback(
    (objId) => {
      if (combinedIds.length >= 3) return
      if (combinedIds.includes(objId)) return
      setCombinedIds((prev) => [...prev, objId])
    },
    [combinedIds],
  )

  const handleRemove = useCallback((objId) => {
    setCombinedIds((prev) => prev.filter((id) => id !== objId))
  }, [])

  function handleSubmit() {
    if (combinedIds.length === 0) return
    const wordCount = description.trim() ? description.trim().split(/\s+/).length : 0
    const timeSpent = Math.round(performance.now() - roundStartRef.current)

    logEvent('alchemist.combine', {
      prompt_id: currentPrompt.id,
      objects_used: combinedIds,
      word_count: wordCount,
      time_ms: timeSpent,
    })

    setSubmissions((prev) => [
      ...prev,
      {
        promptId: currentPrompt.id,
        objects: combinedIds,
        wordCount,
        timeMs: timeSpent,
      },
    ])

    if (round + 1 >= prompts.length) {
      finishModule([...submissions, {
        promptId: currentPrompt.id,
        objects: combinedIds,
        wordCount,
        timeMs: timeSpent,
      }])
    } else {
      setRound((r) => r + 1)
      setCombinedIds([])
      setDescription('')
      roundStartRef.current = performance.now()
    }
  }

  function finishModule(allSubs) {
    const totalWordCount = allSubs.reduce((s, sub) => s + sub.wordCount, 0)
    const avgObjects = allSubs.reduce((s, sub) => s + sub.objects.length, 0) / allSubs.length
    const uniqueObjects = new Set(allSubs.flatMap((sub) => sub.objects))

    const creativityScore = Math.min(100,
      allSubs.length * 15 +
        uniqueObjects.size * 5 +
        Math.floor(totalWordCount / 10) * 2
    )

    logEvent('alchemist.complete', {
      total_rounds: allSubs.length,
      avg_objects: Math.round(avgObjects * 10) / 10,
      total_word_count: totalWordCount,
      unique_objects_used: uniqueObjects.size,
      creativity_score: creativityScore,
    })

    setDone(true)
    setReport({
      roundsCompleted: allSubs.length,
      avgObjects: Math.round(avgObjects * 10) / 10,
      totalWordCount,
      uniqueObjects: uniqueObjects.size,
      creativityScore,
    })
  }

  const combinedObjs = combinedIds.map((id) => ALL_OBJECTS.find((o) => o.id === id)).filter(Boolean)
  const availableObjs = pool.filter((o) => !combinedIds.includes(o.id))

  if (done && report) {
    return (
      <div className="relative min-h-screen px-6 py-10 text-deep-slate">
        <div className="pointer-events-none fixed inset-0 bg-grain" />
        <div className="relative mx-auto max-w-5xl border-2 border-deep-slate card-glass shadow-hard rounded-3xl p-8">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold sm:text-3xl">Object Alchemist</h1>
            <Link to="/dashboard" className="rounded-2xl bg-canvas border border-deep-slate px-3 py-2 text-sm text-deep-slate hover:shadow-hard sm:px-4">Dashboard</Link>
          </div>
          <div className="mx-auto mt-8 max-w-md rounded-3xl border border-violet-600/40 border-2 border-deep-slate card-glass shadow-hard rounded-3xl p-6">
            <h3 className="text-lg font-semibold text-violet-300">Creativity Report</h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <span className="text-sm text-deep-slate/60">Creativity Score</span>
                <span className="text-xl font-bold text-violet-400">{report.creativityScore}%</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <span className="text-sm text-deep-slate/60">Rounds Completed</span>
                <span className="text-xl font-bold text-deep-slate">{report.roundsCompleted}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <span className="text-sm text-deep-slate/60">Avg Objects Per Creation</span>
                <span className="text-xl font-bold text-deep-slate">{report.avgObjects}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <span className="text-sm text-deep-slate/60">Unique Objects Used</span>
                <span className="text-xl font-bold text-deep-slate">{report.uniqueObjects}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <span className="text-sm text-deep-slate/60">Total Description Words</span>
                <span className="text-xl font-bold text-deep-slate">{report.totalWordCount}</span>
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
            <h1 className="text-2xl font-semibold sm:text-3xl">Object Alchemist</h1>
            <p className="mt-1 text-sm text-deep-slate/60">Combine objects into creative solutions.</p>
          </div>
          <Link to="/dashboard" className="shrink-0 rounded-2xl bg-canvas border border-deep-slate px-3 py-2 text-sm text-deep-slate hover:shadow-hard sm:px-4">Dashboard</Link>
        </div>

        <DndProvider backend={HTML5Backend}>
          <div className="mx-auto mt-6 max-w-lg">
            <div className="mb-4 flex items-center justify-between text-sm text-deep-slate/60">
              <span>Round {round + 1} of {prompts.length}</span>
            </div>

            <div className="rounded-3xl border border-deep-slate border-2 border-deep-slate card-glass shadow-hard rounded-3xl p-5 text-center">
              <p className="text-base font-medium text-mind-teal sm:text-lg">{currentPrompt?.text}</p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
              {availableObjs.map((obj) => (
                <DraggableObject key={obj.id} obj={obj} disabled={done} />
              ))}
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm text-deep-slate/50">Your creation (max 3 objects):</p>
              <DropZone onDrop={handleDrop} maxItems={3}>
                {combinedObjs.map((obj) => (
                  <CombinerObject key={obj.id} obj={obj} onRemove={handleRemove} />
                ))}
              </DropZone>
            </div>

            <div className="mt-4">
              <label className="block text-sm text-deep-slate/50">Describe how your creation works:</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="3"
                disabled={done}
                placeholder="Explain your invention..."
                className="mt-2 w-full rounded-2xl border border-deep-slate bg-canvas px-4 py-3 text-sm text-deep-slate"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={combinedIds.length === 0 || done}
              className="mt-4 w-full rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {round + 1 >= prompts.length ? 'Finish Module' : 'Submit Creation'}
            </button>
          </div>
        </DndProvider>
      </div>
    </div>
  )
}
