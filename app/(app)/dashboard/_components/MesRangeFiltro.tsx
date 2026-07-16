'use client'

/* Filtro de meses dos gráficos de série mensal — intervalo De/Até em selects.
   Evolução do antigo PeriodoFiltro: em vez da janela "últimos N", recorta
   qualquer intervalo — inclusive meses à frente quando a série os tiver
   (ex.: previsto × recebido). */

const MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function rotuloMes(mes: string): string {
  const [ano, m] = mes.split('-')
  return `${MES_ABREV[Number(m) - 1]}/${ano.slice(2)}`
}

interface MesRangeFiltroProps {
  /** série completa disponível (YYYY-MM, ordenada do mais antigo ao mais novo) */
  meses: string[]
  de: string
  ate: string
  onChange: (de: string, ate: string) => void
}

export function MesRangeFiltro({ meses, de, ate, onChange }: MesRangeFiltroProps) {
  // De > Até nunca acontece: mudar um limite arrasta o outro se preciso
  function mudarDe(v: string) {
    onChange(v, v > ate ? v : ate)
  }
  function mudarAte(v: string) {
    onChange(v < de ? v : de, v)
  }

  const selectCls = `label-mono h-7 min-w-[5.75rem] cursor-pointer rounded-md border border-line
    bg-transparent py-0 pl-2.5 pr-1.5 text-ink outline-none transition-colors duration-100
    hover:border-accent focus-ring`

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* intervalo livre — qualquer mês da série, para frente e para trás */}
      <div className="flex items-center gap-1.5">
        <span className="label-mono text-ink-muted">De</span>
        <select
          aria-label="Mês inicial"
          value={de}
          onChange={(e) => mudarDe(e.target.value)}
          className={selectCls}
        >
          {meses.map((m) => (
            <option key={m} value={m}>
              {rotuloMes(m)}
            </option>
          ))}
        </select>
        <span className="label-mono text-ink-muted">até</span>
        <select
          aria-label="Mês final"
          value={ate}
          onChange={(e) => mudarAte(e.target.value)}
          className={selectCls}
        >
          {meses.map((m) => (
            <option key={m} value={m}>
              {rotuloMes(m)}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
