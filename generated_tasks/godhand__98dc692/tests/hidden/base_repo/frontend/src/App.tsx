import { Routes, Route } from 'react-router-dom'
import './App.css'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import VerifySuccessPage from './pages/auth/VerifySuccessPage'
import VerifyFailurePage from './pages/auth/VerifyFailurePage'
import LobbyScreen from './pages/lobby/LobbyScreen'
import GameScreen from './pages/game/GameScreen'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify/success" element={<VerifySuccessPage />} />
      <Route path="/verify/failure" element={<VerifyFailurePage />} />
      <Route path="/lobby" element={<LobbyScreen />} />
      <Route path="/game" element={<GameScreen />} />
    </Routes>
  )
}

export default App
