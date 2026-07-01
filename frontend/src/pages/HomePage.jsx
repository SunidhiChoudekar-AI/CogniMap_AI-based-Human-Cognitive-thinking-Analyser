import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'

export default function HomePage() {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const displayName = user?.email || (user?.is_guest ? 'Guest' : 'User')
  const isGuest = user?.is_guest

  return (
    <div className="relative min-h-screen px-6 py-10 text-deep-slate">
      <div className="pointer-events-none fixed inset-0 bg-grain" />
      <div className="relative mx-auto flex max-w-2xl flex-col items-center justify-center gap-10 pt-20 text-center">
        <div className="rounded-3xl border-2 border-deep-slate card-glass p-8 shadow-hard">
          <h1 className="font-heading text-3xl font-bold">
            Welcome{isGuest ? '' : ','} {displayName}
          </h1>
          <p className="mt-3 text-deep-slate/60">
            Your Cognitive Twin is ready to be mapped. Start the assessment to explore
            how your mind processes information across ten unique modules.
          </p>

          {isGuest && user?.guest_id && (
            <div className="mt-6 rounded-2xl border-2 border-mind-teal/40 bg-canvas px-5 py-4">
              <p className="text-xs text-deep-slate/50">Your Guest ID (save this to log back in)</p>
              <p className="mt-1 text-lg font-bold tracking-widest text-mind-teal">{user.guest_id}</p>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(user.guest_id)}
                className="mt-1 text-xs text-deep-slate/40 underline underline-offset-2 hover:text-deep-slate"
              >
                Copy
              </button>
            </div>
          )}

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-primary inline-flex rounded-2xl bg-mind-teal px-10 py-4 text-lg font-bold text-white shadow-hard hover:shadow-hard-hover transition-pop"
            >
              Start Assessment
            </button>
            <button
              type="button"
              onClick={() => { logout(); navigate('/', { replace: true }) }}
              className="rounded-2xl border-2 border-deep-slate bg-white px-6 py-4 text-sm font-semibold text-deep-slate transition-pop hover:shadow-hard"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
