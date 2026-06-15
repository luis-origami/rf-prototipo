import type React from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export function Textarea({ invalid = false, className = '', ...rest }: TextareaProps) {
  return (
    <textarea
      className={`min-h-24 rounded-md border bg-surface px-3 py-2 text-sm leading-relaxed text-ink
        outline-none placeholder:text-ink-muted transition-shadow duration-100
        disabled:bg-neutral-100 disabled:text-ink-muted
        ${invalid
          ? 'border-error shadow-ring-error'
          : 'border-line-strong focus:border-accent focus:shadow-ring'}
        ${className}`}
      {...rest}
    />
  )
}
