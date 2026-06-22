import { memo } from 'react'
import { CRAFT_RECIPES, type CraftRecipeId } from '../../../../game/engine'
import GodhandButtonBase from '../../../../components/GodhandButtonBase'

export type SelectedProductionConfigView = {
  id: string
  buildLabel: string
  targetKind: 'processor' | 'depot_output'
  statusLabel: string
  mode: 'auto' | 'manual'
  selectedRecipeId?: CraftRecipeId | null
  activeRecipeId?: CraftRecipeId | null
  availableRecipeIds?: CraftRecipeId[]
  selectedOutputResource?: string | null
  activeOutputResource?: string | null
  availableOutputResources?: string[]
}

type ProductionConfigModalProps = {
  open: boolean
  selectedConfig: SelectedProductionConfigView | null
  onClose: () => void
  onSelectOption: (value: string | null) => void
  resourceLabel: (resource: string) => string
}

function recipeDisplayLabel(recipeId: string): string {
  const recipe = CRAFT_RECIPES[recipeId]
  if (!recipe) return recipeId
  return recipe.label
}

function ProductionConfigModalComponent({
  open,
  selectedConfig,
  onClose,
  onSelectOption,
  resourceLabel,
}: ProductionConfigModalProps) {
  if (!open || !selectedConfig) return null

  const activeRecipe =
    selectedConfig.targetKind === 'processor' && selectedConfig.activeRecipeId
      ? CRAFT_RECIPES[selectedConfig.activeRecipeId]
      : null
  const title = selectedConfig.targetKind === 'processor' ? 'Processor Config' : 'Depot Output Config'
  const selectorLabel = selectedConfig.targetKind === 'processor' ? 'Craft Recipe' : 'Output Selection'

  return (
    <div className="production-config-modal-overlay" role="presentation" onClick={onClose}>
      <section
        className="production-config-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="floating-window-header production-config-modal-header">
          <GodhandButtonBase
            type="button"
            className="floating-window-drag production-config-modal-titlebar"
            tabIndex={-1}
            aria-hidden="true"
          >
            {title}
          </GodhandButtonBase>
          <div className="floating-window-header-actions">
            <GodhandButtonBase
              type="button"
              className="floating-window-header-icon"
              aria-label={`Close ${title}`}
              title="Close"
              onClick={onClose}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </GodhandButtonBase>
          </div>
        </header>
        <div className="production-config-modal-content">
          <div className="production-config-modal-meta">
            <span>{selectedConfig.buildLabel}</span>
            <span>{selectedConfig.statusLabel}</span>
          </div>
          <div className="production-config-modal-meta">
            <span>Mode: {selectedConfig.mode}</span>
            <span>ID: {selectedConfig.id}</span>
          </div>
          <label className="production-config-modal-select">
            <span>{selectorLabel}</span>
            {selectedConfig.targetKind === 'processor' ? (
              <select
                value={selectedConfig.selectedRecipeId ?? 'auto'}
                onChange={(event) => {
                  const value = event.target.value
                  onSelectOption(value === 'auto' ? null : value)
                }}
              >
                <option value="auto">Auto</option>
                {(selectedConfig.availableRecipeIds ?? []).map((recipeId) => (
                  <option key={recipeId} value={recipeId}>
                    {recipeDisplayLabel(recipeId)}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedConfig.selectedOutputResource ?? 'auto'}
                onChange={(event) => {
                  const value = event.target.value
                  onSelectOption(value === 'auto' ? null : value)
                }}
              >
                <option value="auto">Auto (demand/inventory based)</option>
                {(selectedConfig.availableOutputResources ?? []).map((resourceId) => (
                  <option key={resourceId} value={resourceId}>
                    {resourceLabel(resourceId)}
                  </option>
                ))}
              </select>
            )}
          </label>
          <div className="production-config-modal-active">
            {selectedConfig.targetKind === 'processor' && activeRecipe ? (
              <>
                Active output: {resourceLabel(activeRecipe.output.material)} x{activeRecipe.output.amount}
              </>
            ) : selectedConfig.targetKind === 'depot_output' && selectedConfig.activeOutputResource ? (
              <>Active output: {resourceLabel(selectedConfig.activeOutputResource)}</>
            ) : (
              <>Active output: auto</>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

const ProductionConfigModal = memo(ProductionConfigModalComponent)
ProductionConfigModal.displayName = 'ProductionConfigModal'

export default ProductionConfigModal
