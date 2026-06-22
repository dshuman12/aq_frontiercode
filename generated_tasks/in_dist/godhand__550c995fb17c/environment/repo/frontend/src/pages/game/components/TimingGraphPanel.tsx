import { MATERIAL_LABELS } from '../../../game/engine'
import { ORE_VISUALS } from '../oreCatalog'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import type { TimingSnapshot } from './GameCanvas'
import type { TimingHistorySnapshot } from '../state/timingStore'

type TimingGraphPanelProps = {
  snapshot: TimingSnapshot
  history: TimingHistorySnapshot
}

const MAX_RESOURCE_SERIES = 6
const MAX_GRAPH_POINTS = 700
const GRAPH_HEIGHT = 190
const GRAPH_MIN_WIDTH = 300
const LINE_COLORS = ['#2f7056', '#6d8f42', '#87703a', '#81553b', '#476c83', '#6d5a8f', '#3c7f77', '#7b4e64'] as const

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function buildLabel(buildId: string): string {
  return buildId
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function resourceLabel(resourceId: string): string {
  if (resourceId === '__power_generated') return 'Power Generated'
  if (resourceId === '__power_consumed') return 'Power Used'
  const ore = (ORE_VISUALS as Record<string, { label: string }>)[resourceId]
  if (ore?.label) return ore.label
  const material = (MATERIAL_LABELS as Record<string, string>)[resourceId]
  if (material) return material
  return resourceId
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatRate(value: number): string {
  if (value >= 100) return `${value.toFixed(0)}/s`
  if (value >= 10) return `${value.toFixed(1)}/s`
  return `${value.toFixed(2)}/s`
}

function formatElapsedSeconds(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(rounded / 60)
  const remainder = rounded % 60
  return `${minutes}:${remainder.toString().padStart(2, '0')}`
}

function formatFromNow(deltaSec: number): string {
  const rounded = Math.max(0, Math.round(deltaSec))
  if (rounded === 0) return 'now'
  return `-${formatElapsedSeconds(rounded)}`
}

function toNiceAxisMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1
  if (value <= 0.25) return 0.25
  if (value <= 0.5) return 0.5
  const exponent = Math.pow(10, Math.floor(Math.log10(value)))
  const normalized = value / exponent
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return nice * exponent
}

function downsamplePoints<T>(points: T[], maxPoints: number): T[] {
  if (points.length <= maxPoints) return points
  const step = Math.ceil(points.length / maxPoints)
  const sampled: T[] = []
  for (let index = 0; index < points.length; index += step) {
    sampled.push(points[index])
  }
  const last = points[points.length - 1]
  if (sampled[sampled.length - 1] !== last) sampled.push(last)
  return sampled
}

function buildLinearSplits(min: number, max: number, count: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || count <= 1) return [min, max]
  if (max <= min) return [min, max]
  const splits: number[] = []
  for (let index = 0; index < count; index += 1) {
    const ratio = index / (count - 1)
    splits.push(min + (max - min) * ratio)
  }
  return splits
}

function formatRateAxisTick(value: number, maxValue: number): string {
  if (maxValue >= 10) return value.toFixed(0)
  if (maxValue >= 1) return value.toFixed(1)
  return value.toFixed(2)
}

