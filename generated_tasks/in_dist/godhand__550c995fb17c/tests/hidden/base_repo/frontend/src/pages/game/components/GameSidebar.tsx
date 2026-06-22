import type { CSSProperties } from 'react'
import GodhandButtonBase from '../../../components/GodhandButtonBase'
import batterytileAsset from '../../../assets/batterytile.png'
import conveyortileAsset from '../../../assets/conveyortile.png'
import drilltileAsset from '../../../assets/drilltile.png'
import generatortileAsset from '../../../assets/generatortile.png'
import logisticshubtileAsset from '../../../assets/logisticshubtile.png'
import minertileAsset from '../../../assets/minertile.png'
import smeltertileAsset from '../../../assets/smeltertile.png'
import splittertileAsset from '../../../assets/splittertile.png'
import storagetileAsset from '../../../assets/storagetile.png'
import {
  BUILD_COSTS,
  BUILD_DEFINITIONS,
  CRAFT_RECIPES,
  UNLOCK_RULES,
  canAffordCost,
  getCraftingStationLabel,
  isCraftingStationAvailable,
  type BuildableId,
  type CraftRecipeId,
  type EconomySnapshot,
} from '../../../game/engine'
import {
  BUILD_CATEGORIES,
  BUILD_COLORS,
  CATEGORY_COLORS,
  type BuildCategoryId,
  type BuildId,
} from '../buildCatalog'

type ManualCraftState = {
  recipeId: string
  startedAtMs: number
  durationMs: number
}

type ManualCraftQueueEntry = {
  recipeId: string
  count: number
}

type ManualQueueChip = {
  recipeId: string
  token: string
  count: number
  label: string
}

type SidebarDiagnostics = {
  fps: number
  frameMs: number
  updateMs: number
  drawMs: number
  pingMs: number | null | undefined
  packetsIn: number
  packetsOut: number
  bytesIn: number
  bytesOut: number
  socketStatus: 'idle' | 'connecting' | 'open' | 'closed'
}

type GameSidebarProps = {
  onNavigateTitle: () => void
  onNavigateLobby: () => void
  onNavigateProfile: () => void
  performanceHudEnabled: boolean
  diagnostics: SidebarDiagnostics | null
  chatWindowOpen: boolean
  inventoryWindowOpen: boolean
  recipesWindowOpen: boolean
  timingWindowOpen: boolean
  settingsWindowOpen: boolean
  onToggleChatWindow: () => void
  onToggleInventoryWindow: () => void
  onToggleRecipesWindow: () => void
  onToggleTimingWindow: () => void
  onToggleSettingsWindow: () => void
  selectedBuildId: BuildId | null
  selectedBuildLabel: string | null
  selectedBuildCost: Partial<Record<string, number>> | null
  selectedBuildAffordable: boolean
  selectedCategoryId: BuildCategoryId
  onSelectCategory: (categoryId: BuildCategoryId) => void
  collapsedCategoryIds: BuildCategoryId[]
  onToggleCategoryCollapsed: (categoryId: BuildCategoryId) => void
  onSelectBuildItem: (buildId: BuildId) => void
  economy: EconomySnapshot
  bridgeTier: number
  manualCraftQueue: ManualCraftQueueEntry[]
  manualQueueChips: ManualQueueChip[]
  manualCraftTickMs: number
  activeManualCraft: ManualCraftState | null
  canvasActionsReady: boolean
  onQueueManualRecipe: (recipeId: CraftRecipeId) => void
  onCraftRecipe: (recipeId: CraftRecipeId) => void
  onUnlock: (buildId: BuildableId) => void
  formatCost: (cost: Partial<Record<string, number>>) => string
  resourceLabel: (resource: string) => string
  maxManualQueueUnique: number
}

