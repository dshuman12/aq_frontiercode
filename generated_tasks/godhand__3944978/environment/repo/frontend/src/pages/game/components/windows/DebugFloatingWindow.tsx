import { memo, useMemo, useState, type FormEvent, type RefObject } from 'react'
import GodhandButtonBase from '../../../../components/GodhandButtonBase'
import { CRAFT_RECIPES, MATERIAL_LABELS, MATERIAL_TYPES, ORE_TYPES } from '../../../../game/engine'
import { DEBUG_QUICK_CATEGORIES } from '../../debug/quickActions'
import { ORE_VISUALS } from '../../oreCatalog'
import type { DebugConsoleEntry } from '../../debug/types'
import { useTimingStoreSnapshot } from '../../state/timingStore'
import DebugConsole from '../DebugConsole'
import FloatingWindow from '../FloatingWindow'

type DebugFloatingWindowProps = {
  open: boolean
  containerRef: RefObject<HTMLDivElement | null>
  entries: DebugConsoleEntry[]
  onExecute: (input: string) => void
  onClear: () => void
  onClose: () => void
}

const DEBUG_INITIAL_RECT = { x: 1024, y: 22, width: 460, height: 300 }

type DebugResourceOption = {
  id: string
  label: string
}

function resourceLabel(resource: string): string {
  if (resource in ORE_VISUALS) return ORE_VISUALS[resource as keyof typeof ORE_VISUALS].label
  if (resource in MATERIAL_LABELS) return MATERIAL_LABELS[resource]
  return resource
}

function buildDebugResourceOptions(): DebugResourceOption[] {
  const byId = new Map<string, DebugResourceOption>()
  const addResource = (resource: string) => {
    const id = resource.trim().toLowerCase()
    if (!id || byId.has(id)) return
    byId.set(id, {
      id,
      label: resourceLabel(id),
    })
  }

  for (const ore of ORE_TYPES) addResource(ore)
  for (const material of MATERIAL_TYPES) addResource(material)
  for (const recipe of Object.values(CRAFT_RECIPES)) {
    addResource(recipe.output.material)
    for (const ingredient of Object.keys(recipe.cost)) {
      addResource(ingredient)
    }
  }

  return Array.from(byId.values()).sort((left, right) => left.label.localeCompare(right.label))
}

const DEBUG_RESOURCE_OPTIONS: DebugResourceOption[] = buildDebugResourceOptions()

const DEBUG_RESOURCE_SET = new Set(DEBUG_RESOURCE_OPTIONS.map((option) => option.id))
const DEFAULT_DEBUG_RESOURCE = DEBUG_RESOURCE_SET.has('iron')
  ? 'iron'
  : (DEBUG_RESOURCE_OPTIONS[0]?.id ?? '')

function DebugFloatingWindowComponent({
  open,
  containerRef,
  entries,
  onExecute,
  onClear,
  onClose,
}: DebugFloatingWindowProps) {
  if (!open) return null
  return (
    <DebugFloatingWindowBody
      containerRef={containerRef}
      entries={entries}
      onExecute={onExecute}
      onClear={onClear}
      onClose={onClose}
    />
  )
}

type DebugFloatingWindowBodyProps = {
  containerRef: RefObject<HTMLDivElement | null>
  entries: DebugConsoleEntry[]
  onExecute: (input: string) => void
  onClear: () => void
  onClose: () => void
}

