import { memo, useMemo, type CSSProperties } from 'react'
import GodhandButtonBase from '../../../components/GodhandButtonBase'
import { MATERIAL_LABELS, MATERIAL_TYPES, ORE_TYPES, type Inventory } from '../../../game/engine'
import { ORE_VISUALS } from '../oreCatalog'
import { useEconomySelector } from '../state/economyStore'
import { useTimingStoreSnapshot } from '../state/timingStore'

type InventoryPanelProps = {
  pinnedResourceIds: string[]
  onTogglePin: (resource: string) => void
}

type InventoryMinimizedPinsProps = {
  pinnedResourceIds: string[]
}

function resourceLabel(resource: string): string {
  if (resource in ORE_VISUALS) return ORE_VISUALS[resource as keyof typeof ORE_VISUALS].label
  if (resource in MATERIAL_LABELS) return MATERIAL_LABELS[resource as keyof typeof MATERIAL_LABELS]
  return resource
}

const ORE_RESOURCE_SET = new Set<string>(ORE_TYPES as readonly string[])
const MATERIAL_RESOURCE_SET = new Set<string>(MATERIAL_TYPES as readonly string[])
const ORE_ROW_STYLES: Record<(typeof ORE_TYPES)[number], CSSProperties> = ORE_TYPES.reduce(
  (acc, ore) => {
    acc[ore] = {
      borderColor: ORE_VISUALS[ore].stroke,
      background: ORE_VISUALS[ore].glow,
    }
    return acc
  },
  {} as Record<(typeof ORE_TYPES)[number], CSSProperties>,
)
const MATERIAL_ROW_STYLE: CSSProperties = {
  borderColor: '#9ab8a0',
  background: '#f5faf5',
}

const InventoryPinChip = memo(function InventoryPinChip({ resourceId }: { resourceId: string }) {
  const { amount, storageCapacity } = useEconomySelector(
    (snapshot) => {
      if (ORE_RESOURCE_SET.has(resourceId)) {
        return {
          amount: snapshot.inventory[resourceId as keyof Inventory] ?? 0,
          storageCapacity: snapshot.storage.orePerResource,
        }
      }
      return {
        amount: snapshot.materials[resourceId] ?? 0,
        storageCapacity: snapshot.storage.materialPerResource,
      }
    },
    (left, right) => left.amount === right.amount && left.storageCapacity === right.storageCapacity,
  )

  return (
    <div key={resourceId} className="inventory-pin-chip" title={`${resourceLabel(resourceId)}: ${amount}`}>
      <span className="inventory-pin-name">{resourceLabel(resourceId)}</span>
      <span className="inventory-pin-value">{amount}/{storageCapacity}</span>
    </div>
  )
})

export const InventoryMinimizedPins = memo(function InventoryMinimizedPins({
  pinnedResourceIds,
}: InventoryMinimizedPinsProps) {
  return (
    <div className="inventory-minimized-shell">
      <div className="inventory-minimized-head">{pinnedResourceIds.length} pinned</div>
      {pinnedResourceIds.length === 0 ? (
        <div className="inventory-minimized-empty">Pin items for quick view.</div>
      ) : (
        <div className="inventory-minimized-pins">
          {pinnedResourceIds.map((resourceId) => (
            <InventoryPinChip key={resourceId} resourceId={resourceId} />
          ))}
        </div>
      )}
    </div>
  )
})

type InventoryResourceRowProps = {
  resourceId: string
  pinned: boolean
  onTogglePin: (resource: string) => void
}

