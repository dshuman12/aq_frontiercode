import { useNavigate } from 'react-router-dom'

export default function TitleScreen() {
  const navigate = useNavigate()

  return (
    <div className="title-screen">
      <div className="title-text">PROJECT GODHAND</div>
      <button onClick={() => navigate('/lobby')}>Enter</button>
    </div>
  )
}
