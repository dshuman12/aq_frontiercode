import {
  CRAFT_RECIPES,
  getBeltAt,
  getHubAt,
  getMinerAt,
  getOreDepositAt,
  getTerrainValleyAt,
  isLandCell,
  type GameState,
  type ProcessingMachineState,
  type ProcessingStatus,
} from '../../../../game/engine'
import { isProcessingBuildId } from '../../../../game/engine/buildingCatalog'
import { ORE_VISUALS } from '../../oreCatalog'
import type { BuildId } from '../../buildCatalog'
import { toCellKey, type Point } from '../canvasMath'
import type { PlacedStructure } from '../canvasPlacement'
import { getInputLaneCounts } from '../machineLayout'
import type { HoverInspector } from '../hoverInspectorStore'

type BuildHoverInspectorParams = {
  state: GameState
  hovered: Point | null
  isCameraNavigating: boolean
  beltItemCounts: Map<string, number>
  occupiedStructureCells: Map<string, string>
  placedStructures: Map<string, PlacedStructure>
  processingMachines: Map<string, ProcessingMachineState>
  accessibleBridgeTier: number
  buildLabel: (buildId: BuildId) => string
  machineStatusLabel: (status: ProcessingStatus) => string
}

const GENERATOR_POWER_BY_RESOURCE: Record<string, number> = {
  battery_t1: 70,
  battery_t2: 110,
  battery_t3: 180,
  battery_t4: 260,
}

