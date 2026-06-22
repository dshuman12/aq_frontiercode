import { useState, type FormEvent } from 'react'
import GodhandButtonBase from '../../../components/GodhandButtonBase'
import type { DebugConsoleEntry } from '../debug/types'

type DebugConsoleProps = {
  entries: DebugConsoleEntry[]
  onExecute: (input: string) => void
  onClear: () => void
}

export default function DebugConsole({ entries, onExecute, onClear }: DebugConsoleProps) {
  const [input, setInput] = useState('')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = input.trim()
    if (!value) return
    onExecute(value)
    setInput('')
  }

  return (
    <div className="debug-console">
      <form className="debug-console-input-row" onSubmit={submit}>
        <input
          value={input}
          placeholder="help"
          onChange={(event) => {
            setInput(event.target.value)
          }}
        />
        <GodhandButtonBase type="submit">Run</GodhandButtonBase>
        <GodhandButtonBase
          type="button"
          onClick={() => {
            onClear()
          }}
        >
          Clear
        </GodhandButtonBase>
      </form>

      <div className="debug-console-log">
        {entries.length === 0 ? (
          <div className="debug-console-line debug-console-line-info">
            No output yet. Try <code>help</code>.
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className={`debug-console-line debug-console-line-${entry.level}`}>
              {entry.message}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
