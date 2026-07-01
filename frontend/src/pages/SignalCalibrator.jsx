import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTelemetry } from '../components/TelemetryContext'

const AGE_CONFIG = {
  '11-14': { blipCount: 4, speed: 0.4, staticDensity: 0.3, seqLen: 3, alarmDelay: 12000, timeout: 50000 },
  '15-24': { blipCount: 5, speed: 0.7, staticDensity: 0.5, seqLen: 4, alarmDelay: 15000, timeout: 60000 },
  '25-64': { blipCount: 6, speed: 0.9, staticDensity: 0.7, seqLen: 5, alarmDelay: 15000, timeout: 60000 },
  '65+':  { blipCount: 5, speed: 0.5, staticDensity: 0.5, seqLen: 4, alarmDelay: 18000, timeout: 70000 },
}

function randomBetween(a, b) {
  return a + Math.random() * (b - a)
}

function initBlips(count) {
  const blips = []
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count
    const radius = 60 + Math.random() * 40
    blips.push({
      id: i,
      angle,
      radius,
      speed: 0.3 + Math.random() * 0.6,
      x: 0, y: 0,
      pulse: Math.random() * Math.PI * 2,
    })
  }
  return blips
}

export default function SignalCalibrator() {
  const { logEvent, ageBracket } = useTelemetry()
  const cfg = AGE_CONFIG[ageBracket] || AGE_CONFIG['15-24']
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const timeRef = useRef(0)
  const [score, setScore] = useState(0)
  const [rogueIndex, setRogueIndex] = useState(() => Math.floor(Math.random() * cfg.blipCount))
  const [staticLevel, setStaticLevel] = useState(0)
  const [alarmActive, setAlarmActive] = useState(false)
  const [alarmPhase, setAlarmPhase] = useState(null) // null | 'showing' | 'recalling'
  const [alarmSequence, setAlarmSequence] = useState('')
  const [alarmInput, setAlarmInput] = useState('')
  const [alarmResult, setAlarmResult] = useState(null)
  const [completed, setCompleted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(cfg.timeout / 1000)
  const [microReport, setMicroReport] = useState(null)
  const blipsRef = useRef(initBlips(cfg.blipCount))
  const rogueRef = useRef(rogueIndex)
  const scoreRef = useRef(0)
  const staticRef = useRef(0)
  const alarmDoneRef = useRef(false)
  const lastStaticUpdate = useRef(0)

  const generateSequence = useCallback((len) => {
    let s = ''
    for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10).toString()
    return s
  }, [])

  useEffect(() => {
    rogueRef.current = rogueIndex
  }, [rogueIndex])

  useEffect(() => {
    const seq = generateSequence(cfg.seqLen)
    setAlarmSequence(seq)
  }, [generateSequence, cfg.seqLen])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const W = rect.width
    const H = rect.height
    const cx = W / 2
    const cy = H / 2

    let startTime = performance.now()

    function draw(timestamp) {
      const elapsed = (timestamp - startTime) / 1000
      timeRef.current = elapsed
      const t = elapsed * cfg.speed

      ctx.clearRect(0, 0, W, H)

      ctx.fillStyle = '#FAFAFA'
      ctx.fillRect(0, 0, W, H)

      ctx.strokeStyle = '#1A1D2E'
      ctx.lineWidth = 1
      for (let ring = 1; ring <= 3; ring++) {
        ctx.beginPath()
        ctx.arc(cx, cy, ring * 50, 0, Math.PI * 2)
        ctx.stroke()
      }

      const sweepAngle = (t * 0.5) % (Math.PI * 2)
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, 150, sweepAngle - 0.15, sweepAngle + 0.15)
      ctx.closePath()
      ctx.fillStyle = 'rgba(78, 168, 222, 0.08)'
      ctx.fill()

      const blips = blipsRef.current
      blips.forEach((blip, i) => {
        const a = blip.angle + t * blip.speed
        const r = blip.radius + Math.sin(t * 0.8 + i) * 15
        blip.x = cx + Math.cos(a) * r
        blip.y = cy + Math.sin(a) * r

        const isStatic = staticRef.current
        const jitter = isStatic * 2
        const bx = blip.x + (Math.random() - 0.5) * jitter
        const by = blip.y + (Math.random() - 0.5) * jitter

        const isRogue = i === rogueRef.current
        ctx.beginPath()
        ctx.arc(bx, by, isRogue ? 7 : 5, 0, Math.PI * 2)
        ctx.fillStyle = isRogue ? '#f43f5e' : '#4EA8DE'
        ctx.fill()
        if (isRogue) {
          ctx.strokeStyle = '#f43f5e'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(bx, by, 12 + Math.sin(t * 3) * 2, 0, Math.PI * 2)
          ctx.stroke()
        }
      })

      const sl = staticRef.current
      if (sl > 0) {
        for (let i = 0; i < sl * 60; i++) {
          ctx.fillStyle = `rgba(26, 29, 46, ${Math.random() * 0.3})`
          ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2)
        }
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [cfg.speed])

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = timeRef.current * 1000
      if (elapsed > cfg.alarmDelay && !alarmDoneRef.current && !completed) {
        alarmDoneRef.current = true
        setAlarmActive(true)
        setAlarmPhase('showing')
        setTimeout(() => setAlarmPhase('recalling'), 3000)
      }

      const newStatic = Math.min(1, elapsed / (cfg.timeout * 0.8))
      staticRef.current = newStatic
      setStaticLevel(newStatic)

      const remaining = Math.max(0, Math.ceil((cfg.timeout - elapsed) / 1000))
      setTimeLeft(remaining)

      if (elapsed >= cfg.timeout && !completed) {
        setCompleted(true)
        cancelAnimationFrame(animRef.current)
        const finalScore = Math.round((scoreRef.current / (cfg.blipCount * 5)) * 100)
        setMicroReport({
          score: finalScore,
          clicks: scoreRef.current,
          alarmCorrect: alarmResult === 'correct',
        })
        logEvent('signal.complete', {
          score: finalScore,
          clicks: scoreRef.current,
          alarmCorrect: alarmResult === 'correct',
        })
      }
    }, 500)
    return () => clearInterval(interval)
  }, [cfg.alarmDelay, cfg.timeout, cfg.blipCount, completed, alarmResult, logEvent])

  function handleCanvasClick(e) {
    if (completed || alarmActive) return
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const blips = blipsRef.current
    let hit = -1
    blips.forEach((blip, i) => {
      const dx = blip.x - mx
      const dy = blip.y - my
      if (Math.sqrt(dx * dx + dy * dy) < 18) hit = i
    })

    const isRogue = hit === rogueRef.current
    if (hit >= 0) {
      logEvent('signal.click', { blipIndex: hit, isRogue })
      if (isRogue) {
        scoreRef.current += 1
        setScore(scoreRef.current)
        const newRogue = (rogueRef.current + 1 + Math.floor(Math.random() * (cfg.blipCount - 1))) % cfg.blipCount
        rogueRef.current = newRogue
        setRogueIndex(newRogue)
      }
    }
  }

  function handleAlarmSubmit() {
    const correct = alarmInput === alarmSequence
    setAlarmResult(correct ? 'correct' : 'wrong')
    logEvent('signal.alarm.sequence', { correct })
    setTimeout(() => setAlarmActive(false), 1500)
  }

  return (
    <div className="relative min-h-screen px-6 py-10 text-deep-slate">
      <div className="pointer-events-none fixed inset-0 bg-grain" />
      <div className="relative mx-auto max-w-5xl card rounded-3xl p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Signal Calibrator</h1>
            <p className="mt-1 text-sm text-mind-teal">Phase 1 &mdash; Attention &amp; Focus</p>
            <p className="mt-2 text-deep-slate/60">Track the rogue signal (red) while ignoring static. A secondary alarm will test divided attention.</p>
          </div>
          <Link to="/dashboard" className="rounded-2xl bg-canvas border border-deep-slate px-4 py-2 text-deep-slate hover:shadow-hard">
            Dashboard
          </Link>
        </div>

        {microReport ? (
          <div className="mt-8 card border-mind-teal p-6">
            <h3 className="text-2xl font-semibold text-mind-teal">Micro-Report: Signal Calibrator</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <p className="text-sm text-deep-slate/60">Score</p>
                <p className="text-3xl font-bold text-mind-teal">{microReport.score}%</p>
              </div>
              <div className="rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <p className="text-sm text-deep-slate/60">Rogue clicks</p>
                <p className="text-3xl font-bold text-mind-teal">{microReport.clicks}</p>
              </div>
              <div className="rounded-2xl bg-canvas border border-deep-slate px-5 py-4">
                <p className="text-sm text-deep-slate/60">Alarm recall</p>
                <p className="text-3xl font-bold text-mind-teal">{microReport.alarmCorrect ? 'Correct' : 'Missed'}</p>
              </div>
            </div>
            <Link to="/dashboard" className="mt-6 inline-flex rounded-2xl bg-mind-teal px-6 py-3 font-semibold text-white hover:opacity-90">
              Back to Dashboard
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-center justify-between gap-6">
              <div className="flex gap-6">
                <div>
                  <p className="text-sm text-deep-slate/60">Score</p>
                  <p className="text-2xl font-bold text-mind-teal">{score}</p>
                </div>
                <div>
                  <p className="text-sm text-deep-slate/60">Static</p>
                  <p className="text-2xl font-bold text-mind-teal">{Math.round(staticLevel * 100)}%</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-deep-slate/60">Time</p>
                <p className={`text-2xl font-bold ${timeLeft < 10 ? 'text-red-400' : 'text-mind-teal'}`}>{timeLeft}s</p>
              </div>
            </div>

            <div className="relative mt-4">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="w-full h-[400px] rounded-2xl border border-deep-slate cursor-crosshair"
              />
              {alarmActive && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/90">
                  {alarmPhase === 'showing' && (
                    <div className="rounded-3xl border border-insight-yellow card p-8 text-center">
                      <h3 className="text-xl font-semibold text-insight-yellow">Secondary Alarm!</h3>
                      <p className="mt-2 text-sm text-deep-slate/60">Memorize this sequence:</p>
                      <p className="mt-4 text-5xl font-bold tracking-[0.3em] text-insight-yellow">
                        {alarmSequence.split('').map((d, i) => (
                          <span key={i} className="inline-block animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}>
                            {d}
                          </span>
                        ))}
                      </p>
                      <p className="mt-4 text-xs text-deep-slate/50">Disappearing in 3 seconds...</p>
                    </div>
                  )}
                  {alarmPhase === 'recalling' && (
                    <div className="rounded-3xl border border-insight-yellow card p-8 text-center">
                      <h3 className="text-xl font-semibold text-insight-yellow">Recall the Sequence</h3>
                      <p className="mt-3 text-lg text-deep-slate/80">Type the sequence you saw:</p>
                      {alarmResult ? (
                        <p className={`mt-4 text-2xl font-bold ${alarmResult === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
                          {alarmResult === 'correct' ? 'Correct!' : 'Wrong'}
                        </p>
                      ) : (
                        <div className="mt-4 flex items-center justify-center gap-3">
                          <input
                            value={alarmInput}
                            onChange={(e) => setAlarmInput(e.target.value)}
                            maxLength={cfg.seqLen}
                            className="w-40 rounded-2xl border border-deep-slate bg-white px-4 py-3 text-center text-2xl text-deep-slate tracking-widest"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleAlarmSubmit}
                            className="rounded-2xl bg-amber-500 px-6 py-3 font-semibold text-deep-slate hover:bg-amber-400"
                          >
                            Confirm
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <p className="mt-4 text-sm text-deep-slate/50">Click on the pulsing red blip to track it. Static interference grows over time.</p>
          </>
        )}
      </div>
    </div>
  )
}
