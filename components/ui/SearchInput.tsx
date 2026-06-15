'use client'

import { IconSearch, IconX } from '../icons'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({ value, onChange, placeholder = 'Buscar…', className = '' }: SearchInputProps) {
  return (
    <span className={`relative inline-flex ${className}`}>
      <IconSearch
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-line-strong bg-surface pl-9 pr-8 text-sm text-ink
          outline-none placeholder:text-ink-muted transition-shadow duration-100
          focus:border-accent focus:shadow-ring
          [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpar busca"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-ink-muted
            hover:text-ink focus-ring"
        >
          <IconX size={14} />
        </button>
      )}
    </span>
  )
}
