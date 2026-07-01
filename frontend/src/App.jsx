import { Navigate, BrowserRouter, Route, Routes } from 'react-router-dom'
import { TelemetryProvider } from './components/TelemetryContext'
import { useAuth } from './components/AuthContext'
import LandingPage from './pages/LandingPage'
import HomePage from './pages/HomePage'
import Dashboard from './pages/Dashboard'
import Report from './pages/Report'
import ModulePage from './pages/ModulePage'
import ModuleB from './pages/ModuleB'
import SignalCalibrator from './pages/SignalCalibrator'
import TimeLapseRoom from './pages/TimeLapseRoom'
import CircuitWeaver from './pages/CircuitWeaver'
import CascadePipeline from './pages/CascadePipeline'
import Dispatcher from './pages/Dispatcher'
import ObjectAlchemist from './pages/ObjectAlchemist'
import TrustWager from './pages/TrustWager'
import FogOfWar from './pages/FogOfWar'
import ConfidenceCalibrator from './pages/ConfidenceCalibrator'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return children
}

function App() {
  return (
    <TelemetryProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
          <Route path="/module/signal-calibrator" element={<ProtectedRoute><SignalCalibrator /></ProtectedRoute>} />
          <Route path="/module/time-lapse-room" element={<ProtectedRoute><TimeLapseRoom /></ProtectedRoute>} />
          <Route path="/module/circuit-weaver" element={<ProtectedRoute><CircuitWeaver /></ProtectedRoute>} />
          <Route path="/module/cascade-pipeline" element={<ProtectedRoute><CascadePipeline /></ProtectedRoute>} />
          <Route path="/module/dispatcher" element={<ProtectedRoute><Dispatcher /></ProtectedRoute>} />
          <Route path="/module/tone-mixer" element={<ProtectedRoute><ModuleB /></ProtectedRoute>} />
          <Route path="/module/object-alchemist" element={<ProtectedRoute><ObjectAlchemist /></ProtectedRoute>} />
          <Route path="/module/trust-wager" element={<ProtectedRoute><TrustWager /></ProtectedRoute>} />
          <Route path="/module/fog-of-war" element={<ProtectedRoute><FogOfWar /></ProtectedRoute>} />
          <Route path="/module/confidence-calibrator" element={<ProtectedRoute><ConfidenceCalibrator /></ProtectedRoute>} />
          <Route path="/module/:moduleKey" element={<ProtectedRoute><ModulePage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </TelemetryProvider>
  )
}

export default App
