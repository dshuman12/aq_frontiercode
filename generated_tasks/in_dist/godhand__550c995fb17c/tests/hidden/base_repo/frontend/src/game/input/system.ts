import type { InputAction } from './types'

const KEY_BINDINGS: Record<string, InputAction[]> = {
  w: ['move_up'],
  arrowup: ['move_up'],
  s: ['move_down'],
  arrowdown: ['move_down'],
  a: ['move_left'],
  arrowleft: ['move_left'],
  d: ['move_right'],
  arrowright: ['move_right'],
  b: ['toggle_placement'],
  escape: ['cancel_placement'],
  r: ['rotate_clockwise'],
}

type PressListener = (action: InputAction) => void

export class InputSystem {
  private attached = false
  private held = new Set<InputAction>()
  private listeners = new Set<PressListener>()

  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.isTextInput(event.target)) return
    if (event.ctrlKey || event.metaKey || event.altKey) return
    const key = event.key.toLowerCase()
    const actions = KEY_BINDINGS[key]
    if (!actions) return
    for (const action of actions) {
      const wasHeld = this.held.has(action)
      this.held.add(action)
      if (!wasHeld) {
        this.listeners.forEach((listener) => listener(action))
      }
    }
  }

  private handleKeyUp = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
    const actions = KEY_BINDINGS[key]
    if (!actions) return
    for (const action of actions) {
      this.held.delete(action)
    }
  }

  private isTextInput(target: EventTarget | null): boolean {
    const node = target as HTMLElement | null
    if (!node) return false
    const tag = node.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable
  }

  attach() {
    if (this.attached) return
    this.attached = true
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
    window.addEventListener('blur', this.reset)
  }

  detach() {
    if (!this.attached) return
    this.attached = false
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    window.removeEventListener('blur', this.reset)
    this.held.clear()
    this.listeners.clear()
  }

  private reset = () => {
    this.held.clear()
  }

  onPress(listener: PressListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  isHeld(action: InputAction): boolean {
    return this.held.has(action)
  }

  getMoveAxis(): { x: number; y: number } {
    const x = Number(this.isHeld('move_right')) - Number(this.isHeld('move_left'))
    const y = Number(this.isHeld('move_down')) - Number(this.isHeld('move_up'))
    return { x, y }
  }
}