const BUILD_BUTTON_SPRITES: Partial<Record<BuildId, string>> = {
  conveyor: conveyortileAsset,
  splitter: splittertileAsset,
  storage: storagetileAsset,
  depot_in: logisticshubtileAsset,
  depot_out: logisticshubtileAsset,
  logistics_hub: logisticshubtileAsset,
  miner: minertileAsset,
  drill: drilltileAsset,
  smelter: smeltertileAsset,
  assembler: smeltertileAsset,
  refinery: smeltertileAsset,
  lab: batterytileAsset,
  generator: generatortileAsset,
  relay_tower: generatortileAsset,
  bridge_t1: splittertileAsset,
  bridge_t2: splittertileAsset,
  bridge_t3: splittertileAsset,
  bridge_t4: splittertileAsset,
}

function tokenLabel(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9]/g, '')
  if (cleaned.length >= 2) return cleaned.slice(0, 2).toUpperCase()
  return value.slice(0, 2).toUpperCase()
}

function formatPing(value: number | null | undefined): string {
  if (value === undefined) return '...'
  if (value === null) return 'n/a'
  return `${Math.max(1, Math.round(value))}ms`
}

function formatByteCount(value: number): string {
  const bytes = Math.max(0, Math.round(value))
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.min(max, Math.max(min, value))
}

