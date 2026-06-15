'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatarMoeda, type PrevistoRecebidoMes } from '../../../../mocks'
import { useTooltipClamp } from './useTooltipClamp'

/* Previsto × recebido mês a mês — pares de barras por mês. Previsto em aço
   claro (expectativa), recebido em verde (dinheiro confirmado — único uso de
   verde fora de "pago", coerente com a régua). Tooltip por mês com os dois
   valores e a realização (%). */

const MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function rotuloMes(mes: string): string {
  const [ano, m] = mes.split('-')
  return `${MES_ABREV[Number(m) - 1]}/${ano.slice(2)}`
}

interface PrevistoRecebidoChartProps {
  dados: PrevistoRecebidoMes[]
}

export function PrevistoRecebidoChart({ dados }: PrevistoRecebidoChartProps) {
  const router = useRouter()
  const [ativo, setAtivo] = useState<number | null>(null)
  const max = Math.max(...dados.map((d) => d.previsto), 1)

  const sel = ativo != null ? dados[ativo] : null
  // tooltip no espaço reservado acima das barras (pt), com posição medida e
  // clampada nas bordas — nunca corta no limite do card
  const { wrapRef, tipRef, left } = useTooltipClamp(
    ativo != null ? (ativo + 0.5) / dados.length : null,
  )

  return (
    <div>
      <div ref={wrapRef} className="relative pt-20">
        {/* tooltip — mês ativo, valores e realização */}
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
              Previsto <span className="font-semibold">{formatarMoeda(sel.previsto)}</span>
            </div>
            <div className="num font-mono text-sm">
              Recebido <span className="font-semibold">{formatarMoeda(sel.recebido)}</span>
              <span className="ml-2 text-steel-200">
                {sel.previsto > 0 ? Math.round((sel.recebido / sel.previsto) * 100) : 0}% realização
              </span>
            </div>
          </div>
        )}

        {/* pares de barras por mês */}
        <div
          className="flex h-44 items-end gap-1.5 sm:gap-2"
          role="img"
          aria-label="Comparativo mensal entre valor previsto e valor recebido"
        >
          {dados.map((d, i) => (
            <button
              key={d.mes}
              type="button"
              aria-label={`${rotuloMes(d.mes)}: previsto ${formatarMoeda(d.previsto)}, recebido ${formatarMoeda(d.recebido)}`}
              onClick={() => router.push(`/cobrancas?venc_de=${d.mes}-01&venc_ate=${d.mes}-31`)}
              onMouseEnter={() => setAtivo(i)}
              onMouseLeave={() => setAtivo(null)}
              onFocus={() => setAtivo(i)}
              onBlur={() => setAtivo(null)}
              className={`flex h-full flex-1 cursor-pointer items-end gap-px outline-none
                transition-opacity duration-100
                ${ativo != null && ativo !== i ? 'opacity-40' : ''}`}
            >
              <span
                className="w-1/2 rounded-t-sm bg-steel-300"
                style={{ height: `${(d.previsto / max) * 100}%` }}
              />
              <span
                className="w-1/2 rounded-t-sm bg-pago-base"
                style={{ height: `${(d.recebido / max) * 100}%` }}
              />
            </button>
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

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        <span className="label-mono flex items-center gap-2 text-ink-muted">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-steel-300" />
          Previsto
        </span>
        <span className="label-mono flex items-center gap-2 text-ink-muted">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-pago-base" />
          Recebido
        </span>
      </div>
    </div>
  )
}
