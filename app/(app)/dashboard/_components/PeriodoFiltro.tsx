'use client'

/* Filtro de período dos gráficos de série mensal — recorta a janela visível
   às últimas N posições da série de 12 meses. Controle compartilhado entre
   todos os gráficos que envolvem periodicidade, para leitura consistente. */

export type Periodo = 3 | 6 | 12

export const PERIODOS: Periodo[] = [3, 6, 12]

interface PeriodoFiltroProps {
  value: Periodo
  onChange: (periodo: Periodo) => void
}

export function PeriodoFiltro({ value, onChange }: PeriodoFiltroProps) {
  return (
    <div className="flex gap-1" role="group" aria-label="Período do gráfico">
      {PERIODOS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-pressed={value === p}
          aria-label={`Últimos ${p} meses`}
          className={`label-mono cursor-pointer rounded-full border px-2.5 py-0.5 outline-none
            transition-colors duration-100 focus-ring
            ${value === p
              ? 'border-accent bg-accent text-white'
              : 'border-line bg-transparent text-ink-muted hover:border-accent hover:text-ink'
            }`}
        >
          {p}M
        </button>
      ))}
    </div>
  )
}
