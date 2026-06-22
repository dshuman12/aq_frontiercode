import { memo, useSyncExternalStore } from 'react'
import type { HoverInspectorStore } from './hoverInspectorStore'

type CanvasHoverOverlayProps = {
  store: HoverInspectorStore | null | undefined
}

function CanvasHoverOverlayComponent({ store }: CanvasHoverOverlayProps) {
  const hoverInspector = useSyncExternalStore(
    store?.subscribe ?? (() => () => {}),
    store?.getSnapshot ?? (() => null),
    store?.getSnapshot ?? (() => null),
  )

  return (
    <div className="canvas-hover-overlay">
      {hoverInspector ? (
        <>
          <div className="canvas-hover-title">{hoverInspector.title}</div>
          {hoverInspector.lines.map((line, index) => (
            <div key={`${line}-${index}`} className="canvas-hover-line">
              {line}
            </div>
          ))}
          {hoverInspector.meter ? (
            <div className="canvas-hover-meter">
              <div className="canvas-hover-meter-label">
                {hoverInspector.meter.label}{' '}
                {hoverInspector.meter.displayText ?? `${Math.ceil(Math.max(0, hoverInspector.meter.value))}s`}
              </div>
              <div className="canvas-hover-meter-track" aria-hidden="true">
                <span
                  className="canvas-hover-meter-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, (hoverInspector.meter.value / Math.max(0.001, hoverInspector.meter.max)) * 100),
                    )}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="canvas-hover-line">Hover a tile to inspect it.</div>
      )}
    </div>
  )
}

const CanvasHoverOverlay = memo(CanvasHoverOverlayComponent)
CanvasHoverOverlay.displayName = 'CanvasHoverOverlay'

export default CanvasHoverOverlay
