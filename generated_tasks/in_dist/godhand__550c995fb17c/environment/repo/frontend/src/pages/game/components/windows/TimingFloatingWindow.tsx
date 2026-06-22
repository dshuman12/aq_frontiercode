import { memo, type RefObject } from 'react'
import FloatingWindow from '../FloatingWindow'
import TimingGraphPanel from '../TimingGraphPanel'
import { useTimingHistorySnapshot, useTimingStoreSnapshot } from '../../state/timingStore'

type TimingFloatingWindowProps = {
  open: boolean
  containerRef: RefObject<HTMLDivElement | null>
  onClose: () => void
}

const TIMING_INITIAL_RECT = { x: 1030, y: 18, width: 520, height: 380 }

function TimingFloatingWindowComponent({
  open,
  containerRef,
  onClose,
}: TimingFloatingWindowProps) {
  if (!open) return null
  return <TimingFloatingWindowBody containerRef={containerRef} onClose={onClose} />
}

type TimingFloatingWindowBodyProps = {
  containerRef: RefObject<HTMLDivElement | null>
  onClose: () => void
}

function TimingFloatingWindowBody({ containerRef, onClose }: TimingFloatingWindowBodyProps) {
  const snapshot = useTimingStoreSnapshot()
  const history = useTimingHistorySnapshot()

  return (
    <FloatingWindow
      title="Timing"
      containerRef={containerRef}
      initialRect={TIMING_INITIAL_RECT}
      initialMinimized
      minWidth={420}
      minHeight={280}
      className="timing-floating-window"
      onClose={onClose}
      minimizedContent={
        <div className="recipe-minimized-summary">
          {snapshot.machines.length} machines · power {snapshot.power.allocated.toFixed(0)}/
          {snapshot.power.generated.toFixed(0)}
        </div>
      }
    >
      <TimingGraphPanel snapshot={snapshot} history={history} />
    </FloatingWindow>
  )
}

const TimingFloatingWindow = memo(TimingFloatingWindowComponent)
TimingFloatingWindow.displayName = 'TimingFloatingWindow'

export default TimingFloatingWindow
