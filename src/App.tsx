import { Routes, Route } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { DashboardLayout } from './components/DashboardLayout'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard/:username" element={<DashboardLayout />} />
    </Routes>
  )
}

export default App
