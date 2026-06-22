/// <reference lib="webworker" />

import { simulateStep } from '../../../game/engine'
import type {
  SimulationWorkerStepMessage,
  SimulationWorkerStepResultMessage,
} from './simulationWorkerTypes'

self.onmessage = (event: MessageEvent<SimulationWorkerStepMessage>) => {
  const message = event.data
  if (message.type !== 'step') return

  const result = simulateStep({
    dtSec: message.dtSec,
    accessibleValleyTier: message.accessibleValleyTier,
    state: message.state,
    processingMachines: message.processingMachines,
    placedStructures: message.placedStructures,
  })

  const response: SimulationWorkerStepResultMessage = {
    type: 'step_result',
    requestId: message.requestId,
    inputVersion: message.inputVersion,
    result,
  }
  self.postMessage(response)
}
