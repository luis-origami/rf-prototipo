'use client'

import { useEffect, useRef, useState } from 'react'
import { MESES_SERIE, rotuloMesLongo } from '../../../../mocks'
import { IconCalendar, IconChevronDown, IconCheck } from '../../../../components/icons'

/* Seletor de mês de referência dos KPIs "do mês" (recebido na data correta,
   dias médios de atraso, % recebido). Lista os 12 meses da série, do mais
   recente ao mais antigo; o mês corrente (parcial) é marcado. Padrão: último
   mês fechado — números estáveis para a leitura à diretoria. */

// mais recente primeiro
const OPCOES = [...MESES_SERIE].reverse()
const MES_CORRENTE = MESES_SERIE[MESES_SERIE.length - 1]

interface MesSelectProps {
  value: string
  onChange: (mes: string) => void
}

export function MesSelect({ value, onChange }: MesSelectProps) {
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
        aria-label="Mês de referência"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 items-center gap-2 rounded-md border border-line-strong
          bg-surface px-3 text-sm font-medium text-ink transition-colors duration-100
          hover:bg-neutral-100 focus-ring"
      >
        <IconCalendar size={15} className="shrink-0 text-ink-muted" />
        <span className="max-w-44 truncate">{rotuloMesLongo(value)}</span>
        <IconChevronDown
          size={14}
          className={`shrink-0 text-ink-muted transition-transform duration-100 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+6px)] z-50 max-h-72 min-w-full overflow-auto
            rounded-lg border border-line-strong bg-surface p-2 shadow-md"
        >
          {OPCOES.map((opcao) => {
            const ativa = opcao === value
            const corrente = opcao === MES_CORRENTE
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
                  ${ativa ? 'bg-primary-50 font-medium' : ''}`}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center text-accent">
                  {ativa && <IconCheck size={13} />}
                </span>
                {rotuloMesLongo(opcao)}
                {corrente && <span className="label-mono ml-auto pl-3 text-ink-muted">parcial</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
