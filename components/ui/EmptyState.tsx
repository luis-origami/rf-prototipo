import type React from 'react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  /** CTA opcional — voz sóbria, sem euforia */
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-line-strong
      bg-neutral-50 p-8 text-center text-ink-muted">
      {icon && <div className="mb-2 text-neutral-400">{icon}</div>}
      <h4 className="font-display text-lg font-semibold text-neutral-700">{title}</h4>
      {description && <p className="text-sm">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
