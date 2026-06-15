'use client'

import { useEffect, useRef, useState } from 'react'
import { empresas, EMPRESA_FILTRO_LABEL, type EmpresaFiltro } from '../../../../mocks'
import { IconBuilding, IconChevronDown, IconCheck } from '../../../../components/icons'

/* Filtro de empresa do dashboard — dropdown local, em lugar de destaque no
   cabeçalho da tela. Alterar a empresa refiltra KPIs e gráficos do painel. */

const OPCOES: EmpresaFiltro[] = ['grupo', ...empresas.map((e) => e.id)]

interface EmpresaSelectProps {
  value: EmpresaFiltro
  onChange: (empresa: EmpresaFiltro) => void
}

export function EmpresaSelect({ value, onChange }: EmpresaSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Filtrar por empresa"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 items-center gap-2 rounded-md border border-line-strong
          bg-surface px-3 text-sm font-medium text-ink transition-colors duration-100
          hover:bg-neutral-100 focus-ring"
      >
        <IconBuilding size={15} className="shrink-0 text-ink-muted" />
        <span className="max-w-44 truncate">{EMPRESA_FILTRO_LABEL[value]}</span>
        <IconChevronDown
          size={14}
          className={`shrink-0 text-ink-muted transition-transform duration-100 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-full rounded-lg border
            border-line-strong bg-surface p-2 shadow-md"
        >
          {OPCOES.map((opcao) => {
            const ativa = opcao === value
            return (
              <button
                key={opcao}
                type="button"
                onClick={() => {
                  onChange(opcao)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-3 whitespace-nowrap rounded-md px-3 py-2
                  text-left text-sm text-ink hover:bg-neutral-100
                  ${ativa ? 'bg-primary-50 font-medium' : ''}
                  ${opcao === 'grupo' ? 'mb-1 border-b border-line pb-2.5' : ''}`}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center text-accent">
                  {ativa && <IconCheck size={13} />}
                </span>
                {EMPRESA_FILTRO_LABEL[opcao]}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
