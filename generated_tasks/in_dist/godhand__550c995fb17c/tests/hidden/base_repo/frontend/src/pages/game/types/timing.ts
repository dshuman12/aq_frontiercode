import type { CraftRecipeId, ProcessingStatus } from '../../../game/engine'
import type { BuildId } from '../buildCatalog'

export type MachineTimingInput = {
  resource: string
  amountPerCycle: number
  requiredPerSecond: number
  lanes: number
  lanesForOptimal: number
}

export type MachineTimingMetric = {
  id: string
  buildId: BuildId
  recipeId: CraftRecipeId | null
  status: ProcessingStatus
  cycleSec: number
  outputResource: string | null
  outputPerSecond: number
  outputLanes: number
  utilization: number
  inputLanes: number
  inputs: MachineTimingInput[]
}

export type TimingSnapshot = {
  timestampSec: number
  beltCellsPerSecond: number
  belts: number
  itemsInTransit: number
  power: {
    generated: number
    allocated: number
    demandInCoverage: number
    demandTotal: number
    surplus: number
    deficit: number
  }
  machines: MachineTimingMetric[]
  performance: {
    fps: number
    frameMs: number
    updateMs: number
    drawMs: number
    terrainTilesTotal: number
    terrainTilesVisible: number
    bridgesVisible: number
    depositsVisible: number
    beltsVisible: number
    minersVisible: number
    itemsVisible: number
    structuresVisible: number
    drawCallsEstimate: number
    terrainRasterReady: boolean
    terrainRasterChunks: number
    cameraOptimizationActive: boolean
  }
}
