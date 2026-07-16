'use client'

/* Filtro de meses dos gráficos de série mensal — intervalo De/Até em selects
   + atalhos 3M/6M/12M (últimos N meses até o mês-âncora). Evolução do antigo
   PeriodoFiltro: além da janela "últimos N", recorta qualquer intervalo —
   inclusive meses à frente quando a série os tiver (ex.: previsto × recebido). */

const MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function rotuloMes(mes: string): string {
  const [ano, m] = mes.split('-')
  return `${MES_ABREV[Number(m) - 1]}/${ano.slice(2)}`
}

const ATALHOS = [3, 6, 12] as const

interface MesRangeFiltroProps {
  /** série completa disponível (YYYY-MM, ordenada do mais antigo ao mais novo) */
  meses: string[]
  de: string
  ate: string
  onChange: (de: string, ate: string) => void
  /** mês-âncora dos atalhos NM — padrão: último mês da série */
  ancora?: string
}

export function MesRangeFiltro({ meses, de, ate, onChange, ancora }: MesRangeFiltroProps) {
  const ancoraIdx = (() => {
    const i = ancora ? meses.indexOf(ancora) : -1
    return i >= 0 ? i : meses.length - 1
  })()

  function rangeAtalho(n: number): [string, string] {
    return [meses[Math.max(0, ancoraIdx - (n - 1))], meses[ancoraIdx]]
  }

  // De > Até nunca acontece: mudar um limite arrasta o outro se preciso
  function mudarDe(v: string) {
    onChange(v, v > ate ? v : ate)
  }
  function mudarAte(v: string) {
    onChange(v < de ? v : de, v)
  }

  const selectCls = `label-mono h-7 cursor-pointer rounded-md border border-line
    bg-transparent px-1.5 text-ink outline-none transition-colors duration-100
    hover:border-accent focus-ring`

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* atalhos — últimos N meses até a âncora */}
      <div className="flex gap-1" role="group" aria-label="Atalhos de período">
        {ATALHOS.map((n) => {
          const [aDe, aAte] = rangeAtalho(n)
          const ativo = de === aDe && ate === aAte
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(aDe, aAte)}
              aria-pressed={ativo}
              aria-label={`Últimos ${n} meses`}
              className={`label-mono cursor-pointer rounded-full border px-2.5 py-0.5 outline-none
                transition-colors duration-100 focus-ring
                ${ativo
                  ? 'border-accent bg-accent text-white'
                  : 'border-line bg-transparent text-ink-muted hover:border-accent hover:text-ink'
                }`}
            >
              {n}M
            </button>
          )
        })}
      </div>

      <span className="hidden h-4 w-px bg-line sm:block" aria-hidden="true" />

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
