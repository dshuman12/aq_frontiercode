type ProducerPulseParams = {
  active: boolean
  cellSize: number
  visualTimeSec: number
  seedX: number
  seedY: number
  amplitude: number
  speed: number
  minCellSize?: number
}

export function computeProducerPulseScale(params: ProducerPulseParams): number {
  const minCellSize = params.minCellSize ?? 9
  if (!params.active || params.cellSize < minCellSize) return 1
  return (
    1 +
    params.amplitude *
      Math.sin(params.visualTimeSec * params.speed + params.seedX * 0.47 + params.seedY * 0.31)
  )
}