export function buildHoverInspectorSnapshot(params: BuildHoverInspectorParams): HoverInspector | null {
  const {
    state,
    hovered,
    isCameraNavigating,
    beltItemCounts,
    occupiedStructureCells,
    placedStructures,
    processingMachines,
    accessibleBridgeTier,
    buildLabel,
    machineStatusLabel,
  } = params
  if (!hovered || isCameraNavigating) return null

  const key = toCellKey(hovered.x, hovered.y)
  const terrainValley = getTerrainValleyAt(state, hovered.x, hovered.y)
  const visibleBridgeTier = Math.max(1, Math.floor(accessibleBridgeTier))
  if (terrainValley !== undefined && terrainValley > visibleBridgeTier) {
    return {
      title: `Tier ${terrainValley} Island`,
      lines: [
        `cell ${hovered.x}, ${hovered.y}`,
        `requires bridge tier ${terrainValley} route`,
        'resource signatures hidden',
      ],
    }
  }

  const hoverLines = [`cell ${hovered.x}, ${hovered.y}`]
  let hoverTitle = isLandCell(state, hovered.x, hovered.y) ? 'Land Tile' : 'Void'
  let hoverMeter: HoverInspector['meter'] | undefined

  const hub = getHubAt(state, hovered.x, hovered.y)
  if (hub) {
    hoverTitle = 'Hub'
    hoverLines.push('accepts ore from incoming belts')
  }

  const deposit = getOreDepositAt(state, hovered.x, hovered.y)
  if (deposit) {
    if (!hub) hoverTitle = `${ORE_VISUALS[deposit.ore].label} Deposit`
    hoverLines.push(`ore ${ORE_VISUALS[deposit.ore].label.toLowerCase()}`)
    hoverLines.push(`richness ${Math.max(0, deposit.richness)}`)
  }

  const miner = getMinerAt(state, hovered.x, hovered.y)
  if (miner) {
    hoverTitle = miner.kind === 'drill' ? 'Drill' : 'Miner'
    hoverLines.push(`output direction ${miner.outputDir}`)
    hoverLines.push(`cycle ${miner.cycleSec.toFixed(2)}s`)
    if (deposit) hoverLines.push(`remaining ore ${Math.max(0, deposit.richness)}`)
  }

  const belt = getBeltAt(state, hovered.x, hovered.y)
  if (belt) {
    hoverTitle = 'Conveyor'
    hoverLines.push(`direction ${belt.dir}`)
    const beltLoad = beltItemCounts.get(belt.id) ?? 0
    hoverLines.push(`items on belt ${beltLoad}`)
  }

  const bridgeTier = state.bridges[key]
  if (bridgeTier !== undefined) {
    hoverTitle = `Bridge Tier ${bridgeTier}`
    hoverLines.push('crosses void between islands')
  }

  const structureAnchorKey = occupiedStructureCells.get(key)
  if (structureAnchorKey) {
    const structure = placedStructures.get(structureAnchorKey)
    if (structure) {
      hoverTitle = buildLabel(structure.buildId)
      hoverLines.push(
        `footprint ${structure.footprint.width}x${structure.footprint.height} facing ${structure.direction}`,
      )

      if (isProcessingBuildId(structure.buildId)) {
        const machine = processingMachines.get(structureAnchorKey)
        if (machine) {
          const activeRecipe = machine.recipeId ? CRAFT_RECIPES[machine.recipeId] : null
          const selectedRecipe = machine.selectedRecipeId ? CRAFT_RECIPES[machine.selectedRecipeId] : null
          hoverLines.push(`mode ${machine.selectedRecipeId ? 'manual' : 'auto'}`)
          if (selectedRecipe && selectedRecipe.id !== activeRecipe?.id) {
            hoverLines.push(`target ${selectedRecipe.label}`)
          }
          if (activeRecipe) {
            const laneCounts = getInputLaneCounts(activeRecipe)
            hoverLines.push(`crafting ${activeRecipe.label}`)
            hoverLines.push(`status ${machineStatusLabel(machine.status)}`)
            hoverLines.push(`cycle ${machine.cycleSec.toFixed(2)}s`)
            if (machine.status === 'crafting' && machine.cycleSec > 0) {
              const progressRatio = Math.min(
                1,
                Math.max(0, (machine.cycleSec - Math.max(0, machine.cooldownSec)) / machine.cycleSec),
              )
              hoverMeter = {
                label: 'craft progress',
                value: progressRatio * 100,
                max: 100,
                displayText: `${Math.round(progressRatio * 100)}%`,
              }
            }
            hoverLines.push(
              `inputs ${Object.entries(laneCounts)
                .map(([resource, lanes]) => `${resource} x${lanes}`)
                .join(', ')}`,
            )
            hoverLines.push(
              `output ${activeRecipe.output.material} x${Math.max(1, Math.ceil(activeRecipe.output.amount))}`,
            )
          } else {
            hoverLines.push('processing machine ready')
          }
          const buffered = Object.entries(machine.inputBuffer)
            .filter(([, amount]) => (amount ?? 0) > 0)
            .map(([resource, amount]) => `${resource} ${(amount ?? 0).toFixed(1)}`)
          if (buffered.length > 0) {
            hoverLines.push(`buffer ${buffered.join(', ')}`)
          }
        } else {
          hoverLines.push('processing machine ready')
        }
      } else if (structure.buildId === 'generator') {
        const machine = processingMachines.get(structureAnchorKey)
        if (!machine) {
          hoverLines.push('status waiting for batteries')
        } else {
          hoverLines.push(`status ${machineStatusLabel(machine.status)}`)
          const batteryResource = machine.generatorFuelResource ?? null
          const powerOut = batteryResource ? (GENERATOR_POWER_BY_RESOURCE[batteryResource] ?? 0) : 0
          hoverLines.push(`fuel ${batteryResource ?? 'none'}`)
          hoverLines.push(`power output ${powerOut}`)
          if ((machine.generatorFuelSecRemaining ?? 0) > 0) {
            hoverMeter = {
              label: 'battery remaining',
              value: Math.max(0, machine.generatorFuelSecRemaining ?? 0),
              max: Math.max(1, machine.cycleSec || 60),
            }
          }
        }
      }
    }
  }

  return {
    title: hoverTitle,
    lines: hoverLines,
    meter: hoverMeter,
  }
}
