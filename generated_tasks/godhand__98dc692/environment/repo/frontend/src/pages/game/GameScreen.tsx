import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameCanvas from './components/GameCanvas.tsx'

export default function GameScreen() {
  const navigate = useNavigate()
  const buildColors: Record<string, { fill: string; stroke: string }> = {
    generator: { fill: '#ffd27d', stroke: '#c99b45' },
    battery: { fill: '#f2a3c7', stroke: '#b7668b' },
    conveyor: { fill: '#9fc4ff', stroke: '#5c85c7' },
    splitter: { fill: '#c8d6ff', stroke: '#7c8fbf' },
    miner: { fill: '#b5e3a2', stroke: '#6aa65a' },
    drill: { fill: '#e6c799', stroke: '#b48a5c' },
  }
  const categoryColors: Record<string, { fill: string; stroke: string }> = {
    power: { fill: '#ffe6a6', stroke: '#c99b45' },
    belts: { fill: '#c9ddff', stroke: '#5c85c7' },
    mining: { fill: '#cfeec4', stroke: '#6aa65a' },
  }
  const buildCategories = [
    {
      id: 'power',
      label: 'Power',
      items: [
        { id: 'generator', label: 'Generator' },
        { id: 'battery', label: 'Battery' },
      ],
    },
    {
      id: 'belts',
      label: 'Belts',
      items: [
        { id: 'conveyor', label: 'Conveyor' },
        { id: 'splitter', label: 'Splitter' },
      ],
    },
    {
      id: 'mining',
      label: 'Mining',
      items: [
        { id: 'miner', label: 'Miner' },
        { id: 'drill', label: 'Drill' },
      ],
    },
  ]
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    buildCategories[0]?.id ?? 'power',
  )
  const selectedCategory =
    buildCategories.find((category) => category.id === selectedCategoryId) ??
    buildCategories[0]
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(
    selectedCategory?.items[0]?.id ?? null,
  )

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-section">
          <div>Menu</div>
          <div className="menu-buttons">
            <button onClick={() => navigate('/lobby')}>Back to Lobby</button>
            <button onClick={() => navigate('/')}>Quit to Title</button>
            <button onClick={() => navigate('/lobby')}>Find Lobby</button>
          </div>
        </div>
        <div className="sidebar-section">
          <div>Build</div>
          <div className="build-menu">
            <div className="build-categories">
              {buildCategories.map((category) => (
                <button
                  key={category.id}
                  className={`build-category-button build-category-${category.id} ${
                    selectedCategoryId === category.id ? 'build-active' : ''
                  }`}
                  style={{
                    background: categoryColors[category.id]?.fill,
                    borderColor: categoryColors[category.id]?.stroke,
                  }}
                  onClick={() => {
                    setSelectedCategoryId(category.id)
                    setSelectedBuildId(category.items[0]?.id ?? null)
                  }}
                >
                  {category.label}
                </button>
              ))}
            </div>
            <div className="build-items-panel">
              {selectedCategory?.items.map((item) => (
                <button
                  key={item.id}
                  className={`build-item-button build-item-${item.id} ${
                    selectedBuildId === item.id ? 'build-active' : ''
                  }`}
                  onClick={() => setSelectedBuildId(item.id)}
                  aria-label={item.label}
                  title={item.label}
                  style={{
                    background: buildColors[item.id]?.fill,
                    borderColor: buildColors[item.id]?.stroke,
                  }}
                >
                  <span className="build-item-label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="sidebar-section chat-section">
          <div>Chat</div>
          <div className="chat-log">No messages yet.</div>
          <div className="chat-input">
            <input className="chat-text-input" placeholder="Type a message" />
            <button className="chat-send-button">Send</button>
          </div>
        </div>
      </aside>
      <main className="main">
        <div className="canvas-wrap">
          <GameCanvas selectedBuildId={selectedBuildId} />
        </div>
      </main>
    </div>
  )
}
