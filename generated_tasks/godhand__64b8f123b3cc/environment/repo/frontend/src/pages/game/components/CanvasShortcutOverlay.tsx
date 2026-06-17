import { memo } from 'react'

type CanvasShortcutOverlayProps = {
  shortcutText: string
}

function CanvasShortcutOverlayComponent({ shortcutText }: CanvasShortcutOverlayProps) {
  return <div className="canvas-shortcuts-overlay">{shortcutText}</div>
}

const CanvasShortcutOverlay = memo(CanvasShortcutOverlayComponent)
CanvasShortcutOverlay.displayName = 'CanvasShortcutOverlay'

export default CanvasShortcutOverlay
