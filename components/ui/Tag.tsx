import type React from 'react'
import { IconLock } from '../icons'

interface TagProps {
  children: React.ReactNode
  /** "source" marca origem de dado (Certtus) com cadeado — fato read-only */
  variant?: 'default' | 'source'
}

export function Tag({ children, variant = 'default' }: TagProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-xs font-medium
        bg-steel-50 text-steel-600 ${variant === 'source' ? 'border-steel-200' : 'border-steel-100'}`}
    >
      {variant === 'source' && <IconLock size={11} className="shrink-0" />}
      {children}
    </span>
  )
}
