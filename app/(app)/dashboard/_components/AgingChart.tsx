'use client'

import { useState } from 'react'
import { formatarMoeda } from '../../../../mocks'
import { useTooltipClamp } from './useTooltipClamp'

/* Aging como barra empilhada 100% — composição de uma mesma carteira.
   Interativo: hover/foco em segmento ou legenda destaca a faixa (os demais
   esmaecem) e mostra tooltip ancorado no meio do segmento. */

export interface AgingFaixa {
  label: string
  valor: number
  /** classe bg-* da régua de severidade */
  cls: string
}

interface AgingChartProps {
  faixas: AgingFaixa[]
  /** oculta a legenda quando os totais já estão na própria tela (ex.: recebíveis) */
  showLegend?: boolean
  /** 'column': um item por linha, distribuído para preencher a altura do card */
  legendLayout?: 'row' | 'column'
  /** callback de drilldown — índice do segmento clicado */
  onSegmentoClick?: (index: number) => void
}

export function AgingChart({ faixas, showLegend = true, legendLayout = 'row', onSegmentoClick }: AgingChartProps) {
  const [ativo, setAtivo] = useState<number | null>(null)
  const total = faixas.reduce((s, f) => s + f.valor, 0)

  // posição de cada segmento (soma das faixas anteriores) para ancorar o tooltip no centro
  const segmentos = total === 0 ? [] : faixas.map((f, i) => {
    const pct = (f.valor / total) * 100
    const antes = (faixas.slice(0, i).reduce((s, x) => s + x.valor, 0) / total) * 100
    return { ...f, pct, meio: antes + pct / 2 }
  })

  const seg = ativo != null ? (segmentos[ativo] ?? null) : null
  // posição medida e clampada nas bordas — nunca corta no limite do card
  const { wrapRef, tipRef, left } = useTooltipClamp(seg ? seg.meio / 100 : null, ativo)

  // hooks acima do early return — regra dos hooks
  if (total === 0) return null

  const legendaColuna = legendLayout === 'column'

  return (
    <div className={legendaColuna ? 'flex h-full flex-col' : undefined}>
      <div className="flex items-center gap-3">
        <span className="num shrink-0 font-mono text-xs text-ink-muted" aria-hidden="true">0%</span>
        <div ref={wrapRef} className="relative flex-1">
        {/* tooltip — ancorado no centro do segmento ativo, clampado nas bordas */}
        {seg && (
          <div
            ref={tipRef}
            className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap
              rounded-md bg-steel-800 px-3 py-2 text-white shadow-lg"
            style={{ left }}
            role="status"
          >
            <div className="label-mono text-steel-200">{seg.label}</div>
            <div className="num font-mono text-sm font-semibold">
              {formatarMoeda(seg.valor)}
              <span className="ml-2 font-normal text-steel-200">{Math.round(seg.pct)}%</span>
            </div>
          </div>
        )}

        <div
          className="flex h-5 overflow-hidden rounded-full"
          role="img"
          aria-label="Composição da carteira por idade do atraso"
        >
          {segmentos.map((s, i) =>
            s.valor > 0 ? (
              <button
                key={s.label}
                type="button"
                aria-label={`${s.label}: ${formatarMoeda(s.valor)}, ${Math.round(s.pct)}% da carteira`}
                onClick={() => onSegmentoClick?.(i)}
                onMouseEnter={() => setAtivo(i)}
                onMouseLeave={() => setAtivo(null)}
                onFocus={() => setAtivo(i)}
                onBlur={() => setAtivo(null)}
                className={`${s.cls} cursor-pointer border-r-2 border-white outline-none transition-opacity
                  duration-100 last:border-r-0
                  ${ativo != null && ativo !== i ? 'opacity-30' : ''}`}
                style={{ width: `${s.pct}%` }}
              />
            ) : null,
          )}
          </div>
        </div>
        <span className="num shrink-0 font-mono text-xs text-ink-muted" aria-hidden="true">100%</span>
      </div>

      {/* legenda — itens compactos, espelham o hover da barra. Em 'column',
          um item por linha, distribuído para ocupar a altura do card */}
      {showLegend && (
      <div
        className={
          legendaColuna
            ? 'mt-5 flex grow flex-col justify-between gap-1'
            : 'mt-5 flex flex-wrap gap-x-8 gap-y-3'
        }
      >
        {segmentos.map((s, i) => {
          const dim = ativo != null && ativo !== i
          return legendaColuna ? (
            <button
              key={s.label}
              type="button"
              onClick={() => onSegmentoClick?.(i)}
              onMouseEnter={() => setAtivo(i)}
              onMouseLeave={() => setAtivo(null)}
              onFocus={() => setAtivo(i)}
              onBlur={() => setAtivo(null)}
              className={`flex w-full cursor-pointer items-center justify-between gap-4 rounded-md
                px-1.5 py-1.5 text-left outline-none transition-opacity duration-100 focus-ring
                ${dim ? 'opacity-40' : ''}`}
            >
              <span className="label-mono flex items-center gap-2 text-ink-muted">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${s.cls}`} />
                {s.label}
              </span>
              <span className="num whitespace-nowrap font-mono text-sm font-semibold text-ink">
                {formatarMoeda(s.valor)}
                <span className="ml-1.5 font-normal text-ink-muted">· {Math.round(s.pct)}%</span>
              </span>
            </button>
          ) : (
            <button
              key={s.label}
              type="button"
              onClick={() => onSegmentoClick?.(i)}
              onMouseEnter={() => setAtivo(i)}
              onMouseLeave={() => setAtivo(null)}
              onFocus={() => setAtivo(i)}
              onBlur={() => setAtivo(null)}
              className={`-m-1.5 cursor-pointer rounded-md p-1.5 text-left outline-none
                transition-opacity duration-100 focus-ring ${dim ? 'opacity-40' : ''}`}
            >
              <span className="label-mono flex items-center gap-2 text-ink-muted">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${s.cls}`} />
                {s.label}
              </span>
              <span className="num mt-1 block font-mono text-sm font-semibold text-ink">
                {formatarMoeda(s.valor)}
                <span className="ml-1.5 font-normal text-ink-muted">· {Math.round(s.pct)}%</span>
              </span>
            </button>
          )
        })}
      </div>
      )}
    </div>
  )
}
