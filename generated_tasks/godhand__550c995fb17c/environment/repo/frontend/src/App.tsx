import { Routes, Route } from 'react-router-dom'
import './App.css'
import ProfileQuickMenu from './components/ProfileQuickMenu'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import LobbyScreen from './pages/lobby/LobbyScreen'
import ProfilePage from './pages/profile/ProfilePage'
import GameScreen from './pages/game/GameScreen'
import TitleScreen from './pages/title/TitleScreen'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<TitleScreen />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/lobby" element={<LobbyScreen />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/game" element={<GameScreen />} />
      </Routes>
      <ProfileQuickMenu />
    </>
  )
}

export default App
