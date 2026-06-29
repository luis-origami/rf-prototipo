'use client'

import { useState } from 'react'
import { formatarMoeda, formatarPct, type MetricaMes } from '../../../../mocks'
import { useTooltipClamp } from './useTooltipClamp'
import { PeriodoFiltro, type Periodo } from './PeriodoFiltro'

/* Inadimplência mês a mês — duas leituras, em barras pareadas por mês:
   • Inadimplência da carteira: % da carteira inadimplente no fim de cada mês
     (acumulado) — a evolução geral.
   • Inadimplência do mês: dos títulos que venciam no mês, % que seguiu sem
     pagar após o corte de 15 dias — o efeito da cobrança daquele mês. */

const MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function rotuloMes(mes: string): string {
  const [ano, m] = mes.split('-')
  return `${MES_ABREV[Number(m) - 1]}/${ano.slice(2)}`
}

interface InadimplenciaMensalChartProps {
  dados: MetricaMes[]
}

export function InadimplenciaMensalChart({ dados: dadosFull }: InadimplenciaMensalChartProps) {
  const [ativo, setAtivo] = useState<number | null>(null)
  const [periodo, setPeriodo] = useState<Periodo>(12)
  // recorta a janela visível às últimas N posições da série
  const dados = dadosFull.slice(-periodo)

  const maxPct = Math.max(...dados.flatMap((d) => [d.pctFoto, d.pctDesempenho]), 1)
  const yMax = Math.ceil(maxPct / 5) * 5 || 5

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
              <span className="text-inadimplente-base">●</span> Carteira{' '}
              <span className="font-semibold">{formatarPct(sel.pctFoto)}</span>
            </div>
            <div className="num font-mono text-sm">
              <span className="text-atrasado-base">●</span> Do mês{' '}
              <span className="font-semibold">{formatarPct(sel.pctDesempenho)}</span>
              <span className="ml-2 text-steel-200">{formatarMoeda(sel.inadimplenteAposCorte)}</span>
            </div>
          </div>
        )}

        {/* pares de barras por mês */}
        <div
          className="flex h-44 items-end gap-1.5 sm:gap-2"
          role="img"
          aria-label="Inadimplência mensal: da carteira (acumulada) e do mês (por vencimento)"
        >
          {dados.map((d, i) => (
            <div
              key={d.mes}
              aria-label={`${rotuloMes(d.mes)}: carteira ${formatarPct(d.pctFoto)}, do mês ${formatarPct(d.pctDesempenho)}`}
              onMouseEnter={() => setAtivo(i)}
              onMouseLeave={() => setAtivo(null)}
              className={`flex h-full flex-1 items-end gap-px transition-opacity duration-100
                ${ativo != null && ativo !== i ? 'opacity-40' : ''}`}
            >
              <span
                className="w-1/2 rounded-t-sm bg-inadimplente-base"
                style={{ height: `${(d.pctFoto / yMax) * 100}%` }}
              />
              <span
                className="w-1/2 rounded-t-sm bg-atrasado-base"
                style={{ height: `${(d.pctDesempenho / yMax) * 100}%` }}
              />
            </div>
          ))}
        </div>

        {/* eixo — meses em mono 11px */}
        <div className="mt-2 flex gap-1.5 border-t border-line pt-2 sm:gap-2">
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
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-inadimplente-base" />
          Inadimplência da carteira
        </span>
        <span className="label-mono flex items-center gap-2 text-ink-muted">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-atrasado-base" />
          Inadimplência do mês
        </span>
      </div>
    </div>
  )
}