function DebugFloatingWindowBody({
  containerRef,
  entries,
  onExecute,
  onClear,
  onClose,
}: DebugFloatingWindowBodyProps) {
  const [seedInput, setSeedInput] = useState('')
  const [resourceSearchInput, setResourceSearchInput] = useState('')
  const [resourceInput, setResourceInput] = useState(DEFAULT_DEBUG_RESOURCE)
  const [amountInput, setAmountInput] = useState('100')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set<string>(['worldgen', 'performance']),
  )
  const timing = useTimingStoreSnapshot()
  const perf = timing.performance
  const averageUtilPercent =
    timing.machines.length > 0
      ? Math.round((timing.machines.reduce((sum, machine) => sum + machine.utilization, 0) / timing.machines.length) * 100)
      : 0
  const filteredResourceOptions = useMemo(() => {
    const query = resourceSearchInput.trim().toLowerCase()
    if (!query) return DEBUG_RESOURCE_OPTIONS
    const filtered = DEBUG_RESOURCE_OPTIONS.filter((option) => {
      const searchText = `${option.id} ${option.label}`.toLowerCase()
      return searchText.includes(query)
    })
    if (filtered.some((option) => option.id === resourceInput)) return filtered
    const selected = DEBUG_RESOURCE_OPTIONS.find((option) => option.id === resourceInput)
    return selected ? [selected, ...filtered] : filtered
  }, [resourceInput, resourceSearchInput])

  const submitSeed = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = seedInput.trim()
    if (!value) return
    onExecute(`seed ${value}`)
    setSeedInput('')
  }

  const submitGiveResource = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const resource = resourceInput.trim().toLowerCase()
    if (!resource || !DEBUG_RESOURCE_SET.has(resource)) return

    const amount = Math.floor(Number(amountInput))
    if (!Number.isFinite(amount) || amount <= 0) return
    onExecute(`give ${resource} ${amount}`)
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((current) => {
      const next = new Set(current)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  return (
    <FloatingWindow
      title="Debug Console"
      containerRef={containerRef}
      initialRect={DEBUG_INITIAL_RECT}
      initialMinimized
      minWidth={360}
      minHeight={220}
      className="debug-floating-window"
      onClose={onClose}
      minimizedContent={
        <div className="recipe-minimized-summary">
          FPS {perf.fps.toFixed(1)} · tiles {perf.terrainTilesVisible}/{perf.terrainTilesTotal}
        </div>
      }
    >
      <div className="debug-performance-panel">
        <div className="debug-performance-title">Performance</div>
        <div className="debug-performance-grid">
          <span>fps</span>
          <span>{perf.fps.toFixed(1)}</span>
          <span>frame</span>
          <span>{perf.frameMs.toFixed(2)}ms</span>
          <span>update</span>
          <span>{perf.updateMs.toFixed(2)}ms</span>
          <span>draw</span>
          <span>{perf.drawMs.toFixed(2)}ms</span>
          <span>draw calls</span>
          <span>~{perf.drawCallsEstimate}</span>
          <span>terrain</span>
          <span>
            {perf.terrainTilesVisible}/{perf.terrainTilesTotal}
          </span>
          <span>terrain raster</span>
          <span>
            {perf.terrainRasterReady ? 'ready' : 'building'} ({perf.terrainRasterChunks})
          </span>
          <span>camera optimize</span>
          <span>{perf.cameraOptimizationActive ? 'on' : 'off'}</span>
          <span>entities</span>
          <span>
            b{perf.beltsVisible} · m{perf.minersVisible} · s{perf.structuresVisible} · i{perf.itemsVisible}
          </span>
          <span>utilization</span>
          <span>{averageUtilPercent}%</span>
        </div>
      </div>

      <div className="window-section-head debug-section-head">
        <h3 className="window-section-title">Quick Actions</h3>
        <span className="window-section-meta">Safe sandbox commands</span>
      </div>
      <div className="debug-quick-actions">
        {DEBUG_QUICK_CATEGORIES.map((category) => {
          const expanded = expandedCategories.has(category.id)
          return (
            <div key={category.id} className="debug-quick-category">
              <GodhandButtonBase
                type="button"
                className="debug-quick-summary"
                onClick={() => {
                  toggleCategory(category.id)
                }}
              >
                <span>{category.label}</span>
                <span>{expanded ? '−' : '+'}</span>
              </GodhandButtonBase>
              {expanded ? (
                <>
                  {category.id !== 'items' ? (
                    <div className="debug-quick-buttons">
                      {category.actions.map((action) => (
                        <GodhandButtonBase
                          key={action.id}
                          type="button"
                          onClick={() => {
                            onExecute(action.command)
                          }}
                        >
                          {action.label}
                        </GodhandButtonBase>
                      ))}
                    </div>
                  ) : (
                    <>
                      <form className="debug-give-form" onSubmit={submitGiveResource}>
                        <input
                          value={resourceSearchInput}
                          placeholder="search"
                          onChange={(event) => {
                            setResourceSearchInput(event.target.value)
                          }}
                        />
                        <select
                          value={resourceInput}
                          onChange={(event) => {
                            setResourceInput(event.target.value)
                          }}
                        >
                          {filteredResourceOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={amountInput}
                          placeholder="amount"
                          onChange={(event) => {
                            setAmountInput(event.target.value)
                          }}
                        />
                        <GodhandButtonBase type="submit">Give</GodhandButtonBase>
                      </form>
                      <div className="debug-quick-buttons">
                        <GodhandButtonBase
                          type="button"
                          onClick={() => {
                            onExecute('fill max')
                          }}
                        >
                          Max All
                        </GodhandButtonBase>
                        <GodhandButtonBase
                          type="button"
                          onClick={() => {
                            onExecute('fill half')
                          }}
                        >
                          Half All
                        </GodhandButtonBase>
                        <GodhandButtonBase
                          type="button"
                          onClick={() => {
                            onExecute('capacity infinite')
                          }}
                        >
                          Infinite Capacity
                        </GodhandButtonBase>
                      </div>
                    </>
                  )}
                  {category.id === 'worldgen' ? (
                    <form className="debug-seed-form" onSubmit={submitSeed}>
                      <input
                        value={seedInput}
                        placeholder="seed"
                        onChange={(event) => {
                          setSeedInput(event.target.value)
                        }}
                      />
                      <GodhandButtonBase type="submit">Set Seed</GodhandButtonBase>
                    </form>
                  ) : null}
                </>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="window-section-head debug-section-head">
        <h3 className="window-section-title">Command Console</h3>
        <span className="window-section-meta">Use &quot;help&quot; for command list</span>
      </div>
      <DebugConsole entries={entries} onExecute={onExecute} onClear={onClear} />
    </FloatingWindow>
  )
}

const DebugFloatingWindow = memo(DebugFloatingWindowComponent)
DebugFloatingWindow.displayName = 'DebugFloatingWindow'

export default DebugFloatingWindow