function TimingGraphPanelComponent({ snapshot, history }: TimingGraphPanelProps) {
  const graphHostRef = useRef<HTMLDivElement | null>(null)
  const chartRootRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<uPlot | null>(null)
  const chartLayoutKeyRef = useRef('')

  const [graphWidth, setGraphWidth] = useState(460)
  const [hoverPointIndex, setHoverPointIndex] = useState<number | null>(null)

  useEffect(() => {
    const node = graphHostRef.current
    if (!node) return

    const updateSize = () => {
      const width = Math.max(GRAPH_MIN_WIDTH, Math.floor(node.clientWidth))
      setGraphWidth((current) => (current === width ? current : width))
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(
    () => () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
        chartLayoutKeyRef.current = ''
      }
    },
    [],
  )

  const windowSeconds = Math.max(1, Math.round(history.windowSeconds || 300))
  const points = history.points
  const windowEndSec = history.lastTimestampSec > 0 ? history.lastTimestampSec : snapshot.timestampSec
  const joinTimestampSec = history.joinTimestampSec ?? windowEndSec
  const elapsedSinceJoinSec = Math.max(0, windowEndSec - joinTimestampSec)
  const warmupWindow = elapsedSinceJoinSec < windowSeconds
  const chartRangeStartSec = warmupWindow ? joinTimestampSec : windowEndSec - windowSeconds
  const chartRangeEndSec = warmupWindow ? joinTimestampSec + windowSeconds : windowEndSec
  const trimmedPoints = useMemo(
    () => points.filter((point) => point.timestampSec >= chartRangeStartSec && point.timestampSec <= windowEndSec),
    [chartRangeStartSec, points, windowEndSec],
  )
  const sampledPoints = useMemo(() => downsamplePoints(trimmedPoints, MAX_GRAPH_POINTS), [trimmedPoints])

  const visibleResources = useMemo(() => {
    const stats = new Map<string, { peak: number; last: number }>()
    for (const point of trimmedPoints) {
      for (const [resource, rate] of Object.entries(point.outputRateByResource)) {
        const existing = stats.get(resource) ?? { peak: 0, last: 0 }
        if (rate > existing.peak) existing.peak = rate
        stats.set(resource, existing)
      }
    }

    const latestRates = trimmedPoints.length > 0 ? trimmedPoints[trimmedPoints.length - 1].outputRateByResource : {}
    for (const [resource, stat] of stats.entries()) {
      stat.last = latestRates[resource] ?? 0
    }

    return [...stats.entries()]
      .filter(([, stat]) => stat.peak > 1e-6)
      .sort((left, right) => {
        if (right[1].peak !== left[1].peak) return right[1].peak - left[1].peak
        if (right[1].last !== left[1].last) return right[1].last - left[1].last
        return left[0].localeCompare(right[0])
      })
      .slice(0, MAX_RESOURCE_SERIES)
      .map(([resource]) => resource)
  }, [trimmedPoints])

  const resourceSeries = useMemo(
    () =>
      visibleResources.map((resource, index) => ({
        resource,
        label: resourceLabel(resource),
        color: LINE_COLORS[index % LINE_COLORS.length],
      })),
    [visibleResources],
  )

  const yAxisMax = useMemo(() => {
    let maxOutput = 0
    for (const point of trimmedPoints) {
      for (const resource of visibleResources) {
        const rate = point.outputRateByResource[resource] ?? 0
        if (rate > maxOutput) maxOutput = rate
      }
    }
    return toNiceAxisMax(maxOutput)
  }, [trimmedPoints, visibleResources])

  const chartData = useMemo<uPlot.AlignedData>(() => {
    const xValues = sampledPoints.map((point) => point.timestampSec)
    const ySeries = visibleResources.map((resource) =>
      sampledPoints.map((point) => point.outputRateByResource[resource] ?? 0),
    )
    return [xValues, ...ySeries]
  }, [sampledPoints, visibleResources])

  const chartLayoutKey = useMemo(
    () => `${graphWidth}:${resourceSeries.map((series) => series.resource).join('|')}`,
    [graphWidth, resourceSeries],
  )
  const yAxisTicks = useMemo(() => buildLinearSplits(0, yAxisMax, 5), [yAxisMax])
  const xAxisTicks = useMemo(
    () => buildLinearSplits(chartRangeStartSec, Math.max(chartRangeStartSec + 1, chartRangeEndSec), 6),
    [chartRangeEndSec, chartRangeStartSec],
  )

  useEffect(() => {
    const chartRoot = chartRootRef.current
    if (!chartRoot) return

    if (chartData[0].length === 0) {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
        chartLayoutKeyRef.current = ''
      }
      setHoverPointIndex((current) => (current === null ? current : null))
      return
    }

    const rangeStartSec = chartRangeStartSec
    const rangeEndSec = Math.max(chartRangeStartSec + 1, chartRangeEndSec)
    const xAxisLabelFormatter = (_self: uPlot, values: number[]) =>
      values.map((value) => {
        if (value > windowEndSec + 0.001) return ''
        return formatFromNow(windowEndSec - value)
      })
    const yAxisLabelFormatter = (_self: uPlot, values: number[]) =>
      values.map((value) => formatRateAxisTick(value, yAxisMax))

    const options: uPlot.Options = {
      width: graphWidth,
      height: GRAPH_HEIGHT,
      class: 'timing-uplot',
      legend: { show: false },
      cursor: {
        x: true,
        y: true,
        lock: false,
        points: { show: false },
        drag: { x: false, y: false, setScale: false },
      },
      hooks: {
        setCursor: [
          (plot) => {
            const cursorIndex = typeof plot.cursor.idx === 'number' ? plot.cursor.idx : null
            setHoverPointIndex((current) => (current === cursorIndex ? current : cursorIndex))
          },
        ],
      },
      scales: {
        x: {
          time: false,
          auto: false,
          range: [rangeStartSec, rangeEndSec],
        },
        y: {
          auto: false,
          range: [0, yAxisMax],
        },
      },
      axes: [
        {
          stroke: '#6d877a',
          grid: { stroke: 'rgba(109, 135, 122, 0.28)', width: 1 },
          splits: xAxisTicks,
          values: xAxisLabelFormatter,
          size: 30,
          font: '11px "Techno Codex", "Raglan Punch", sans-serif',
        },
        {
          stroke: '#6d877a',
          grid: { stroke: 'rgba(109, 135, 122, 0.28)', width: 1 },
          splits: yAxisTicks,
          values: yAxisLabelFormatter,
          size: 44,
          font: '11px "Techno Codex", "Raglan Punch", sans-serif',
        },
      ],
      series: [
        {},
        ...resourceSeries.map((series) => ({
          label: series.label,
          stroke: series.color,
          width: 2.2,
          value: (_plot: uPlot, value: number | null) => formatRate(Number(value) || 0),
        })),
      ],
    }

    const currentChart = chartRef.current
    if (!currentChart || chartLayoutKeyRef.current !== chartLayoutKey) {
      currentChart?.destroy()
      chartRoot.innerHTML = ''
      chartRef.current = new uPlot(options, chartData, chartRoot)
      chartLayoutKeyRef.current = chartLayoutKey
      return
    }

    currentChart.setData(chartData, false)
    currentChart.batch(() => {
      currentChart.setScale('x', { min: rangeStartSec, max: rangeEndSec })
      currentChart.setScale('y', { min: 0, max: yAxisMax })
    }, true)
  }, [
    chartRangeEndSec,
    chartRangeStartSec,
    chartData,
    chartLayoutKey,
    graphWidth,
    resourceSeries,
    windowEndSec,
    xAxisTicks,
    yAxisMax,
    yAxisTicks,
  ])

  useEffect(() => {
    setHoverPointIndex((current) => {
      if (current === null) return null
      return current >= 0 && current < sampledPoints.length ? current : null
    })
  }, [sampledPoints.length])

  const activeHoverIndex =
    hoverPointIndex !== null && hoverPointIndex >= 0 && hoverPointIndex < sampledPoints.length ? hoverPointIndex : null
  const hoverPoint = activeHoverIndex !== null ? sampledPoints[activeHoverIndex] : null
  const latestPoint = sampledPoints.length > 0 ? sampledPoints[sampledPoints.length - 1] : null
  const hoverDeltaSec = hoverPoint ? Math.max(0, windowEndSec - hoverPoint.timestampSec) : 0
  const hoverPositionPercent =
    hoverPoint && chartRangeEndSec > chartRangeStartSec
      ? clamp(
          ((hoverPoint.timestampSec - chartRangeStartSec) / (chartRangeEndSec - chartRangeStartSec)) * 100,
          6,
          94,
        )
      : null

  const activeMachines = snapshot.machines.filter((machine) => machine.status === 'crafting').length
  const averageUtilPercent =
    snapshot.machines.length > 0
      ? Math.round(
          (snapshot.machines.reduce((sum, machine) => sum + machine.utilization, 0) / snapshot.machines.length) * 100,
        )
      : 0

  return (
    <div className="timing-panel">
      <div className="window-section-head">
        <h3 className="window-section-title">Production Timing</h3>
        <span className="window-section-meta">Last {formatElapsedSeconds(windowSeconds)} rolling window</span>
      </div>

      <div className="timing-summary">
        <span>belt speed {snapshot.beltCellsPerSecond.toFixed(1)} cells/s</span>
        <span>belts {snapshot.belts}</span>
        <span>items in transit {snapshot.itemsInTransit}</span>
        <span>power {snapshot.power.allocated.toFixed(0)}/{snapshot.power.generated.toFixed(0)}</span>
        <span>power deficit {snapshot.power.deficit.toFixed(0)}</span>
        <span>active machines {activeMachines}/{snapshot.machines.length}</span>
        <span>avg utilization {averageUtilPercent}%</span>
      </div>

      <div className="timing-graph-wrap" ref={graphHostRef}>
        {chartData[0].length === 0 ? (
          <div className="timing-empty">Collecting production telemetry...</div>
        ) : (
          <div ref={chartRootRef} />
        )}

        {hoverPoint && hoverPositionPercent !== null ? (
          <div className="timing-hover-card" style={{ left: `${hoverPositionPercent}%` }}>
            <div className="timing-hover-time">{formatFromNow(hoverDeltaSec)}</div>
            {resourceSeries.length === 0 ? (
              <div className="timing-hover-row">
                <span className="timing-hover-key">output</span>
                <span className="timing-hover-value">none</span>
              </div>
            ) : (
              resourceSeries.map((series) => (
                <div key={`hover-row-${series.resource}`} className="timing-hover-row">
                  <span className="timing-hover-key" style={{ color: series.color }}>
                    {series.label}
                  </span>
                  <span className="timing-hover-value">{formatRate(hoverPoint.outputRateByResource[series.resource] ?? 0)}</span>
                </div>
              ))
            )}
          </div>
        ) : null}

        <div className="timing-legend">
          {resourceSeries.length === 0 ? (
            <span className="timing-legend-empty">No production output yet.</span>
          ) : (
            resourceSeries.map((series) => {
              const latestRate = latestPoint?.outputRateByResource[series.resource] ?? 0
              return (
                <span key={`legend-${series.resource}`} className="timing-legend-chip" style={{ borderColor: series.color }}>
                  <span className="timing-legend-swatch" style={{ backgroundColor: series.color }} />
                  <span>{series.label}</span>
                  <span className="timing-legend-value">{formatRate(latestRate)}</span>
                </span>
              )
            })
          )}
        </div>
      </div>

      <div className="window-section-head timing-machines-head">
        <h3 className="window-section-title">Machine Breakdown</h3>
        <span className="window-section-meta">{snapshot.machines.length} machines</span>
      </div>
      <div className="timing-machine-list">
        {snapshot.machines.length === 0 ? (
          <div className="timing-empty">Place a processing unit to see per-machine timings.</div>
        ) : (
          snapshot.machines.map((machine) => (
            <article key={machine.id} className="timing-machine-card">
              <div className="timing-machine-head">
                <span>{buildLabel(machine.buildId)}</span>
                <span>{machine.recipeId ?? 'no recipe'}</span>
                <span>{machine.status}</span>
              </div>
              <div className="timing-machine-meta">
                cycle {machine.cycleSec.toFixed(2)}s · output {machine.outputPerSecond.toFixed(2)}/s · output lanes{' '}
                {machine.outputLanes}
              </div>
              <div className="timing-machine-meta">configured input lanes {machine.inputLanes}</div>
              {machine.inputs.length > 0 ? (
                <div className="timing-input-list">
                  {machine.inputs.map((input) => {
                    const enoughLanes = input.lanes >= input.lanesForOptimal
                    return (
                      <div
                        key={`${machine.id}-${input.resource}`}
                        className={`timing-input-row ${enoughLanes ? 'timing-input-ok' : 'timing-input-needs'}`}
                      >
                        <span>{input.resource}</span>
                        <span>{input.amountPerCycle}/cycle</span>
                        <span>
                          lanes {input.lanes} · optimal {input.lanesForOptimal}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="timing-machine-meta">No recipe inputs yet.</div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  )
}

const TimingGraphPanel = memo(TimingGraphPanelComponent)
TimingGraphPanel.displayName = 'TimingGraphPanel'

export default TimingGraphPanel
