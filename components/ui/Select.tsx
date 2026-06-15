import type React from 'react'
import { IconChevronDown } from '../icons'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export function Select({ invalid = false, className = '', children, ...rest }: SelectProps) {
  return (
    <span className={`relative inline-flex ${className}`}>
      <select
        className={`h-10 w-full cursor-pointer appearance-none rounded-md border bg-surface
          pl-3 pr-9 text-sm text-ink outline-none transition-shadow duration-100
          disabled:bg-neutral-100 disabled:text-ink-muted
          ${invalid
            ? 'border-error shadow-ring-error'
            : 'border-line-strong focus:border-accent focus:shadow-ring'}`}
        {...rest}
      >
        {children}
      </select>
      <IconChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
      />
    </span>
  )
}
