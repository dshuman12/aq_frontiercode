import { CRAFT_RECIPES, type Direction, type ProcessingMachineState } from '../../../../game/engine'
import {
  isBeltBuildId,
  isBridgeBuildId,
  isDepotInputBuildId,
  isDepotOutputBuildId,
  isMinerBuildId,
} from '../../../../game/engine/buildingCatalog'
import { BUILD_COLORS, type BuildId } from '../../buildCatalog'
import {
  pickBuildingSpriteByBuildId,
  type BuildingSpriteBitmaps,
} from '../../theme/buildingSprites'
import { type PlacedStructure } from '../canvasPlacement'
import { BASE_CELL_SIZE, gridToWorld, worldToScreen, type Camera } from '../canvasMath'
import { computeProducerPulseScale } from '../simulation/producerPulse'
import { isProcessingBuildId } from '../machineLayout'
import { drawDirectedSprite, drawTiledDirectedSpriteAlongLocalY } from './spriteUtils'
import { DX, DY } from '../canvasDirections'
import { getStructureIoPorts } from './structureIoPorts'

type CanvasPaletteLike = {
  machinePortInput: string
  machinePortOutput: string
  machineTokenBg: string
}

export type StructureRenderStats = {
  drawCallsEstimateDelta: number
  visibleStructuresDelta: number
  detailedProcessingStructureEffects: number
}

type RenderStructuresParams = {
  ctx: CanvasRenderingContext2D
  camera: Camera
  cellSize: number
  lowDetail: boolean
  veryLowDetail: boolean
  visualTimeSec: number
  inViewRect: (x: number, y: number, widthCells: number, heightCells: number) => boolean
  structures: Map<string, PlacedStructure>
  processingMachines: Map<string, ProcessingMachineState>
  buildingSprites: BuildingSpriteBitmaps | null
  canvasPalette: CanvasPaletteLike
  detailedProcessingStructureEffects: number
  maxDetailedProcessingStructures: number
  producerPulseAmplitude: number
  producerPulseSpeed: number
  isProducerActive: (
    structure: PlacedStructure,
    key: string,
    machine: ProcessingMachineState | undefined,
  ) => boolean
}

function drawDirectionArrow(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  dir: Direction,
  size: number,
): void {
  const dx = DX[dir]
  const dy = DY[dir]
  const tipX = centerX + dx * size
  const tipY = centerY + dy * size
  const leftX = centerX - dx * size * 0.4 + dy * size * 0.5
  const leftY = centerY - dy * size * 0.4 - dx * size * 0.5
  const rightX = centerX - dx * size * 0.4 - dy * size * 0.5
  const rightY = centerY - dy * size * 0.4 + dx * size * 0.5

  ctx.beginPath()
  ctx.moveTo(tipX, tipY)
  ctx.lineTo(leftX, leftY)
  ctx.lineTo(rightX, rightY)
  ctx.closePath()
  ctx.fill()
}

function drawIoPortArrow(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  direction: Direction,
  size: number,
): void {
  ctx.save()
  ctx.strokeStyle = 'rgba(16, 28, 22, 0.9)'
  ctx.lineWidth = Math.max(1.4, size * 0.16)
  ctx.lineCap = 'round'
  const dx = DX[direction]
  const dy = DY[direction]
  const stem = size * 0.88
  ctx.beginPath()
  ctx.moveTo(centerX - dx * stem * 0.42, centerY - dy * stem * 0.42)
  ctx.lineTo(centerX + dx * stem * 0.1, centerY + dy * stem * 0.1)
  ctx.stroke()
  drawDirectionArrow(ctx, centerX, centerY, direction, size)
  ctx.restore()
}

function oppositeDirection(direction: Direction): Direction {
  if (direction === 'up') return 'down'
  if (direction === 'down') return 'up'
  if (direction === 'left') return 'right'
  return 'left'
}