export default function GameSidebar({
  onNavigateTitle,
  onNavigateLobby,
  onNavigateProfile,
  performanceHudEnabled,
  diagnostics,
  chatWindowOpen,
  inventoryWindowOpen,
  recipesWindowOpen,
  timingWindowOpen,
  settingsWindowOpen,
  onToggleChatWindow,
  onToggleInventoryWindow,
  onToggleRecipesWindow,
  onToggleTimingWindow,
  onToggleSettingsWindow,
  selectedBuildId,
  selectedBuildLabel,
  selectedBuildCost,
  selectedBuildAffordable,
  selectedCategoryId,
  onSelectCategory,
  collapsedCategoryIds,
  onToggleCategoryCollapsed,
  onSelectBuildItem,
  economy,
  bridgeTier,
  manualCraftQueue,
  manualQueueChips,
  manualCraftTickMs,
  activeManualCraft,
  canvasActionsReady,
  onQueueManualRecipe,
  onCraftRecipe,
  onUnlock,
  formatCost,
  resourceLabel,
  maxManualQueueUnique,
}: GameSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-scroll">
        <div className="sidebar-section sidebar-nav-section">
          <div className="sidebar-nav-row">
            <GodhandButtonBase className="sidebar-nav-button" onClick={onNavigateTitle}>
              Title
            </GodhandButtonBase>
            <GodhandButtonBase className="sidebar-nav-button" onClick={onNavigateLobby}>
              Lobby
            </GodhandButtonBase>
            <GodhandButtonBase className="sidebar-nav-button" onClick={onNavigateProfile}>
              Profile
            </GodhandButtonBase>
          </div>
        </div>

        {performanceHudEnabled && diagnostics ? (
          <div className="sidebar-section sidebar-diagnostics-section">
            <div className="sidebar-section-header">
              <h2 className="sidebar-section-title">Performance</h2>
            </div>
            <div className="sidebar-diagnostics-grid">
              <div className="sidebar-diagnostics-item">
                <span className="sidebar-diagnostics-label">FPS</span>
                <span className="sidebar-diagnostics-value">{Math.max(0, Math.round(diagnostics.fps))}</span>
              </div>
              <div className="sidebar-diagnostics-item">
                <span className="sidebar-diagnostics-label">Ping</span>
                <span className="sidebar-diagnostics-value">{formatPing(diagnostics.pingMs)}</span>
              </div>
              <div className="sidebar-diagnostics-item">
                <span className="sidebar-diagnostics-label">Frame</span>
                <span className="sidebar-diagnostics-value">{diagnostics.frameMs.toFixed(1)}ms</span>
              </div>
              <div className="sidebar-diagnostics-item">
                <span className="sidebar-diagnostics-label">Update</span>
                <span className="sidebar-diagnostics-value">{diagnostics.updateMs.toFixed(1)}ms</span>
              </div>
              <div className="sidebar-diagnostics-item">
                <span className="sidebar-diagnostics-label">Draw</span>
                <span className="sidebar-diagnostics-value">{diagnostics.drawMs.toFixed(1)}ms</span>
              </div>
              <div className="sidebar-diagnostics-item">
                <span className="sidebar-diagnostics-label">Packets</span>
                <span className="sidebar-diagnostics-value">
                  in {diagnostics.packetsIn} · out {diagnostics.packetsOut}
                </span>
              </div>
              <div className="sidebar-diagnostics-item sidebar-diagnostics-item-wide">
                <span className="sidebar-diagnostics-label">Traffic</span>
                <span className="sidebar-diagnostics-value">
                  in {formatByteCount(diagnostics.bytesIn)} · out {formatByteCount(diagnostics.bytesOut)}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <details className="sidebar-section sidebar-expandable" open>
          <summary className="sidebar-expandable-summary">Windows</summary>
          <div className="sidebar-expandable-content">
            <div className="window-toggle-list">
              <GodhandButtonBase className="window-toggle-button" onClick={onToggleChatWindow}>
                <span className="window-toggle-label">Chat</span>
                <span
                  className={`window-toggle-state ${chatWindowOpen ? 'window-toggle-state-on' : 'window-toggle-state-off'}`}
                >
                  {chatWindowOpen ? 'On' : 'Off'}
                </span>
              </GodhandButtonBase>
              <GodhandButtonBase className="window-toggle-button" onClick={onToggleInventoryWindow}>
                <span className="window-toggle-label">Inventory</span>
                <span
                  className={`window-toggle-state ${
                    inventoryWindowOpen ? 'window-toggle-state-on' : 'window-toggle-state-off'
                  }`}
                >
                  {inventoryWindowOpen ? 'On' : 'Off'}
                </span>
              </GodhandButtonBase>
              <GodhandButtonBase className="window-toggle-button" onClick={onToggleRecipesWindow}>
                <span className="window-toggle-label">Recipe Tree</span>
                <span
                  className={`window-toggle-state ${recipesWindowOpen ? 'window-toggle-state-on' : 'window-toggle-state-off'}`}
                >
                  {recipesWindowOpen ? 'On' : 'Off'}
                </span>
              </GodhandButtonBase>
              <GodhandButtonBase className="window-toggle-button" onClick={onToggleTimingWindow}>
                <span className="window-toggle-label">Timing</span>
                <span
                  className={`window-toggle-state ${timingWindowOpen ? 'window-toggle-state-on' : 'window-toggle-state-off'}`}
                >
                  {timingWindowOpen ? 'On' : 'Off'}
                </span>
              </GodhandButtonBase>
              <GodhandButtonBase className="window-toggle-button" onClick={onToggleSettingsWindow}>
                <span className="window-toggle-label">Settings</span>
                <span
                  className={`window-toggle-state ${settingsWindowOpen ? 'window-toggle-state-on' : 'window-toggle-state-off'}`}
                >
                  {settingsWindowOpen ? 'On' : 'Off'}
                </span>
              </GodhandButtonBase>
            </div>
          </div>
        </details>

        <details className="sidebar-section sidebar-expandable" open>
          <summary className="sidebar-expandable-summary">Build</summary>
          <div className="sidebar-expandable-content">
            <div className="build-menu">
              <div className="build-selection-cost">
                {selectedBuildId && selectedBuildCost ? (
                  <>
                    <div className="build-selection-title">{selectedBuildLabel}</div>
                    <div className={`build-selection-afford ${selectedBuildAffordable ? 'afford-yes' : 'afford-no'}`}>
                      {selectedBuildAffordable ? 'ready to place' : 'missing resources'}
                    </div>
                    <div className="build-selection-cost-text">{formatCost(selectedBuildCost)}</div>
                    <div className="build-selection-hint">{BUILD_DEFINITIONS[selectedBuildId].description}</div>
                    {BUILD_DEFINITIONS[selectedBuildId].details.length > 0 ? (
                      <ul className="build-selection-details">
                        {BUILD_DEFINITIONS[selectedBuildId].details.map((detail) => (
                          <li key={`${selectedBuildId}:${detail}`}>{detail}</li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div className="build-selection-cost-text">select an unlocked build to place</div>
                    <div className="build-selection-hint">pick a build category and click a building to see details</div>
                  </>
                )}
              </div>

              <div className="build-categories">
                {BUILD_CATEGORIES.map((category) => {
                  const collapsed = collapsedCategoryIds.includes(category.id)
                  return (
                    <section key={category.id} className="build-category-group">
                      <GodhandButtonBase
                        className={`build-category-button build-category-${category.id} ${
                          selectedCategoryId === category.id ? 'build-active' : ''
                        }`}
                        style={
                          {
                            background: CATEGORY_COLORS[category.id].fill,
                            borderColor: CATEGORY_COLORS[category.id].stroke,
                          } satisfies CSSProperties
                        }
                        onClick={() => {
                          onSelectCategory(category.id)
                          onToggleCategoryCollapsed(category.id)
                        }}
                      >
                        <span>{category.label}</span>
                        <span className="build-category-collapse-token">{collapsed ? '+' : '-'}</span>
                      </GodhandButtonBase>
                      {!collapsed ? (
                        <div className="build-items-panel">
                          {category.items
                            .filter((item) => item.id !== 'bridge_t1')
                            .map((item) => {
                              const unlocked = economy.unlocked[item.id]
                              const affordable = canAffordCost(economy, BUILD_COSTS[item.id])
                              const spriteSrc = BUILD_BUTTON_SPRITES[item.id]
                              return (
                                <GodhandButtonBase
                                  key={item.id}
                                  className={`build-item-button ${selectedBuildId === item.id ? 'build-active' : ''} ${
                                    !affordable ? 'build-item-expensive' : ''
                                  } ${!unlocked ? 'build-item-unavailable' : ''}`}
                                  disabled={!unlocked}
                                  onClick={() => {
                                    if (!unlocked) return
                                    onSelectCategory(category.id)
                                    onSelectBuildItem(item.id)
                                  }}
                                  title={item.label}
                                  style={
                                    {
                                      background: BUILD_COLORS[item.id].fill,
                                      borderColor: BUILD_COLORS[item.id].stroke,
                                    } satisfies CSSProperties
                                  }
                                >
                                  <span className="build-item-visual">
                                    {spriteSrc ? (
                                      <img className="build-item-sprite" src={spriteSrc} alt="" aria-hidden />
                                    ) : (
                                      <span className="build-item-token">{tokenLabel(item.label)}</span>
                                    )}
                                  </span>
                                  <span className="build-item-label">{item.label}</span>
                                  <span className="build-item-lock">
                                    {unlocked ? (affordable ? 'Ready' : 'Costly') : 'Locked'}
                                  </span>
                                </GodhandButtonBase>
                              )
                            })}
                        </div>
                      ) : null}
                    </section>
                  )
                })}
              </div>
            </div>
          </div>
        </details>

        <details className="sidebar-section sidebar-expandable craft-section" open>
          <summary className="sidebar-expandable-summary">Crafting</summary>
          <div className="sidebar-expandable-content craft-list">
            {Object.values(CRAFT_RECIPES).map((recipe) => {
              const affordable = canAffordCost(economy, recipe.cost)
              const available = bridgeTier >= recipe.valley
              const stationAvailable = isCraftingStationAvailable(economy.unlocked, recipe.station)
              const manual = recipe.station === 'manual'
              const queuedEntry = manualCraftQueue.find((entry) => entry.recipeId === recipe.id)
              const activeForRecipe =
                activeManualCraft && activeManualCraft.recipeId === recipe.id ? activeManualCraft : null
              const manualCrafting = activeForRecipe !== null
              const queueHasCapacity = Boolean(queuedEntry) || manualCraftQueue.length < maxManualQueueUnique
              const manualProgress = manualCrafting
                ? clamp((manualCraftTickMs - activeForRecipe.startedAtMs) / activeForRecipe.durationMs, 0, 1)
                : 0
              const manualRemainingSec = manualCrafting
                ? Math.max(0, (activeForRecipe.startedAtMs + activeForRecipe.durationMs - manualCraftTickMs) / 1000)
                : 0
              const disabled = manual
                ? !available || !stationAvailable || !canvasActionsReady || !queueHasCapacity
                : !affordable || !available || !stationAvailable || !canvasActionsReady
              return (
                <GodhandButtonBase
                  key={recipe.id}
                  className={`craft-button ${affordable && available && stationAvailable ? 'craft-ready' : ''} ${
                    manualCrafting ? 'craft-working' : ''
                  }`}
                  disabled={disabled}
                  onClick={() => {
                    if (manual) {
                      onQueueManualRecipe(recipe.id)
                      return
                    }
                    onCraftRecipe(recipe.id)
                  }}
                >
                  <span className="craft-title-row">
                    <span>{recipe.label}</span>
                    <span className="craft-output">
                      +{recipe.output.amount} {resourceLabel(recipe.output.material).toLowerCase()}
                    </span>
                  </span>
                  <span className="craft-meta">
                    valley {recipe.valley} ·{' '}
                    {stationAvailable
                      ? getCraftingStationLabel(recipe.station)
                      : `needs ${getCraftingStationLabel(recipe.station)}`}
                  </span>
                  <span className="craft-cost">{formatCost(recipe.cost)}</span>
                  {manual ? (
                    <span className="craft-meta">
                      queued {queuedEntry?.count ?? 0}
                      {manualCrafting ? ' · active' : ''}
                    </span>
                  ) : null}
                  {manualCrafting ? (
                    <>
                      <div className="craft-progress">
                        <div className="craft-progress-fill" style={{ width: `${manualProgress * 100}%` }} />
                      </div>
                      <span className="craft-cost">crafting {manualRemainingSec.toFixed(1)}s</span>
                    </>
                  ) : null}
                </GodhandButtonBase>
              )
            })}
          </div>
        </details>

        <details className="sidebar-section sidebar-expandable research-section">
          <summary className="sidebar-expandable-summary">Research</summary>
          <div className="sidebar-expandable-content research-list">
            {(
              Object.values(UNLOCK_RULES).filter(Boolean) as {
                buildId: BuildableId
                label: string
                cost: Partial<Record<string, number>>
                description: string
                valley: number
              }[]
            ).map((rule) => {
              const unlocked = economy.unlocked[rule.buildId]
              const affordable = canAffordCost(economy, rule.cost)
              const available = bridgeTier >= Math.max(1, rule.valley - 1)
              return (
                <GodhandButtonBase
                  key={rule.buildId}
                  className={`research-button ${unlocked ? 'research-done' : ''}`}
                  disabled={unlocked || !affordable || !available || !canvasActionsReady}
                  onClick={() => {
                    onUnlock(rule.buildId)
                  }}
                >
                  <span className="research-title-row">
                    <span>{rule.label}</span>
                    <span className="research-state">{unlocked ? 'Unlocked' : `v${rule.valley}`}</span>
                  </span>
                  <span className="research-description">{rule.description}</span>
                  <span className="craft-cost">{unlocked ? 'unlocked' : formatCost(rule.cost)}</span>
                </GodhandButtonBase>
              )
            })}
          </div>
        </details>
      </div>

      <div className="sidebar-section manual-queue-bar">
        <div className="manual-queue-head">
          <span>Crafting Queue</span>
          <span className="manual-queue-capacity">
            {manualCraftQueue.length}/{maxManualQueueUnique}
          </span>
        </div>
        {manualQueueChips.length > 0 ? (
          <div className="manual-queue-row">
            {manualQueueChips.map((chip) => (
              <div
                key={chip.recipeId}
                className={`manual-queue-chip ${
                  activeManualCraft?.recipeId === chip.recipeId ? 'manual-queue-chip-active' : ''
                }`}
                title={`${chip.label} x${chip.count}`}
              >
                <span>{chip.token}</span>
                {chip.count > 1 ? <span className="manual-queue-count">{chip.count}</span> : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="manual-queue-empty">queue empty</div>
        )}
      </div>
    </aside>
  )
}
