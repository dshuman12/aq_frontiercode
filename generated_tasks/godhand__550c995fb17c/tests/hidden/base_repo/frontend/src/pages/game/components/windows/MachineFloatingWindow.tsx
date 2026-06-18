import { memo, type RefObject } from 'react'
import { CRAFT_RECIPES, type CraftRecipeId } from '../../../../game/engine'
import FloatingWindow from '../FloatingWindow'

type SelectedMachineBufferRow = {
  resource: string
  buffered: number
  required: number
}

export type SelectedMachineView = {
  id: string
  buildLabel: string
  statusLabel: string
  mode: 'auto' | 'manual'
  cycleSec: number
  selectedRecipeId: CraftRecipeId | null
  activeRecipeId: CraftRecipeId | null
  availableRecipeIds: CraftRecipeId[]
  bufferRows: SelectedMachineBufferRow[]
}

type MachineFloatingWindowProps = {
  open: boolean
  containerRef: RefObject<HTMLDivElement | null>
  selectedMachine: SelectedMachineView | null
  onClose: () => void
  onSelectRecipe: (recipeId: CraftRecipeId | null) => void
  resourceLabel: (resource: string) => string
}

const MACHINE_INITIAL_RECT = { x: 1014, y: 26, width: 310, height: 330 }

function recipeDisplayLabel(recipeId: string): string {
  const recipe = CRAFT_RECIPES[recipeId]
  if (!recipe) return recipeId
  return `${recipe.label} (${recipe.output.amount} ${recipe.output.material})`
}

function MachineFloatingWindowComponent({
  open,
  containerRef,
  selectedMachine,
  onClose,
  onSelectRecipe,
  resourceLabel,
}: MachineFloatingWindowProps) {
  if (!open || !selectedMachine) return null

  const activeRecipe = selectedMachine.activeRecipeId ? CRAFT_RECIPES[selectedMachine.activeRecipeId] : null

  return (
    <FloatingWindow
      title={`Machine ${selectedMachine.id}`}
      containerRef={containerRef}
      initialRect={MACHINE_INITIAL_RECT}
      initialMinimized
      minWidth={280}
      minHeight={220}
      className="machine-floating-window"
      onClose={onClose}
      minimizedContent={
        <div className="machine-minimized-summary">
          {selectedMachine.buildLabel} · {selectedMachine.mode}
        </div>
      }
    >
      <div className="window-section-head machine-window-section-head">
        <h3 className="window-section-title">Machine Status</h3>
        <span className="window-section-meta">{selectedMachine.mode}</span>
      </div>
      <div className="machine-window-header-row">
        <span>{selectedMachine.buildLabel}</span>
        <span>{selectedMachine.statusLabel}</span>
      </div>
      <div className="machine-window-meta">cycle {selectedMachine.cycleSec.toFixed(2)}s</div>
      <label className="machine-window-recipe">
        <span>Recipe</span>
        <select
          value={selectedMachine.selectedRecipeId ?? 'auto'}
          onChange={(event) => {
            const value = event.target.value
            onSelectRecipe(value === 'auto' ? null : value)
          }}
        >
          <option value="auto">Auto Detect</option>
          {selectedMachine.availableRecipeIds.map((recipeId) => (
            <option key={recipeId} value={recipeId}>
              {recipeDisplayLabel(recipeId)}
            </option>
          ))}
        </select>
      </label>
      <div className="machine-window-meta">
        {activeRecipe ? (
          <>
            output {resourceLabel(activeRecipe.output.material)} x{activeRecipe.output.amount}
          </>
        ) : (
          <>output pending</>
        )}
      </div>
      <div className="window-section-head machine-window-section-head machine-window-buffer-head">
        <h3 className="window-section-title">Input Buffer</h3>
        <span className="window-section-meta">{selectedMachine.bufferRows.length} resources</span>
      </div>
      {selectedMachine.bufferRows.length > 0 ? (
        <div className="machine-window-buffer-list">
          {selectedMachine.bufferRows.map((row) => (
            <div key={row.resource} className="machine-window-buffer-row">
              <span>{resourceLabel(row.resource)}</span>
              <span>
                {row.buffered.toFixed(1)}/{row.required.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="machine-window-buffer-empty">No buffered inputs</div>
      )}
    </FloatingWindow>
  )
}

const MachineFloatingWindow = memo(MachineFloatingWindowComponent)
MachineFloatingWindow.displayName = 'MachineFloatingWindow'

export default MachineFloatingWindow
