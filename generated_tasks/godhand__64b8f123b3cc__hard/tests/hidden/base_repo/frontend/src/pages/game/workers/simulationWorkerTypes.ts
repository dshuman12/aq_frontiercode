import type {
  ProcessingMachineState,
  ProcessingStructureState,
  SimulationDynamicState,
  SimulationStepResult,
} from '../../../game/engine'

export type SimulationWorkerStepMessage = {
  type: 'step'
  requestId: number
  inputVersion: number
  dtSec: number
  accessibleValleyTier: number
  state: SimulationDynamicState
  processingMachines: Record<string, ProcessingMachineState>
  placedStructures: ProcessingStructureState[]
}

export type SimulationWorkerStepResultMessage = {
  type: 'step_result'
  requestId: number
  inputVersion: number
  result: SimulationStepResult
}
