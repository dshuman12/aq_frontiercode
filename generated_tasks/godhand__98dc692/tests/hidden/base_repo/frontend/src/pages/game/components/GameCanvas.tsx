import { useEffect, useRef } from 'react'

type GameCanvasProps = {
  selectedBuildId: string | null
}

type BuildColor = {
  fill: string
  stroke: string
}

const buildColors: Record<string, BuildColor> = {
  generator: { fill: '#ffd27d', stroke: '#c99b45' },
  battery: { fill: '#f2a3c7', stroke: '#b7668b' },
  conveyor: { fill: '#9fc4ff', stroke: '#5c85c7' },
  splitter: { fill: '#c8d6ff', stroke: '#7c8fbf' },
  miner: { fill: '#b5e3a2', stroke: '#6aa65a' },
  drill: { fill: '#e6c799', stroke: '#b48a5c' },
}

export default function GameCanvas({ selectedBuildId }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const draggingRef = useRef(false)
  const movedRef = useRef(false)
  const lastRef = useRef({ x: 0, y: 0 })
  const offsetRef = useRef({ x: 0, y: 0 })
  const scaleRef = useRef(1)
  const rafRef = useRef<number | null>(null)
  const placedRef = useRef<Map<string, string>>(new Map())
  const playerRef = useRef({ x: 120, y: 120 })
  const keysRef = useRef<Record<string, boolean>>({})
  const lastTimeRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = (time: number) => {
      const rect = canvas.getBoundingClientRect()
      const width = rect.width
      const height = rect.height
      const baseCellSize = 24
      const scale = scaleRef.current
      const cellSize = baseCellSize * scale
      const offset = offsetRef.current
      const lastTime = lastTimeRef.current ?? time
      const delta = Math.min(0.05, (time - lastTime) / 1000)
      lastTimeRef.current = time

      const speed = 180
      const keys = keysRef.current
      let moveX = 0
      let moveY = 0
      if (keys.w || keys.arrowup) moveY -= 1
      if (keys.s || keys.arrowdown) moveY += 1
      if (keys.a || keys.arrowleft) moveX -= 1
      if (keys.d || keys.arrowright) moveX += 1
      if (moveX !== 0 || moveY !== 0) {
        const length = Math.hypot(moveX, moveY) || 1
        const normX = moveX / length
        const normY = moveY / length
        playerRef.current = {
          x: playerRef.current.x + normX * speed * delta,
          y: playerRef.current.y + normY * speed * delta,
        }
      }

      ctx.clearRect(0, 0, width, height)
      ctx.strokeStyle = '#ddd'
      ctx.lineWidth = 1

      const startX = Math.floor(-offset.x / cellSize) * cellSize + offset.x
      const startY = Math.floor(-offset.y / cellSize) * cellSize + offset.y

      for (let x = startX; x < width; x += cellSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }

      for (let y = startY; y < height; y += cellSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      placedRef.current.forEach((buildId, key) => {
        const color = buildColors[buildId]
        if (!color) return
        const [gridX, gridY] = key.split(',').map(Number)
        const worldX = gridX * baseCellSize
        const worldY = gridY * baseCellSize
        const screenX = worldX * scale + offset.x
        const screenY = worldY * scale + offset.y
        ctx.fillStyle = color.fill
        ctx.strokeStyle = color.stroke
        ctx.lineWidth = 2
        ctx.fillRect(screenX, screenY, cellSize, cellSize)
        ctx.strokeRect(screenX, screenY, cellSize, cellSize)
      })

      const player = playerRef.current
      const playerSize = baseCellSize * 0.6 * scale
      const playerX = player.x * scale + offset.x - playerSize / 2
      const playerY = player.y * scale + offset.y - playerSize / 2
      ctx.fillStyle = '#444'
      ctx.strokeStyle = '#111'
      ctx.lineWidth = 2
      ctx.fillRect(playerX, playerY, playerSize, playerSize)
      ctx.strokeRect(playerX, playerY, playerSize, playerSize)

      rafRef.current = requestAnimationFrame(draw)
    }

    resize()
    rafRef.current = requestAnimationFrame(draw)
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      keysRef.current[event.key.toLowerCase()] = true
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      keysRef.current[event.key.toLowerCase()] = false
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      onMouseDown={(event) => {
        draggingRef.current = true
        movedRef.current = false
        lastRef.current = { x: event.clientX, y: event.clientY }
      }}
      onMouseMove={(event) => {
        if (!draggingRef.current) return
        const last = lastRef.current
        const dx = event.clientX - last.x
        const dy = event.clientY - last.y
        if (Math.abs(dx) + Math.abs(dy) > 2) movedRef.current = true
        lastRef.current = { x: event.clientX, y: event.clientY }
        offsetRef.current = {
          x: offsetRef.current.x + dx,
          y: offsetRef.current.y + dy,
        }
      }}
      onMouseUp={() => {
        draggingRef.current = false
      }}
      onMouseLeave={() => {
        draggingRef.current = false
      }}
      onClick={(event) => {
        if (movedRef.current) return
        if (!selectedBuildId) return
        const rect = event.currentTarget.getBoundingClientRect()
        const mouseX = event.clientX - rect.left
        const mouseY = event.clientY - rect.top
        const scale = scaleRef.current
        const baseCellSize = 24
        const worldX = (mouseX - offsetRef.current.x) / scale
        const worldY = (mouseY - offsetRef.current.y) / scale
        const gridX = Math.floor(worldX / baseCellSize)
        const gridY = Math.floor(worldY / baseCellSize)
        placedRef.current.set(`${gridX},${gridY}`, selectedBuildId)
      }}
      onWheel={(event) => {
        event.preventDefault()
        const rect = event.currentTarget.getBoundingClientRect()
        const mouseX = event.clientX - rect.left
        const mouseY = event.clientY - rect.top
        const offset = offsetRef.current
        const oldScale = scaleRef.current
        const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9
        const nextScale = Math.min(3, Math.max(0.5, oldScale * zoomFactor))
        const scaleChange = nextScale / oldScale
        offsetRef.current = {
          x: mouseX - (mouseX - offset.x) * scaleChange,
          y: mouseY - (mouseY - offset.y) * scaleChange,
        }
        scaleRef.current = nextScale
      }}
      onContextMenu={(event) => {
        event.preventDefault()
      }}
    />
  )
}
