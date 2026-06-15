'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatarMoeda, type EvolucaoMes } from '../../../../mocks'
import { useTooltipClamp } from './useTooltipClamp'

/* Inadimplência X Recuperação — pares de barras por mês: o estoque
   inadimplente (vinho, severidade máxima da régua) ao lado do valor
   recuperado dele no mês (verde — dinheiro confirmado). A distância entre
   as duas barras é a história: recuperação acompanhando ou ficando para
   trás. Tooltip por mês com os dois valores e a taxa de recuperação. */

const MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function rotuloMes(mes: string): string {
  const [ano, m] = mes.split('-')
  return `${MES_ABREV[Number(m) - 1]}/${ano.slice(2)}`
}

interface InadimplenciaRecuperadoChartProps {
  dados: EvolucaoMes[]
}

export function InadimplenciaRecuperadoChart({ dados }: InadimplenciaRecuperadoChartProps) {
  const router = useRouter()
  const [ativo, setAtivo] = useState<number | null>(null)

  const totais = dados.map((d) => d.faixas.reduce((s, v) => s + v, 0))
  const max = Math.max(...totais, 1)

  const sel = ativo != null ? dados[ativo] : null
  const selTotal = ativo != null ? totais[ativo] : 0
  // tooltip no espaço reservado acima das barras (pt), com posição medida e
  // clampada nas bordas — nunca corta no limite do card
  const { wrapRef, tipRef, left } = useTooltipClamp(
    ativo != null ? (ativo + 0.5) / dados.length : null,
  )

  return (
    <div>
      <div ref={wrapRef} className="relative pt-20">
        {/* tooltip — mês ativo, valores e taxa de recuperação */}
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
              Inadimplente <span className="font-semibold">{formatarMoeda(selTotal)}</span>
            </div>
            <div className="num font-mono text-sm">
              Recuperado <span className="font-semibold">{formatarMoeda(sel.recuperado)}</span>
              <span className="ml-2 text-steel-200">
                {selTotal > 0 ? Math.round((sel.recuperado / selTotal) * 100) : 0}% do montante do mês
              </span>
            </div>
          </div>
        )}

        {/* pares de barras por mês — mais baixo que a evolução ao lado */}
        <div
          className="flex h-32 items-end gap-1.5 sm:gap-2"
          role="img"
          aria-label="Comparativo mensal entre o estoque inadimplente e o valor recuperado"
        >
          {dados.map((d, i) => (
            <button
              key={d.mes}
              type="button"
              aria-label={`${rotuloMes(d.mes)}: inadimplente ${formatarMoeda(totais[i])}, recuperado ${formatarMoeda(d.recuperado)}`}
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
                className="w-1/2 rounded-t-sm bg-inadimplente-base"
                style={{ height: `${(totais[i] / max) * 100}%` }}
              />
              <span
                className="w-1/2 rounded-t-sm bg-pago-base"
                style={{ height: `${(d.recuperado / max) * 100}%` }}
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
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-inadimplente-base" />
          Inadimplente no mês
        </span>
        <span className="label-mono flex items-center gap-2 text-ink-muted">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-pago-base" />
          Recuperado no mês
        </span>
      </div>
    </div>
  )
}
