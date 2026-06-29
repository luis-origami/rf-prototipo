'use client'

import { useState } from 'react'
import { formatarMoeda, type MetricaMes } from '../../../../mocks'
import { useTooltipClamp } from './useTooltipClamp'
import { PeriodoFiltro, type Periodo } from './PeriodoFiltro'

/* Inadimplência mês a mês — duas leituras (metric 3):
   • Foto do mês: % da carteira inadimplente no último dia de cada mês —
     acompanha a evolução geral do estoque.
   • Desempenho do mês: dos títulos que venciam no mês, % que seguiu sem
     pagamento após o corte de 15 dias — mede se a cobrança daquele mês
     funcionou. Linhas, não barras: o que importa é a tendência. */

const MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function rotuloMes(mes: string): string {
  const [ano, m] = mes.split('-')
  return `${MES_ABREV[Number(m) - 1]}/${ano.slice(2)}`
}

// área de desenho do SVG (coordenadas internas; traço não escala)
const W = 100
const H = 42

interface InadimplenciaMensalChartProps {
  dados: MetricaMes[]
}

export function InadimplenciaMensalChart({ dados: dadosFull }: InadimplenciaMensalChartProps) {
  const [ativo, setAtivo] = useState<number | null>(null)
  const [periodo, setPeriodo] = useState<Periodo>(12)
  const dados = dadosFull.slice(-periodo)

  const maxPct = Math.max(...dados.flatMap((d) => [d.pctFoto, d.pctDesempenho]), 1)
  const yMax = Math.ceil(maxPct / 5) * 5 || 5

  const x = (i: number) => (dados.length === 1 ? W / 2 : (i / (dados.length - 1)) * W)
  const y = (v: number) => H - (v / yMax) * H
  const pontos = (sel: (d: MetricaMes) => number) =>
    dados.map((d, i) => `${x(i)},${y(sel(d))}`).join(' ')

  const sel = ativo != null ? dados[ativo] : null
  const { wrapRef, tipRef, left } = useTooltipClamp(
    ativo != null ? (ativo + 0.5) / dados.length : null,
  )

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <PeriodoFiltro value={periodo} onChange={setPeriodo} />
      </div>

      <div ref={wrapRef} className="relative pt-20">
        {/* tooltip — mês ativo com as duas leituras */}
        {sel && (
          <div
            ref={tipRef}
            className="pointer-events-none absolute top-0 z-10 whitespace-nowrap rounded-md
              bg-steel-800 px-3 py-2 text-white shadow-lg"
            style={{ left }}
            role="status"
          >
            <div className="label-mono text-steel-200">{rotuloMes(sel.mes)}</div>
            <div className="num font-mono text-sm">
              <span className="text-inadimplente-fg">●</span> Foto da carteira{' '}
              <span className="font-semibold">{sel.pctFoto}%</span>
            </div>
            <div className="num font-mono text-sm">
              <span className="text-accent">●</span> Desempenho do mês{' '}
              <span className="font-semibold">{sel.pctDesempenho}%</span>
              <span className="ml-2 text-steel-200">{formatarMoeda(sel.inadimplenteAposCorte)}</span>
            </div>
          </div>
        )}

        {/* linhas — SVG com traço de largura fixa (vector-effect) */}
        <div className="relative h-44">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible"
            role="img"
            aria-label="Evolução mensal da inadimplência: foto da carteira e desempenho do mês"
          >
            {/* foto da carteira (estoque) */}
            <polyline
              points={pontos((d) => d.pctFoto)}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="text-inadimplente-fg"
            />
            {/* desempenho do mês (por vencimento) */}
            <polyline
              points={pontos((d) => d.pctDesempenho)}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeDasharray="3 2"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="text-accent"
            />
          </svg>

          {/* pontos do mês ativo — em HTML para ficarem redondos (o SVG é
              esticado em X≠Y e deformaria <circle>) */}
          {sel && (
            <>
              <span
                className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 translate-y-1/2
                  rounded-full bg-inadimplente-fg ring-2 ring-surface"
                style={{ left: `${x(ativo!)}%`, bottom: `${(sel.pctFoto / yMax) * 100}%` }}
              />
              <span
                className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 translate-y-1/2
                  rounded-full bg-accent ring-2 ring-surface"
                style={{ left: `${x(ativo!)}%`, bottom: `${(sel.pctDesempenho / yMax) * 100}%` }}
              />
            </>
          )}

          {/* faixa de captura de hover por mês */}
          <div className="absolute inset-0 flex">
            {dados.map((d, i) => (
              <button
                key={d.mes}
                type="button"
                aria-label={`${rotuloMes(d.mes)}: foto da carteira ${d.pctFoto}%, desempenho do mês ${d.pctDesempenho}%`}
                onMouseEnter={() => setAtivo(i)}
                onMouseLeave={() => setAtivo(null)}
                onFocus={() => setAtivo(i)}
                onBlur={() => setAtivo(null)}
                className="h-full flex-1 cursor-pointer outline-none focus-ring"
              />
            ))}
          </div>
        </div>

        {/* eixo — meses em mono 11px */}
        <div className="mt-2 flex border-t border-line pt-2">
          {dados.map((d) => (
            <span key={d.mes} className="num flex-1 text-center font-mono text-xs text-ink-muted">
              {rotuloMes(d.mes)}
            </span>
          ))}
        </div>
      </div>

      {/* legenda */}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        <span className="label-mono flex items-center gap-2 text-ink-muted">
          <span className="h-0.5 w-4 shrink-0 rounded-full bg-inadimplente-fg" />
          Foto da carteira (estoque)
        </span>
        <span className="label-mono flex items-center gap-2 text-ink-muted">
          <span className="h-0.5 w-4 shrink-0 rounded-full bg-accent" />
          Desempenho do mês (por vencimento)
        </span>
      </div>
    </div>
  )
}
