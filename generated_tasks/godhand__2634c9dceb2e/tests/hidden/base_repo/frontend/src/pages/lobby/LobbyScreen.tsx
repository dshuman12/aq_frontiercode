import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LobbyScreen() {
  const navigate = useNavigate()
  const [selectedLobbyId, setSelectedLobbyId] = useState<string | null>(null)
  const lobbies = [
    { id: 'test-lobby-1', name: 'Test Lobby', players: 1, maxPlayers: 8 },
    { id: 'test-lobby-2', name: 'Ore Belt Rush', players: 3, maxPlayers: 8 },
    { id: 'test-lobby-3', name: 'Copper Coast', players: 6, maxPlayers: 8 },
    { id: 'test-lobby-4', name: 'Iron Plains', players: 2, maxPlayers: 8 },
  ]

  return (
    <div className="lobby-screen">
      <div className="lobby-panel">
        <div className="lobby-header">
          <div>Lobby Browser</div>
          <button onClick={() => navigate('/')}>Back</button>
        </div>
        <div className="lobby-content">
          <div className="lobby-list">
            {lobbies.map((lobby, index) => (
              <button
                key={lobby.id}
                type="button"
                className={`lobby-row ${index % 2 === 0 ? 'lobby-row-alt' : ''} ${
                  selectedLobbyId === lobby.id ? 'lobby-row-selected' : ''
                }`}
                onClick={() => setSelectedLobbyId(lobby.id)}
              >
                <span className="lobby-name">{lobby.name}</span>
                <span className="lobby-players">
                  {lobby.players}/{lobby.maxPlayers}
                </span>
              </button>
            ))}
          </div>
          <div className="lobby-actions">
            <button
              onClick={() => {
                if (selectedLobbyId) navigate('/game')
              }}
            >
              Join Selected Lobby
            </button>
            <button>Refresh</button>
            <button>Create Lobby</button>
          </div>
        </div>
      </div>
    </div>
  )
}
