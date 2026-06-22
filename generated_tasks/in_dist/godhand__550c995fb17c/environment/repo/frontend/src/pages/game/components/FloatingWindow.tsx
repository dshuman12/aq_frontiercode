import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import GodhandButtonBase from '../../../components/GodhandButtonBase'

type FloatingRect = {
  x: number
  y: number
  width: number
  height: number
}

type DragMode = 'drag' | 'resize'

type DragState = {
  mode: DragMode
  startClientX: number
  startClientY: number
  startRect: FloatingRect
}

type FloatingWindowProps = {
  title: string
  containerRef: RefObject<HTMLElement | null>
  initialRect: FloatingRect
  initialMinimized?: boolean
  showMinimize?: boolean
  resizable?: boolean
  minWidth?: number
  minHeight?: number
  zIndex?: number
  className?: string
  onClose?: () => void
  headerActions?: ReactNode
  minimizedContent?: ReactNode
  children: ReactNode
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.min(max, Math.max(min, value))
}

export default function FloatingWindow({
  title,
  containerRef,
  initialRect,
  initialMinimized = false,
  showMinimize = true,
  resizable = true,
  minWidth = 280,
  minHeight = 220,
  zIndex = 3,
  className,
  onClose,
  headerActions,
  minimizedContent,
  children,
}: FloatingWindowProps) {
  const [rect, setRect] = useState<FloatingRect>(initialRect)
  const [minimized, setMinimized] = useState(initialMinimized)
  const [activeDragMode, setActiveDragMode] = useState<DragMode | null>(null)

  const windowRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const hasUserInteractedRef = useRef(false)
  const toggleMinimized = useCallback(() => {
    setMinimized((current) => !current)
  }, [])

  const startInteraction = (mode: DragMode, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    if (mode === 'resize' && !resizable) return
    if (!containerRef.current || !windowRef.current) return

    hasUserInteractedRef.current = true
    dragStateRef.current = {
      mode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startRect: rect,
    }
    setActiveDragMode(mode)
    event.preventDefault()
    event.stopPropagation()
  }

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current
      if (!dragState) return

      const container = containerRef.current
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      const dx = event.clientX - dragState.startClientX
      const dy = event.clientY - dragState.startClientY

      if (dragState.mode === 'drag') {
        const panelRect = windowRef.current?.getBoundingClientRect()
        const panelWidth = panelRect?.width ?? dragState.startRect.width
        const panelHeight = panelRect?.height ?? dragState.startRect.height
        const maxX = Math.max(8, containerRect.width - panelWidth - 8)
        const maxY = Math.max(8, containerRect.height - panelHeight - 8)
        setRect((current) => ({
          ...current,
          x: clamp(dragState.startRect.x + dx, 8, maxX),
          y: clamp(dragState.startRect.y + dy, 8, maxY),
        }))
        return
      }

      const maxWidth = Math.max(minWidth, containerRect.width - dragState.startRect.x - 8)
      const maxHeight = Math.max(minHeight, containerRect.height - dragState.startRect.y - 8)
      setRect((current) => ({
        ...current,
        width: clamp(dragState.startRect.width + dx, minWidth, maxWidth),
        height: clamp(dragState.startRect.height + dy, minHeight, maxHeight),
      }))
    }

    const stopInteraction = () => {
      if (!dragStateRef.current) return
      dragStateRef.current = null
      setActiveDragMode(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopInteraction)
    window.addEventListener('pointercancel', stopInteraction)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopInteraction)
      window.removeEventListener('pointercancel', stopInteraction)
    }
  }, [containerRef, minHeight, minWidth])

  useEffect(() => {
    const clampToContainer = () => {
      const container = containerRef.current
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      setRect((current) => {
        const maxWidth = Math.max(minWidth, containerRect.width - 16)
        const width = clamp(current.width, minWidth, maxWidth)
        const maxHeight = Math.max(minHeight, containerRect.height - 16)
        const height = clamp(current.height, minHeight, maxHeight)
        const panelRect = windowRef.current?.getBoundingClientRect()
        const panelWidth = panelRect?.width ?? width
        const panelHeight = panelRect?.height ?? height
        const maxX = Math.max(8, containerRect.width - panelWidth - 8)
        const maxY = Math.max(8, containerRect.height - panelHeight - 8)
        const x = clamp(current.x, 8, maxX)
        const y = clamp(current.y, 8, maxY)

        if (x === current.x && y === current.y && width === current.width && height === current.height) {
          return current
        }
        return { ...current, x, y, width, height }
      })
    }

    clampToContainer()
    window.addEventListener('resize', clampToContainer)
    return () => {
      window.removeEventListener('resize', clampToContainer)
    }
  }, [containerRef, minHeight, minWidth, minimized])

  const style: CSSProperties = {
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: minimized ? 'fit-content' : `${rect.width}px`,
    maxWidth: minimized ? 'min(360px, calc(100% - 16px))' : undefined,
    height: minimized ? 'auto' : `${rect.height}px`,
    zIndex,
  }

  return (
    <section
      ref={windowRef}
      className={`floating-window sidebar-section ${
        activeDragMode ? 'floating-window-interacting' : ''
      } ${minimized ? 'floating-window-minimized' : ''} ${className ?? ''}`}
      style={style}
    >
      <div className="floating-window-header">
        <GodhandButtonBase
          type="button"
          className="floating-window-drag"
          title={minimized ? 'Drag (double-click to expand)' : 'Drag (double-click to minimize)'}
          onPointerDown={(event) => {
            startInteraction('drag', event)
          }}
          onDoubleClick={(event) => {
            if (event.button !== 0) return
            dragStateRef.current = null
            setActiveDragMode(null)
            event.preventDefault()
            event.stopPropagation()
            toggleMinimized()
          }}
        >
          {title}
        </GodhandButtonBase>
        <div className="floating-window-header-actions">
          {headerActions}
          {showMinimize ? (
            <GodhandButtonBase
              type="button"
              className="floating-window-header-icon"
              aria-label={minimized ? `Expand ${title}` : `Minimize ${title}`}
              title={minimized ? 'Expand' : 'Minimize'}
              onClick={toggleMinimized}
            >
              {minimized ? (
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10 3.5v13M3.5 10h13" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M3.5 10h13" />
                </svg>
              )}
            </GodhandButtonBase>
          ) : null}
          {onClose ? (
            <GodhandButtonBase
              type="button"
              className="floating-window-header-icon"
              aria-label={`Hide ${title}`}
              title="Hide"
              onClick={onClose}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </GodhandButtonBase>
          ) : null}
        </div>
      </div>

      {minimized ? <div className="floating-window-minimized-content">{minimizedContent}</div> : null}
      {!minimized ? <div className="floating-window-body">{children}</div> : null}

      {!minimized && resizable ? (
        <GodhandButtonBase
          type="button"
          className="floating-window-resize"
          aria-label={`Resize ${title}`}
          onPointerDown={(event) => {
            startInteraction('resize', event)
          }}
        >
          ↘
        </GodhandButtonBase>
      ) : null}
    </section>
  )
}
