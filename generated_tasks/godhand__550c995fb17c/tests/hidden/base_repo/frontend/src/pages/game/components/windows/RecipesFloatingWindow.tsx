import {
  memo,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from 'react'
import GodhandButtonBase from '../../../../components/GodhandButtonBase'
import {
  getCraftingStationLabel,
  type CraftRecipeDefinition,
  type CraftingStationDefinition,
} from '../../../../game/engine'
import FloatingWindow from '../FloatingWindow'

type RecipeGraphEntry = {
  recipe: CraftRecipeDefinition
  depth: number
  affordable: boolean
  stationAvailable: boolean
  availableNow: boolean
}

type RecipeGraphEdge = {
  key: string
  ingredient: string
  sx: number
  sy: number
  tx: number
  ty: number
}

type RecipeGraphPanState = {
  active: boolean
  lastClientX: number
  lastClientY: number
}

type RecipeNodeDragState = {
  recipeId: string
  offsetX: number
  offsetY: number
}

type RecipeFloatingWindowProps = {
  open: boolean
  containerRef: RefObject<HTMLDivElement | null>
  onClose: () => void
  recipeGraphEntries: RecipeGraphEntry[]
  recipeListLength: number
  recipeSearch: string
  setRecipeSearch: Dispatch<SetStateAction<string>>
  recipeValleyFilter: 'all' | number
  setRecipeValleyFilter: Dispatch<SetStateAction<'all' | number>>
  recipeStationFilter: string
  setRecipeStationFilter: Dispatch<SetStateAction<string>>
  stationOptions: CraftingStationDefinition[]
  recipeAvailableOnly: boolean
  setRecipeAvailableOnly: Dispatch<SetStateAction<boolean>>
  recipeAffordableOnly: boolean
  setRecipeAffordableOnly: Dispatch<SetStateAction<boolean>>
  setRecipeNodePositions: Dispatch<SetStateAction<Record<string, { x: number; y: number }>>>
  focusedRecipeLabel: string | null
  clearFocusedRecipe: () => void
  resetRecipeView: () => void
  setRecipeGraphViewportNode: (node: HTMLDivElement | null) => void
  recipeGraphPanRef: MutableRefObject<RecipeGraphPanState | null>
  setRecipeGraphTransformNode: (node: HTMLDivElement | null) => void
  recipeGraphLayout: {
    rootPositions: Record<string, { x: number; y: number }>
    width: number
    height: number
  }
  recipeGraphEdges: RecipeGraphEdge[]
  recipeInputRoots: string[]
  resolvedRecipeNodePositions: Record<string, { x: number; y: number }>
  recipeFocusId: string | null
  toggleRecipeFocus: (recipeId: string) => void
  recipeNodeDragRef: MutableRefObject<RecipeNodeDragState | null>
  screenToRecipeGraphPoint: (clientX: number, clientY: number) => { x: number; y: number } | null
  resourceLabel: (resource: string) => string
  ingredientEdgeColor: (ingredient: string) => string
}

const RECIPE_INITIAL_RECT = { x: 410, y: 18, width: 610, height: 470 }

function RecipesFloatingWindowComponent({
  open,
  containerRef,
  onClose,
  recipeGraphEntries,
  recipeListLength,
  recipeSearch,
  setRecipeSearch,
  recipeValleyFilter,
  setRecipeValleyFilter,
  recipeStationFilter,
  setRecipeStationFilter,
  stationOptions,
  recipeAvailableOnly,
  setRecipeAvailableOnly,
  recipeAffordableOnly,
  setRecipeAffordableOnly,
  setRecipeNodePositions,
  focusedRecipeLabel,
  clearFocusedRecipe,
  resetRecipeView,
  setRecipeGraphViewportNode,
  recipeGraphPanRef,
  setRecipeGraphTransformNode,
  recipeGraphLayout,
  recipeGraphEdges,
  recipeInputRoots,
  resolvedRecipeNodePositions,
  recipeFocusId,
  toggleRecipeFocus,
  recipeNodeDragRef,
  screenToRecipeGraphPoint,
  resourceLabel,
  ingredientEdgeColor,
}: RecipeFloatingWindowProps) {
  if (!open) return null

  return (
    <FloatingWindow
      title="Recipe Tree"
      containerRef={containerRef}
      initialRect={RECIPE_INITIAL_RECT}
      initialMinimized
      minWidth={420}
      minHeight={280}
      className="recipes-floating-window"
      onClose={onClose}
      minimizedContent={
        <div className="recipe-minimized-summary">{recipeGraphEntries.length} recipes in current view</div>
      }
    >
      <div className="recipe-controls">
        <div className="window-section-head recipe-controls-head">
          <h3 className="window-section-title">Filters</h3>
          <span className="window-section-meta">Right drag pans graph · mouse wheel zooms</span>
        </div>
        <input
          className="recipe-search"
          placeholder="Search output, ingredient, or station..."
          value={recipeSearch}
          onChange={(event) => {
            setRecipeSearch(event.target.value)
          }}
        />
        <div className="recipe-filter-row">
          <label className="recipe-filter">
            <span>Valley</span>
            <select
              value={recipeValleyFilter}
              onChange={(event) => {
                const next = event.target.value
                setRecipeValleyFilter(next === 'all' ? 'all' : Number(next))
              }}
            >
              <option value="all">All Valleys</option>
              <option value={1}>Valley 1</option>
              <option value={2}>Valley 2</option>
              <option value={3}>Valley 3</option>
              <option value={4}>Valley 4</option>
            </select>
          </label>
          <label className="recipe-filter">
            <span>Station</span>
            <select
              value={recipeStationFilter}
              onChange={(event) => {
                setRecipeStationFilter(event.target.value)
              }}
            >
              <option value="all">All Stations</option>
              {stationOptions.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="recipe-toggle-row">
          <label>
            <input
              type="checkbox"
              checked={recipeAvailableOnly}
              onChange={(event) => {
                setRecipeAvailableOnly(event.target.checked)
              }}
            />
            Available now
          </label>
          <label>
            <input
              type="checkbox"
              checked={recipeAffordableOnly}
              onChange={(event) => {
                setRecipeAffordableOnly(event.target.checked)
              }}
            />
            Affordable now
          </label>
          <GodhandButtonBase
            type="button"
            onClick={() => {
              setRecipeSearch('')
              setRecipeValleyFilter('all')
              setRecipeStationFilter('all')
              setRecipeAvailableOnly(false)
              setRecipeAffordableOnly(false)
            }}
          >
            Clear
          </GodhandButtonBase>
          <GodhandButtonBase
            type="button"
            onClick={() => {
              setRecipeNodePositions({})
            }}
          >
            Reset Layout
          </GodhandButtonBase>
          <GodhandButtonBase type="button" onClick={resetRecipeView}>
            Reset View
          </GodhandButtonBase>
          {focusedRecipeLabel ? (
            <GodhandButtonBase type="button" onClick={clearFocusedRecipe}>
              Clear Focus ({focusedRecipeLabel})
            </GodhandButtonBase>
          ) : null}
        </div>
      </div>

      <div className="recipe-summary">
        Showing {recipeGraphEntries.length} / {recipeListLength} recipes
      </div>
      <div className="window-section-head recipe-graph-head">
        <h3 className="window-section-title">Production Graph</h3>
        <span className="window-section-meta">{recipeGraphEdges.length} links</span>
      </div>

      <div
        ref={setRecipeGraphViewportNode}
        className="recipe-graph-scroll"
        onPointerDown={(event) => {
          if (event.button !== 2) return
          recipeGraphPanRef.current = {
            active: true,
            lastClientX: event.clientX,
            lastClientY: event.clientY,
          }
          event.preventDefault()
          event.stopPropagation()
        }}
        onContextMenu={(event) => {
          event.preventDefault()
        }}
      >
        {recipeGraphEntries.length > 0 ? (
          <div
            ref={setRecipeGraphTransformNode}
            className="recipe-graph-transform"
            style={{
              transform: 'translate(16px, 16px) scale(1)',
              transformOrigin: '0 0',
            }}
          >
            <div
              className="recipe-graph-editor"
              style={{
                width: `${recipeGraphLayout.width}px`,
                height: `${recipeGraphLayout.height}px`,
              }}
            >
              <svg className="recipe-graph-links" width={recipeGraphLayout.width} height={recipeGraphLayout.height}>
                <defs>
                  <marker
                    id="recipe-edge-arrow"
                    markerWidth="8"
                    markerHeight="8"
                    refX="7"
                    refY="4"
                    orient="auto"
                    markerUnits="userSpaceOnUse"
                  >
                    <path d="M 0 0 L 8 4 L 0 8 z" fill="currentColor" />
                  </marker>
                </defs>
                {recipeGraphEdges.map((edge) => {
                  const routeSkew = (edge.ingredient.charCodeAt(0) % 7) - 3
                  const bendA = edge.sx + Math.max(34, (edge.tx - edge.sx) * 0.24) + routeSkew * 6
                  const bendB = edge.tx - 14 - routeSkew * 3
                  const path = `M ${edge.sx} ${edge.sy} L ${bendA} ${edge.sy} L ${bendA} ${edge.ty} L ${bendB} ${edge.ty} L ${edge.tx} ${edge.ty}`
                  const edgeColor = ingredientEdgeColor(edge.ingredient)
                  return (
                    <path
                      key={edge.key}
                      d={path}
                      className="recipe-edge-path"
                      markerEnd="url(#recipe-edge-arrow)"
                      style={{
                        stroke: edgeColor,
                        color: edgeColor,
                      }}
                    />
                  )
                })}
              </svg>

              {recipeInputRoots.map((resource) => {
                const rootPos = recipeGraphLayout.rootPositions[resource]
                if (!rootPos) return null
                return (
                  <div
                    key={resource}
                    className="recipe-root-node"
                    style={{ left: `${rootPos.x}px`, top: `${rootPos.y}px` }}
                  >
                    <span className="recipe-root-label">{resourceLabel(resource)}</span>
                  </div>
                )
              })}

              {recipeGraphEntries.map((entry) => {
                const nodePos = resolvedRecipeNodePositions[entry.recipe.id]
                if (!nodePos) return null
                return (
                  <article
                    key={entry.recipe.id}
                    className={`recipe-node ${entry.availableNow ? 'recipe-node-available' : ''}`}
                    style={{ left: `${nodePos.x}px`, top: `${nodePos.y}px` }}
                    onPointerDown={(event) => {
                      if (event.button !== 0) return
                      const pointer = screenToRecipeGraphPoint(event.clientX, event.clientY)
                      if (!pointer) return
                      recipeNodeDragRef.current = {
                        recipeId: entry.recipe.id,
                        offsetX: pointer.x - nodePos.x,
                        offsetY: pointer.y - nodePos.y,
                      }
                      event.preventDefault()
                      event.stopPropagation()
                    }}
                  >
                    <div className="recipe-node-head">
                      <span>{resourceLabel(entry.recipe.output.material)}</span>
                      <span>x{entry.recipe.output.amount}</span>
                    </div>
                    <GodhandButtonBase
                      type="button"
                      className={`recipe-node-focus-button ${
                        recipeFocusId === entry.recipe.id ? 'recipe-node-focus-active' : ''
                      }`}
                      onPointerDown={(event) => {
                        event.stopPropagation()
                      }}
                      onClick={(event) => {
                        event.stopPropagation()
                        toggleRecipeFocus(entry.recipe.id)
                      }}
                    >
                      {recipeFocusId === entry.recipe.id ? 'Focused' : 'Focus Chain'}
                    </GodhandButtonBase>
                    <div className="recipe-node-meta">
                      valley {entry.recipe.valley} · {getCraftingStationLabel(entry.recipe.station)}
                    </div>
                    <div className="recipe-node-status-row">
                      <span className={`recipe-status-chip ${entry.availableNow ? 'recipe-status-good' : ''}`}>
                        {entry.availableNow ? 'available' : 'locked'}
                      </span>
                      <span className={`recipe-status-chip ${entry.affordable ? 'recipe-status-good' : ''}`}>
                        {entry.affordable ? 'affordable' : 'missing mats'}
                      </span>
                    </div>
                    <div className="recipe-node-ingredients">
                      {Object.entries(entry.recipe.cost).map(([resource, amount]) => (
                        <span key={resource} className="recipe-input-chip">
                          {amount} {resourceLabel(resource)}
                        </span>
                      ))}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="recipe-empty-state">No recipes match the current filters.</div>
        )}
      </div>
    </FloatingWindow>
  )
}

const RecipesFloatingWindow = memo(RecipesFloatingWindowComponent)
RecipesFloatingWindow.displayName = 'RecipesFloatingWindow'

export default RecipesFloatingWindow
