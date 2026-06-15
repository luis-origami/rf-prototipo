import type React from 'react'

interface FieldProps {
  label: string
  htmlFor?: string
  helper?: string
  /** erro sempre em texto — nunca só cor (DS v5 slide 14) */
  error?: string
  children: React.ReactNode
}

export function Field({ label, htmlFor, helper, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <span className="text-xs font-medium text-error-fg">{error}</span>
      ) : helper ? (
        <span className="text-xs text-ink-muted">{helper}</span>
      ) : null}
    </div>
  )
}
