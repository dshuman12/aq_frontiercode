import { memo, type RefObject } from 'react'
import FloatingWindow from '../FloatingWindow'
import InventoryPanel, { InventoryMinimizedPins } from '../InventoryPanel'

type InventoryFloatingWindowProps = {
  open: boolean
  containerRef: RefObject<HTMLDivElement | null>
  pinnedResourceIds: string[]
  onTogglePin: (resource: string) => void
  onClose: () => void
}

const INVENTORY_INITIAL_RECT = { x: 18, y: 18, width: 360, height: 540 }

function InventoryFloatingWindowComponent({
  open,
  containerRef,
  pinnedResourceIds,
  onTogglePin,
  onClose,
}: InventoryFloatingWindowProps) {
  if (!open) return null

  return (
    <FloatingWindow
      title="Inventory"
      containerRef={containerRef}
      initialRect={INVENTORY_INITIAL_RECT}
      initialMinimized
      minWidth={290}
      minHeight={260}
      className="inventory-floating-window"
      onClose={onClose}
      minimizedContent={<InventoryMinimizedPins pinnedResourceIds={pinnedResourceIds} />}
    >
      <InventoryPanel pinnedResourceIds={pinnedResourceIds} onTogglePin={onTogglePin} />
    </FloatingWindow>
  )
}

const InventoryFloatingWindow = memo(InventoryFloatingWindowComponent)
InventoryFloatingWindow.displayName = 'InventoryFloatingWindow'

export default InventoryFloatingWindow
