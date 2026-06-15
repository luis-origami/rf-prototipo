'use client'

import { useState, useRef, useEffect } from 'react'
import type React from 'react'
import { IconChevronDown, IconCheck } from '../icons'

export interface DropdownOption {
  value: string
  label: string
  /** renderização customizada da opção (ex.: badge de status) */
  render?: () => React.ReactNode
}

interface MultiSelectDropdownProps {
  selected: Set<string>
  onChange: (next: Set<string>) => void
  options: DropdownOption[]
  /** rótulo quando nada está selecionado (= todos) */
  placeholder: string
  /**
   * comportamento do "Todos": 'limpar' (filtros — vazio significa todos) ou
   * 'marcar' (seleção real — preenche/desmarca todos os valores)
   */
  todos?: 'limpar' | 'marcar'
  className?: string
}

export function MultiSelectDropdown({
  selected,
  onChange,
  options,
  placeholder,
  todos = 'limpar',
  className = '',
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const none = selected.size === 0
  const label = none
    ? placeholder
    : selected.size === 1
      ? (options.find((o) => o.value === [...selected][0])?.label ?? placeholder)
      : `${selected.size} selecionados`

  function toggle(value: string) {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange(next)
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 min-w-40 items-center justify-between gap-3 rounded-md border
          border-line-strong bg-surface px-3 text-sm transition-colors duration-100
          hover:bg-neutral-100 focus-ring"
      >
        <span className={none ? 'text-ink-muted' : 'font-medium text-ink'}>{label}</span>
        <IconChevronDown
          size={14}
          className={`shrink-0 text-ink-muted transition-transform duration-100 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+6px)] z-50 max-h-64 min-w-full overflow-y-auto
            rounded-lg border border-line-strong bg-surface p-2 shadow-md"
        >
          <button
            type="button"
            onClick={() => {
              if (todos === 'marcar') {
                const todosMarcados = selected.size === options.length
                onChange(todosMarcados ? new Set() : new Set(options.map((o) => o.value)))
              } else {
                onChange(new Set())
              }
            }}
            className={`label-mono flex w-full items-center gap-3 rounded-md px-3 py-2 text-left
              text-ink-muted hover:bg-neutral-100
              ${(todos === 'marcar' ? selected.size === options.length : none) ? 'bg-neutral-100' : ''}`}
          >
            <CheckMark checked={todos === 'marcar' ? selected.size === options.length : none} />
            Todos
          </button>
          <div className="mx-3 my-1 h-px bg-line" />
          {options.map((opt) => {
            const checked = selected.has(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={`flex w-full items-center gap-3 whitespace-nowrap rounded-md px-3 py-2
                  text-left text-sm text-ink hover:bg-neutral-100 ${checked ? 'bg-primary-50' : ''}`}
              >
                <CheckMark checked={checked} />
                {opt.render ? opt.render() : opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CheckMark({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-[1.5px]
        transition-colors duration-100
        ${checked ? 'border-accent bg-accent text-white' : 'border-line-strong bg-transparent'}`}
    >
      {checked && <IconCheck size={10} />}
    </span>
  )
}
