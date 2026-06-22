import { memo, type RefObject } from 'react'
import FloatingWindow from '../FloatingWindow'
import {
  DEFAULT_MULTIPLAYER_OVERLAY_SETTINGS,
  type MultiplayerOverlaySettings,
} from '../../multiplayer/types'

type SettingsFloatingWindowProps = {
  open: boolean
  containerRef: RefObject<HTMLDivElement | null>
  settings: MultiplayerOverlaySettings
  performanceHudEnabled: boolean
  onChange: (next: MultiplayerOverlaySettings) => void
  onTogglePerformanceHud: (enabled: boolean) => void
  onClose: () => void
}

const SETTINGS_INITIAL_RECT = { x: 410, y: 22, width: 350, height: 308 }

function SettingsFloatingWindowComponent({
  open,
  containerRef,
  settings,
  performanceHudEnabled,
  onChange,
  onTogglePerformanceHud,
  onClose,
}: SettingsFloatingWindowProps) {
  if (!open) return null

  return (
    <FloatingWindow
      title="Settings"
      containerRef={containerRef}
      initialRect={SETTINGS_INITIAL_RECT}
      minWidth={280}
      minHeight={180}
      className="settings-floating-window"
      onClose={onClose}
    >
      <div className="settings-window-content">
        <div className="window-section-head">
          <h3 className="window-section-title settings-window-title">Multiplayer Overlays</h3>
        </div>
        <label className="settings-toggle-row">
          <input
            type="checkbox"
            checked={settings.showPeerCursors}
            onChange={(event) => {
              onChange({
                ...settings,
                showPeerCursors: event.target.checked,
              })
            }}
          />
          <span className="settings-toggle-copy">
            <span className="settings-toggle-title">Show other players&apos; cursors</span>
            <span className="settings-toggle-description">Display live cursor positions from teammates.</span>
          </span>
        </label>
        <label className="settings-toggle-row">
          <input
            type="checkbox"
            checked={settings.showPeerPlacementHints}
            onChange={(event) => {
              onChange({
                ...settings,
                showPeerPlacementHints: event.target.checked,
              })
            }}
          />
          <span className="settings-toggle-copy">
            <span className="settings-toggle-title">Show placement previews</span>
            <span className="settings-toggle-description">
              Display the block and direction other players are preparing to place.
            </span>
          </span>
        </label>
        <label className="settings-toggle-row">
          <input
            type="checkbox"
            checked={settings.showPeerNames}
            onChange={(event) => {
              onChange({
                ...settings,
                showPeerNames: event.target.checked,
              })
            }}
          />
          <span className="settings-toggle-copy">
            <span className="settings-toggle-title">Show player names</span>
            <span className="settings-toggle-description">Display usernames near cursor/placement indicators.</span>
          </span>
        </label>
        <label className="settings-slider-row">
          <span className="settings-slider-header">
            <span className="settings-toggle-title">Presence marker scale</span>
            <span className="settings-slider-value">{Math.round(settings.presenceScale * 100)}%</span>
          </span>
          <input
            type="range"
            min={60}
            max={160}
            step={5}
            value={Math.round(settings.presenceScale * 100)}
            onChange={(event) => {
              const value = Number(event.target.value)
              onChange({
                ...settings,
                presenceScale: Math.min(1.6, Math.max(0.6, value / 100)),
              })
            }}
          />
        </label>
        <button
          type="button"
          className="settings-reset-button"
          onClick={() => {
            onChange(DEFAULT_MULTIPLAYER_OVERLAY_SETTINGS)
          }}
        >
          Reset overlay defaults
        </button>

        <div className="window-section-head">
          <h3 className="window-section-title settings-window-title">Performance HUD</h3>
        </div>
        <label className="settings-toggle-row">
          <input
            type="checkbox"
            checked={performanceHudEnabled}
            onChange={(event) => {
              onTogglePerformanceHud(event.target.checked)
            }}
          />
          <span className="settings-toggle-copy">
            <span className="settings-toggle-title">Show diagnostics in sidebar</span>
            <span className="settings-toggle-description">
              Display FPS, frame timings, ping, and packet counters under the nav buttons.
            </span>
          </span>
        </label>
      </div>
    </FloatingWindow>
  )
}

const SettingsFloatingWindow = memo(SettingsFloatingWindowComponent)
SettingsFloatingWindow.displayName = 'SettingsFloatingWindow'

export default SettingsFloatingWindow