export function renderStructuresLayer(params: RenderStructuresParams): StructureRenderStats {
  const {
    ctx,
    camera,
    cellSize,
    lowDetail,
    veryLowDetail,
    visualTimeSec,
    inViewRect,
    structures,
    processingMachines,
    buildingSprites,
    canvasPalette,
    maxDetailedProcessingStructures,
    producerPulseAmplitude,
    producerPulseSpeed,
    isProducerActive,
  } = params
  let drawCallsEstimateDelta = 0
  let visibleStructuresDelta = 0
  let detailedProcessingStructureEffects = params.detailedProcessingStructureEffects

  for (const [key, structure] of structures.entries()) {
    const buildId: BuildId = structure.buildId
    if (isBeltBuildId(buildId) || isMinerBuildId(buildId) || isBridgeBuildId(buildId)) continue
    if (!inViewRect(structure.anchor.x, structure.anchor.y, structure.footprint.width, structure.footprint.height)) {
      continue
    }

    const color = BUILD_COLORS[buildId]
    const screen = worldToScreen(gridToWorld(structure.anchor), camera)
    const drawWidth = cellSize * structure.footprint.width
    const drawHeight = cellSize * structure.footprint.height
    const machine = processingMachines.get(key)
    const pulseScale = computeProducerPulseScale({
      active: isProducerActive(structure, key, machine),
      cellSize,
      visualTimeSec,
      seedX: structure.anchor.x,
      seedY: structure.anchor.y,
      amplitude: producerPulseAmplitude,
      speed: producerPulseSpeed,
    })
    const pulsedDrawWidth = drawWidth * pulseScale
    const pulsedDrawHeight = drawHeight * pulseScale
    const pulsedDrawX = screen.x + (drawWidth - pulsedDrawWidth) * 0.5
    const pulsedDrawY = screen.y + (drawHeight - pulsedDrawHeight) * 0.5

    const buildingSprite = pickBuildingSpriteByBuildId(buildingSprites, buildId)
    if (buildingSprite) {
      ctx.imageSmoothingEnabled = false
      if (buildId === 'smelter') {
        const majorCells = Math.max(structure.footprint.width, structure.footprint.height)
        const minorCells = Math.min(structure.footprint.width, structure.footprint.height)
        drawTiledDirectedSpriteAlongLocalY(
          ctx,
          buildingSprite,
          pulsedDrawX,
          pulsedDrawY,
          pulsedDrawWidth,
          pulsedDrawHeight,
          structure.direction,
          cellSize * minorCells * pulseScale,
          cellSize * pulseScale,
          majorCells,
        )
        drawCallsEstimateDelta += majorCells
      } else {
        drawDirectedSprite(
          ctx,
          buildingSprite,
          pulsedDrawX,
          pulsedDrawY,
          pulsedDrawWidth,
          pulsedDrawHeight,
          structure.direction,
        )
        drawCallsEstimateDelta += 1
      }
      ctx.imageSmoothingEnabled = true
    } else {
      ctx.fillStyle = color.fill
      ctx.strokeStyle = color.stroke
      ctx.lineWidth = 2
      ctx.fillRect(pulsedDrawX, pulsedDrawY, pulsedDrawWidth, pulsedDrawHeight)
      drawCallsEstimateDelta += 1
      if (!veryLowDetail) {
        ctx.strokeRect(pulsedDrawX, pulsedDrawY, pulsedDrawWidth, pulsedDrawHeight)
        drawCallsEstimateDelta += 1
      }
    }
    visibleStructuresDelta += 1
    if (lowDetail) continue
    const hasIoPorts =
      isProcessingBuildId(buildId) || isDepotInputBuildId(buildId) || isDepotOutputBuildId(buildId)
    if (!hasIoPorts) continue

    const allowDetailedProcessing = detailedProcessingStructureEffects < maxDetailedProcessingStructures
    const recipeIdForLayout = machine?.selectedRecipeId ?? machine?.recipeId ?? null
    const recipe = recipeIdForLayout ? CRAFT_RECIPES[recipeIdForLayout] : null
    if (!allowDetailedProcessing) continue

    const ports = getStructureIoPorts(
      structure.anchor,
      structure.footprint,
      buildId,
      structure.direction,
      recipe,
    )
    for (const port of ports) {
      const portScreen = worldToScreen(
        {
          x: port.edgeX * BASE_CELL_SIZE,
          y: port.edgeY * BASE_CELL_SIZE,
        },
        camera,
      )
      ctx.fillStyle = port.kind === 'input' ? canvasPalette.machinePortInput : canvasPalette.machinePortOutput
      const portArrowDirection = port.kind === 'input' ? oppositeDirection(port.side) : port.side
      drawIoPortArrow(ctx, portScreen.x, portScreen.y, portArrowDirection, Math.max(3.8, cellSize * 0.2))
      drawCallsEstimateDelta += 1
    }

    if (isProcessingBuildId(buildId)) {
      ctx.fillStyle = color.stroke
      drawDirectionArrow(
        ctx,
        screen.x + drawWidth / 2,
        screen.y + drawHeight / 2,
        structure.direction,
        Math.min(drawWidth, drawHeight) * 0.24,
      )
    }

    if (isProcessingBuildId(buildId)) {
      const token = recipe ? recipe.output.material.slice(0, 2).toUpperCase() : '--'
      ctx.fillStyle = canvasPalette.machineTokenBg
      ctx.fillRect(
        screen.x + drawWidth - cellSize * 0.92,
        screen.y + drawHeight - cellSize * 0.68,
        cellSize * 0.82,
        cellSize * 0.48,
      )
      ctx.fillStyle = '#e9f6ed'
      ctx.font = `${Math.max(9, cellSize * 0.16)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(token, screen.x + drawWidth - cellSize * 0.5, screen.y + drawHeight - cellSize * 0.44)
      drawCallsEstimateDelta += 3
    }
    detailedProcessingStructureEffects += 1
  }

  return {
    drawCallsEstimateDelta,
    visibleStructuresDelta,
    detailedProcessingStructureEffects,
  }
}
