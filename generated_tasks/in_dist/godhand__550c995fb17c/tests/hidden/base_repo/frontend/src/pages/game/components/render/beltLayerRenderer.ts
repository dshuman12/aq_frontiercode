import type { GameState } from '../../../../game/engine'
import { BUILD_COLORS } from '../../buildCatalog'
import {
  pickBuildingSpriteByBuildId,
  pickConveyorSprite,
  type BuildingSpriteBitmaps,
} from '../../theme/buildingSprites'
import { gridToWorld, worldToScreen, type Camera } from '../canvasMath'
import {
  drawBeltDirectionGlyph,
  drawBeltFlowStrips,
  drawSplitterDirectionGlyph,
  getBeltFlowPhase,
} from './beltDrawingPrimitives'
import { drawDirectedSprite } from './spriteUtils'

export type BeltRenderStats = {
  drawCallsEstimateDelta: number
  visibleBeltsDelta: number
  detailedBeltEffects: number
}

type RenderBeltsParams = {
  ctx: CanvasRenderingContext2D
  state: GameState
  camera: Camera
  cellSize: number
  lowDetail: boolean
  veryLowDetail: boolean
  visualTimeSec: number
  pausedBeltIds: Set<string>
  buildingSprites: BuildingSpriteBitmaps | null
  inView: (x: number, y: number) => boolean
  beltFlowRgb: string
  beltFlowVisualCellsPerSecond: number
  detailedBeltEffects: number
  maxDetailedBelts: number
}

export function renderBeltsLayer(params: RenderBeltsParams): BeltRenderStats {
  const {
    ctx,
    state,
    camera,
    cellSize,
    lowDetail,
    veryLowDetail,
    visualTimeSec,
    pausedBeltIds,
    buildingSprites,
    inView,
    beltFlowRgb,
    beltFlowVisualCellsPerSecond,
    maxDetailedBelts,
  } = params
  let detailedBeltEffects = params.detailedBeltEffects
  let drawCallsEstimateDelta = 0
  let visibleBeltsDelta = 0

  for (const belt of state.belts) {
    if (!inView(belt.x, belt.y)) continue
    const screen = worldToScreen(gridToWorld({ x: belt.x, y: belt.y }), camera)
    const beltPaused = pausedBeltIds.has(belt.id)
    const flowPhase = beltPaused
      ? 0
      : getBeltFlowPhase(visualTimeSec, belt.x, belt.y, belt.dir, beltFlowVisualCellsPerSecond)
    const conveyorSprite =
      belt.buildId === 'splitter'
        ? pickBuildingSpriteByBuildId(buildingSprites, 'splitter') ?? pickConveyorSprite(buildingSprites)
        : pickConveyorSprite(buildingSprites)
    const color = BUILD_COLORS.conveyor
    const allowDetailedBelt = !lowDetail && detailedBeltEffects < maxDetailedBelts

    if (conveyorSprite) {
      ctx.imageSmoothingEnabled = false
      drawDirectedSprite(ctx, conveyorSprite, screen.x, screen.y, cellSize, cellSize, belt.dir)
      ctx.imageSmoothingEnabled = true
      drawCallsEstimateDelta += 1
      if (!veryLowDetail) {
        if (!beltPaused && (lowDetail || allowDetailedBelt)) {
          drawBeltFlowStrips(
            ctx,
            screen.x + cellSize * 0.5,
            screen.y + cellSize * 0.5,
            belt.dir,
            cellSize,
            flowPhase,
            beltFlowRgb,
          )
          if (allowDetailedBelt) {
            detailedBeltEffects += 1
          }
        }
        drawBeltDirectionGlyph(
          ctx,
          screen.x + cellSize * 0.5,
          screen.y + cellSize * 0.5,
          belt.dir,
          Math.max(2.8, cellSize * 0.2),
        )
        if (belt.buildId === 'splitter') {
          drawSplitterDirectionGlyph(
            ctx,
            screen.x + cellSize * 0.5,
            screen.y + cellSize * 0.5,
            belt.dir,
            Math.max(2.4, cellSize * 0.17),
          )
          drawCallsEstimateDelta += 2
        }
        drawCallsEstimateDelta += lowDetail || allowDetailedBelt ? 5 : 3
      }
      visibleBeltsDelta += 1
      continue
    }

    ctx.fillStyle = color.fill
    ctx.strokeStyle = color.stroke
    if (veryLowDetail) {
      ctx.fillRect(screen.x, screen.y, cellSize, cellSize)
      drawCallsEstimateDelta += 1
    } else if (lowDetail) {
      ctx.lineWidth = 1.5
      ctx.fillRect(screen.x, screen.y, cellSize, cellSize)
      ctx.strokeRect(screen.x, screen.y, cellSize, cellSize)
      drawBeltDirectionGlyph(
        ctx,
        screen.x + cellSize * 0.5,
        screen.y + cellSize * 0.5,
        belt.dir,
        Math.max(2.5, cellSize * 0.2),
      )
      drawCallsEstimateDelta += 4
    } else if (allowDetailedBelt) {
      ctx.lineWidth = 2
      ctx.fillRect(screen.x, screen.y, cellSize, cellSize)
      ctx.strokeRect(screen.x, screen.y, cellSize, cellSize)
      if (!beltPaused) {
        drawBeltFlowStrips(
          ctx,
          screen.x + cellSize * 0.5,
          screen.y + cellSize * 0.5,
          belt.dir,
          cellSize,
          flowPhase,
          beltFlowRgb,
        )
      }
      drawBeltDirectionGlyph(
        ctx,
        screen.x + cellSize * 0.5,
        screen.y + cellSize * 0.5,
        belt.dir,
        Math.max(2.8, cellSize * 0.2),
      )
      if (belt.buildId === 'splitter') {
        drawSplitterDirectionGlyph(
          ctx,
          screen.x + cellSize * 0.5,
          screen.y + cellSize * 0.5,
          belt.dir,
          Math.max(2.4, cellSize * 0.17),
        )
        drawCallsEstimateDelta += 2
      }
      drawCallsEstimateDelta += 6
      detailedBeltEffects += 1
    } else {
      ctx.lineWidth = 1.5
      ctx.fillRect(screen.x, screen.y, cellSize, cellSize)
      ctx.strokeRect(screen.x, screen.y, cellSize, cellSize)
      if (!veryLowDetail && belt.buildId === 'splitter') {
        drawSplitterDirectionGlyph(
          ctx,
          screen.x + cellSize * 0.5,
          screen.y + cellSize * 0.5,
          belt.dir,
          Math.max(2.4, cellSize * 0.17),
        )
        drawCallsEstimateDelta += 2
      }
      drawCallsEstimateDelta += 2
    }
    visibleBeltsDelta += 1
  }

  return {
    drawCallsEstimateDelta,
    visibleBeltsDelta,
    detailedBeltEffects,
  }
}