const InventoryResourceRow = memo(function InventoryResourceRow({
  resourceId,
  pinned,
  onTogglePin,
}: InventoryResourceRowProps) {
  const resourceStat = useEconomySelector(
    (snapshot) => ({
      count: ORE_RESOURCE_SET.has(resourceId)
        ? (snapshot.inventory[resourceId as keyof Inventory] ?? 0)
        : (snapshot.materials[resourceId] ?? 0),
      capacity: ORE_RESOURCE_SET.has(resourceId)
        ? snapshot.storage.orePerResource
        : snapshot.storage.materialPerResource,
    }),
    (left, right) => left.count === right.count && left.capacity === right.capacity,
  )
  const rowStyle = ORE_RESOURCE_SET.has(resourceId)
    ? ORE_ROW_STYLES[resourceId as (typeof ORE_TYPES)[number]]
    : MATERIAL_ROW_STYLE

  return (
    <div className="resource-row" style={rowStyle}>
      <div className="resource-row-main">
        <span className="resource-row-label">{resourceLabel(resourceId)}</span>
        <span className="resource-row-count">
          {resourceStat.count}/{resourceStat.capacity}
        </span>
      </div>
      <GodhandButtonBase
        type="button"
        className={`pin-toggle ${pinned ? 'pin-toggle-active' : ''}`}
        aria-label={pinned ? `Unpin ${resourceLabel(resourceId)}` : `Pin ${resourceLabel(resourceId)}`}
        title={pinned ? 'Unpin' : 'Pin'}
        onClick={() => {
          onTogglePin(resourceId)
        }}
      >
        <span
          className={`pin-toggle-icon ${pinned ? 'pin-toggle-icon-off' : 'pin-toggle-icon-on'}`}
          aria-hidden="true"
        />
      </GodhandButtonBase>
    </div>
  )
}, (prev, next) => {
  return (
    prev.resourceId === next.resourceId &&
    prev.pinned === next.pinned
  )
})

function InventoryStorageStatus() {
  const storage = useEconomySelector(
    (snapshot) => ({
      storageBuildings: snapshot.storage.storageBuildings,
      orePerResource: snapshot.storage.orePerResource,
      materialPerResource: snapshot.storage.materialPerResource,
    }),
    (left, right) => {
      return (
        left.storageBuildings === right.storageBuildings &&
        left.orePerResource === right.orePerResource &&
        left.materialPerResource === right.materialPerResource
      )
    },
  )

  return (
    <div className="inventory-storage-status">
      storage {storage.storageBuildings} · ore cap {storage.orePerResource} · material cap{' '}
      {storage.materialPerResource}
    </div>
  )
}

function InventoryPowerStatus() {
  const timing = useTimingStoreSnapshot()
  return (
    <div className="inventory-storage-status">
      power {timing.power.allocated.toFixed(0)}/{timing.power.generated.toFixed(0)} · demand in coverage{' '}
      {timing.power.demandInCoverage.toFixed(0)} · surplus {timing.power.surplus.toFixed(0)}
      {timing.power.deficit > 0 ? ` · deficit ${timing.power.deficit.toFixed(0)}` : ''}
    </div>
  )
}

function InventoryPanelComponent({ pinnedResourceIds, onTogglePin }: InventoryPanelProps) {
  const pinnedSet = useMemo(() => new Set(pinnedResourceIds), [pinnedResourceIds])
  const orePinnedCount = useMemo(
    () => pinnedResourceIds.filter((resourceId) => ORE_RESOURCE_SET.has(resourceId)).length,
    [pinnedResourceIds],
  )
  const materialPinnedCount = useMemo(
    () => pinnedResourceIds.filter((resourceId) => MATERIAL_RESOURCE_SET.has(resourceId)).length,
    [pinnedResourceIds],
  )

  return (
    <div className="inventory-panel">
      <InventoryStorageStatus />
      <InventoryPowerStatus />

      <section className="inventory-section">
        <div className="window-section-head">
          <h3 className="window-section-title">Ore Storage</h3>
          <span className="window-section-meta">{orePinnedCount} pinned</span>
        </div>
        <div className="resource-list">
          {ORE_TYPES.map((ore) => (
            <InventoryResourceRow
              key={ore}
              resourceId={ore}
              pinned={pinnedSet.has(ore)}
              onTogglePin={onTogglePin}
            />
          ))}
        </div>
      </section>

      <section className="inventory-section">
        <div className="window-section-head">
          <h3 className="window-section-title">Materials</h3>
          <span className="window-section-meta">{materialPinnedCount} pinned</span>
        </div>
        <div className="material-list">
          {MATERIAL_TYPES.map((material) => (
            <InventoryResourceRow
              key={material}
              resourceId={material}
              pinned={pinnedSet.has(material)}
              onTogglePin={onTogglePin}
            />
          ))}
        </div>
      </section>

    </div>
  )
}

const InventoryPanel = memo(InventoryPanelComponent)
InventoryPanel.displayName = 'InventoryPanel'

export default InventoryPanel
