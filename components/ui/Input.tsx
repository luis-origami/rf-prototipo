import type React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

/* 13px como todos os controles (SearchInput, Select, dropdowns) — um único
   tamanho de fonte de input em todas as telas, base: filtros de cobranças */
export function Input({ invalid = false, className = '', ...rest }: InputProps) {
  return (
    <input
      className={`h-10 rounded-md border bg-surface px-3 text-sm text-ink outline-none
        placeholder:text-ink-muted transition-shadow duration-100
        disabled:bg-neutral-100 disabled:text-ink-muted
        ${invalid
          ? 'border-error shadow-ring-error'
          : 'border-line-strong focus:border-accent focus:shadow-ring'}
        ${className}`}
      {...rest}
    />
  )
}
