'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  formatarMoeda,
  getRecebimentosPorTipo,
  TIPO_CLIENTE_LABEL,
  type TipoClienteFiltro,
  type RecebimentoTipoMes,
} from '../../../../mocks'
import { useTooltipClamp } from './useTooltipClamp'

/* Recebimento por segmento de cliente — % de realização mês a mês.
   Barra empilhada: verde (recebido, baixo) + vermelho-suave (pendente, topo).
   Altura total da barra = aReceber do mês; o fill verde cresce com a realização.
   Filtro por tipo de cliente via pills na parte superior. */

const MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function rotuloMes(mes: string): string {
  const [ano, m] = mes.split('-')
  return `${MES_ABREV[Number(m) - 1]}/${ano.slice(2)}`
}

const TIPOS_FILTRO: TipoClienteFiltro[] = [
  'todos', 'oficina', 'frotista', 'transportadora', 'produtor', 'pf', 'orgao_publico',
]

export function RecebimentoTipoChart() {
  const router = useRouter()
  const [tipo, setTipo] = useState<TipoClienteFiltro>('todos')
  const [ativo, setAtivo] = useState<number | null>(null)

  const dados: RecebimentoTipoMes[] = getRecebimentosPorTipo(tipo)
  const max = Math.max(...dados.map((d) => d.aReceber), 1)

  const totalAReceber = dados.reduce((s, d) => s + d.aReceber, 0)
  const totalRecebido = dados.reduce((s, d) => s + d.recebido, 0)
  const totalPendente = dados.reduce((s, d) => s + d.pendente, 0)
  const pctGlobal = totalAReceber > 0 ? Math.round((totalRecebido / totalAReceber) * 100) : 0

  const sel = ativo != null ? dados[ativo] : null
  const { wrapRef, tipRef, left } = useTooltipClamp(
    ativo != null ? (ativo + 0.5) / dados.length : null,
  )

  return (
    <div>
      {/* filtro por tipo de cliente */}
      <div className="mb-5 flex flex-wrap gap-2">
        {TIPOS_FILTRO.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={`label-mono cursor-pointer rounded-full border px-3 py-1 outline-none
              transition-colors duration-100 focus-ring
              ${tipo === t
                ? 'border-accent bg-accent text-white'
                : 'border-line bg-transparent text-ink-muted hover:border-accent hover:text-ink'
              }`}
          >
            {TIPO_CLIENTE_LABEL[t]}
          </button>
        ))}
      </div>

      {/* KPIs resumidos — 4 valores no período completo (12 meses) */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-0.5">
          <span className="label-mono text-ink-muted">A receber</span>
          <span className="num font-mono text-sm font-semibold text-ink">
            {formatarMoeda(totalAReceber)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="label-mono text-ink-muted">Recebido</span>
          <span className="num font-mono text-sm font-semibold text-pago-fg">
            {formatarMoeda(totalRecebido)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="label-mono text-ink-muted">Pendente</span>
          <span className="num font-mono text-sm font-semibold text-atrasado-fg">
            {formatarMoeda(totalPendente)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="label-mono text-ink-muted">% realização</span>
          <span className="num font-mono text-sm font-semibold text-ink">
            {pctGlobal}%
          </span>
        </div>
      </div>

      {/* gráfico de barras empilhadas */}
      <div ref={wrapRef} className="relative pt-20">
        {/* tooltip */}
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
              A receber <span className="font-semibold">{formatarMoeda(sel.aReceber)}</span>
            </div>
            <div className="num font-mono text-sm">
              Recebido <span className="font-semibold">{formatarMoeda(sel.recebido)}</span>
              <span className="ml-2 text-steel-200">{sel.pctRealizacao}%</span>
            </div>
            <div className="num font-mono text-sm">
              Pendente <span className="font-semibold">{formatarMoeda(sel.pendente)}</span>
            </div>
          </div>
        )}

        {/* barras empilhadas */}
        <div
          className="flex h-44 items-end gap-1 sm:gap-1.5"
          role="img"
          aria-label="Realização mensal por segmento de cliente — recebido e pendente empilhados"
        >
          {dados.map((d, i) => (
            <div key={d.mes} className="flex h-full flex-1 flex-col justify-end">
              <button
                type="button"
                aria-label={`${rotuloMes(d.mes)}: ${d.pctRealizacao}% realização — recebido ${formatarMoeda(d.recebido)}, pendente ${formatarMoeda(d.pendente)}`}
                onClick={() => router.push(`/cobrancas?venc_de=${d.mes}-01&venc_ate=${d.mes}-31`)}
                onMouseEnter={() => setAtivo(i)}
                onMouseLeave={() => setAtivo(null)}
                onFocus={() => setAtivo(i)}
                onBlur={() => setAtivo(null)}
                className={`flex w-full cursor-pointer flex-col overflow-hidden rounded-t-sm outline-none
                  transition-opacity duration-100
                  ${ativo != null && ativo !== i ? 'opacity-40' : ''}`}
                style={{ height: `${(d.aReceber / max) * 100}%` }}
              >
                {/* topo = pendente (vermelho-suave) */}
                <span className="w-full bg-atrasado-base" style={{ flexGrow: d.pendente }} />
                {/* baixo = recebido (verde) */}
                <span className="w-full bg-pago-base" style={{ flexGrow: d.recebido }} />
              </button>
            </div>
          ))}
        </div>

        {/* eixo de meses */}
        <div className="mt-2 flex gap-1 border-t border-line pt-2 sm:gap-1.5">
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
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-pago-base" />
          Recebido
        </span>
        <span className="label-mono flex items-center gap-2 text-ink-muted">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-atrasado-base" />
          Pendente
        </span>
      </div>
    </div>
  )
}
