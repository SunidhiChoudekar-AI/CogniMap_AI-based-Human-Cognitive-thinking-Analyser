import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../components/AuthContext'
import { useTelemetry } from '../components/TelemetryContext'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export default function LandingPage() {
  const navigate = useNavigate()
  const { sessionId, logEvent } = useTelemetry()
  const { isAuthenticated, loginWithGoogle, loginWithEmail, createGuest, loginWithGuestId } = useAuth()
  const [mode, setMode] = useState('intro')
  const [authError, setAuthError] = useState('')
  const [email, setEmail] = useState('')
  const [guestIdInput, setGuestIdInput] = useState('')
  const [createdGuestId, setCreatedGuestId] = useState('')
  const [showGuestLogin, setShowGuestLogin] = useState(false)

  if (isAuthenticated && mode !== 'guest_created') {
    return <Navigate to="/home" replace />
  }

  async function handleGoogleSuccess(credentialResponse) {
    setAuthError('')
    try {
      await loginWithGoogle(credentialResponse.credential, sessionId)
      logEvent('auth.google.signin', {})
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message
      setAuthError(detail)
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      setAuthError('Please enter a valid email address.')
      return
    }
    setAuthError('')
    try {
      await loginWithEmail(email, sessionId)
      logEvent('auth.email.signin', { email })
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message
      setAuthError(detail)
    }
  }

  async function handleGuestCreate() {
    setAuthError('')
    try {
      const result = await createGuest(sessionId)
      setCreatedGuestId(result.user.guest_id)
      setMode('guest_created')
      logEvent('auth.guest.create', { guest_id: result.user.guest_id })
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message
      setAuthError(detail)
    }
  }

  function handleGuestContinue() {
    navigate('/home', { replace: true })
  }

  async function handleGuestLoginSubmit(e) {
    e.preventDefault()
    if (!guestIdInput.trim()) {
      setAuthError('Please enter your Guest ID.')
      return
    }
    setAuthError('')
    try {
      await loginWithGuestId(guestIdInput.trim(), sessionId)
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message
      setAuthError(detail)
    }
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{
        backgroundImage: 'url(https://i.pinimg.com/1200x/c3/97/66/c3976631468d6137d7bcd9586fb7e031.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="pointer-events-none fixed inset-0 bg-black/55" />
      <div className="pointer-events-none fixed inset-0 bg-grain" />

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-12 text-center text-white">

        {mode === 'intro' && (
          <div className="flex flex-col items-center gap-8">
            <div>
              <h1 className="font-heading text-4xl font-extrabold leading-tight sm:text-5xl">
                Your Mind Isn&apos;t a Multiple-Choice Test.<br />
                <span className="text-mind-teal">Stop Testing It Like One.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
                Most brain games measure how well you play their games. CogniMap is different.
                We don&apos;t care about high scores; we care about your processing style.
                By interacting with beautiful, responsive micro-environments, CogniMap tracks
                thousands of split-second behavioral patterns to map your true Cognitive Twin.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 text-sm font-medium">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-mind-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Beyond Gamification
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-mind-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" />
                </svg>
                High-Frequency Telemetry
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-mind-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l-.054.09A11 11 0 0010 21.95V17a3 3 0 013-3h4a3 3 0 003-3v-1a2 2 0 012 2v1a3 3 0 01-3 3h-1v2a2 2 0 01-2 2h-1.5" />
                </svg>
                The Thinking Fingerprint
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMode('auth')}
              className="btn-primary inline-flex rounded-2xl bg-mind-teal px-10 py-4 text-lg font-bold text-white shadow-hard hover:shadow-hard-hover transition-pop"
            >
              Get Started
            </button>
          </div>
        )}

        {mode === 'auth' && (
          <div className="mx-auto max-w-md rounded-3xl border-2 border-white/20 bg-white/10 p-8 backdrop-blur-md">
            <h2 className="text-2xl font-bold">Welcome to CogniMap</h2>
            <p className="mt-2 text-sm text-white/60">Sign in to begin mapping your Cognitive Twin.</p>

            <div className="mt-6 space-y-4">
              {googleClientId && (
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setAuthError('Google sign-in failed.')}
                    size="large"
                    theme="outline"
                    shape="pill"
                    text="signin_with"
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-white/20" />
                <span className="text-xs text-white/40">OR</span>
                <span className="h-px flex-1 bg-white/20" />
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border-2 border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-mind-teal"
                />
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-white/20 px-4 py-3 font-semibold text-white transition hover:bg-white/30"
                >
                  Continue with Email
                </button>
              </form>

              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-white/20" />
                <span className="text-xs text-white/40">OR</span>
                <span className="h-px flex-1 bg-white/20" />
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleGuestCreate}
                  className="w-full rounded-2xl border-2 border-white/20 px-4 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  Continue as Guest
                </button>
                <button
                  type="button"
                  onClick={() => setShowGuestLogin(!showGuestLogin)}
                  className="w-full text-sm text-white/40 underline underline-offset-2 hover:text-white/60"
                >
                  {showGuestLogin ? 'Hide' : 'Already have a Guest ID? Sign in'}
                </button>
                {showGuestLogin && (
                  <form onSubmit={handleGuestLoginSubmit} className="mt-2 space-y-2">
                    <input
                      type="text"
                      placeholder="Enter your Guest ID"
                      value={guestIdInput}
                      onChange={(e) => setGuestIdInput(e.target.value)}
                      className="w-full rounded-2xl border-2 border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-mind-teal"
                    />
                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30"
                    >
                      Sign In with Guest ID
                    </button>
                  </form>
                )}
              </div>
            </div>

            {authError && (
              <p className="mt-4 text-sm text-red-400">{authError}</p>
            )}

            <button
              type="button"
              onClick={() => { setMode('intro'); setAuthError(''); setShowGuestLogin(false) }}
              className="mt-4 text-sm text-white/40 underline underline-offset-2 hover:text-white/60"
            >
              Back
            </button>
          </div>
        )}

        {mode === 'guest_created' && (
          <div className="mx-auto max-w-md rounded-3xl border-2 border-white/20 bg-white/10 p-8 backdrop-blur-md">
            <h2 className="text-2xl font-bold">You&apos;re all set!</h2>
            <p className="mt-2 text-sm text-white/60">
              Your unique Guest ID is below. Save it to log back in later.
            </p>
            <div className="mt-6 rounded-2xl border-2 border-mind-teal/40 bg-white/5 px-6 py-4">
              <p className="text-3xl font-bold tracking-widest text-mind-teal">{createdGuestId}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(createdGuestId)
                setAuthError('Copied!')
              }}
              className="mt-2 text-sm text-white/40 underline underline-offset-2 hover:text-white/60"
            >
              Copy to clipboard
            </button>
            <button
              type="button"
              onClick={handleGuestContinue}
              className="mt-6 w-full rounded-2xl bg-mind-teal px-6 py-3 font-bold text-white transition-pop hover:shadow-hard"
            >
              Continue to CogniMap
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
