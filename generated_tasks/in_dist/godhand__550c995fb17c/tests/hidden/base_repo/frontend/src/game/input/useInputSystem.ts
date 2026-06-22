import { useEffect, useMemo } from 'react'
import { InputSystem } from './system'

export function useInputSystem(): InputSystem {
  const input = useMemo(() => new InputSystem(), [])

  useEffect(() => {
    input.attach()
    return () => {
      input.detach()
    }
  }, [input])

  return input
}
