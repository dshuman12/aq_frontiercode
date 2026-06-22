import { forwardRef, type ButtonHTMLAttributes } from 'react'

type GodhandButtonBaseProps = ButtonHTMLAttributes<HTMLButtonElement>

const GodhandButtonBase = forwardRef<HTMLButtonElement, GodhandButtonBaseProps>(
  ({ className, ...props }, ref) => {
    const resolvedClassName = className
      ? `godhand-button-base ${className}`
      : 'godhand-button-base'

    return <button ref={ref} className={resolvedClassName} {...props} />
  },
)

GodhandButtonBase.displayName = 'GodhandButtonBase'

export default GodhandButtonBase
