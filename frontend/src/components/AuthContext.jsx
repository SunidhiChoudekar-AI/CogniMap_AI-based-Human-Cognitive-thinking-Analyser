import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('cognimap_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      localStorage.removeItem('cognimap_user')
      return null
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem('cognimap_token'))

  useEffect(() => {
    if (token) {
      localStorage.setItem('cognimap_token', token)
    } else {
      localStorage.removeItem('cognimap_token')
    }
  }, [token])

  useEffect(() => {
    if (user) {
      localStorage.setItem('cognimap_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('cognimap_user')
    }
  }, [user])

  async function loginWithGoogle(credentialToken, sessionId) {
    const { data } = await axios.post(`${apiUrl}/api/auth/google`, {
      token: credentialToken,
      session_id: sessionId,
    })
    setToken(data.token)
    setUser(data.user)
    return data
  }

  async function loginWithEmail(email, sessionId) {
    const { data } = await axios.post(`${apiUrl}/api/auth/email`, {
      email,
      session_id: sessionId,
    })
    setToken(data.token)
    setUser(data.user)
    return data
  }

  async function createGuest(sessionId) {
    const { data } = await axios.post(`${apiUrl}/api/auth/guest/create`, {
      session_id: sessionId,
    })
    setToken(data.token)
    setUser(data.user)
    return data
  }

  async function loginWithGuestId(guestId, sessionId) {
    const { data } = await axios.post(`${apiUrl}/api/auth/guest/login`, {
      guest_id: guestId,
      session_id: sessionId,
    })
    setToken(data.token)
    setUser(data.user)
    return data
  }

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!token,
      loginWithGoogle,
      loginWithEmail,
      createGuest,
      loginWithGuestId,
      logout,
    }),
    [user, token, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
