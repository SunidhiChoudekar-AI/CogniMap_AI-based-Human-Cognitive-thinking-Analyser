import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'

const TelemetryContext = createContext(null)

export function TelemetryProvider({ children }) {
  const [sessionId] = useState(() => {
    return localStorage.getItem('cognimap_session_id') || `session-${Date.now()}`
  })
  const [ageBracket, setAgeBracket] = useState(() => localStorage.getItem('cognimap_age_bracket') || '15-24')
  const queueRef = useRef([])
  const flushingRef = useRef(false)

  useEffect(() => {
    localStorage.setItem('cognimap_session_id', sessionId)
  }, [sessionId])

  useEffect(() => {
    localStorage.setItem('cognimap_age_bracket', ageBracket)
  }, [ageBracket])

  useEffect(() => {
    const interval = setInterval(() => {
      flushEvents()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  async function flushEvents() {
    if (flushingRef.current) {
      return
    }

    const events = queueRef.current.splice(0)
    if (events.length === 0) {
      return
    }

    flushingRef.current = true
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      await axios.post(`${apiUrl}/api/telemetry/batch`, {
        session_id: sessionId,
        age_bracket: ageBracket,
        events,
      })
    } catch (error) {
      console.error('Telemetry flush failed', error)
      queueRef.current.unshift(...events)
    } finally {
      flushingRef.current = false
    }
  }

  function logEvent(eventType, data) {
    const event = {
      event_id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      event_type: eventType,
      timestamp: new Date().toISOString(),
      data,
    }
    queueRef.current.push(event)
  }

  const value = useMemo(
    () => ({ sessionId, ageBracket, setAgeBracket, logEvent, flushEvents }),
    [sessionId, ageBracket],
  )

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>
}

export function useTelemetry() {
  const context = useContext(TelemetryContext)
  if (!context) {
    throw new Error('useTelemetry must be used within TelemetryProvider')
  }
  return context
}
