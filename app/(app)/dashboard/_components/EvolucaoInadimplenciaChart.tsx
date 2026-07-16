'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatarMoeda, FAIXAS_AGING, FAIXAS_AGING_DIAS, type EvolucaoMes } from '../../../../mocks'
import { useTooltipClamp } from './useTooltipClamp'
import { MesRangeFiltro } from './MesRangeFiltro'

/* Evolução da inadimplência por faixa de aging — barras empilhadas mês a mês.
   Faixas alinhadas aos MARCOS DA RÉGUA PADRÃO (D+1/D+5/D+15/D+30/D+60/D+90),
   uma cor por faixa na régua de severidade do DS: quanto mais antiga a
   dívida, mais escura a cor (menor probabilidade de recuperação). Faixas
   escuras crescendo = carteira envelhecendo; encolhendo = recuperação cedo.
   O comparativo com o recuperado vive em gráfico próprio
   (InadimplenciaRecuperadoChart). Tooltip por segmento com valor e % do mês. */

// 1–5 → 6–15 → 16–30 → 31–60 → 61–90 → +90 (quase preto = perda provável)
const FAIXA_CLS = [
  'bg-atrasado-base',
  'bg-inadimplente-base',
  'bg-inadimplente-fg',
  'bg-neutral-700',
  'bg-neutral-800',
  'bg-neutral-950',
] as const

const MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function rotuloMes(mes: string): string {
  const [ano, m] = mes.split('-')
  return `${MES_ABREV[Number(m) - 1]}/${ano.slice(2)}`
}

interface EvolucaoInadimplenciaChartProps {
  dados: EvolucaoMes[]
}

export function EvolucaoInadimplenciaChart({ dados: dadosFull }: EvolucaoInadimplenciaChartProps) {
  const router = useRouter()
  const [ativo, setAtivo] = useState<{ mes: number; faixa: number } | null>(null)
  // intervalo de meses visível — padrão: série completa
  const meses = dadosFull.map((d) => d.mes)
  const [range, setRange] = useState(() => ({ de: meses[0], ate: meses[meses.length - 1] }))
  const dados = dadosFull.filter((d) => d.mes >= range.de && d.mes <= range.ate)

  function navegarFaixa(fi: number) {
    const [de, ate] = FAIXAS_AGING_DIAS[fi]
    const params = ate != null
      ? `atraso_de=${de}&atraso_ate=${ate}`
      : `atraso_de=${de}`
    router.push(`/titulos?${params}`)
  }

  const totais = dados.map((d) => d.faixas.reduce((s, v) => s + v, 0))
  const maxTotal = Math.max(...totais, 1)

  const sel = ativo ? dados[ativo.mes] : null
  const selTotal = ativo ? totais[ativo.mes] : 0
  // tooltip no espaço reservado acima das colunas (pt), com posição medida e
  // clampada nas bordas — nunca corta no limite do card
  const { wrapRef, tipRef, left } = useTooltipClamp(
    ativo ? (ativo.mes + 0.5) / dados.length : null,
    ativo?.faixa,
  )

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <MesRangeFiltro
          meses={meses}
          de={range.de}
          ate={range.ate}
          onChange={(de, ate) => setRange({ de, ate })}
        />
      </div>

      <div ref={wrapRef} className="relative pt-16">
        {/* tooltip — ancorado na coluna ativa, dentro do espaço reservado */}
        {sel && (
          <div
            ref={tipRef}
            className="pointer-events-none absolute top-0 z-10 whitespace-nowrap rounded-md
              bg-steel-800 px-3 py-2 text-white shadow-lg"
            style={{ left }}
            role="status"
          >
            <div className="label-mono text-steel-200">
              {rotuloMes(sel.mes)} · {FAIXAS_AGING[ativo!.faixa]}
            </div>
            <div className="num font-mono text-sm font-semibold">
              {formatarMoeda(sel.faixas[ativo!.faixa])}
              <span className="ml-2 font-normal text-steel-200">
                {selTotal > 0 ? Math.round((sel.faixas[ativo!.faixa] / selTotal) * 100) : 0}% do mês
              </span>
            </div>
          </div>
        )}

        {/* colunas — altura proporcional ao maior mês; faixa mais antiga na base */}
        <div
          className="flex h-44 items-end gap-1.5 sm:gap-2"
          role="img"
          aria-label="Evolução mensal do valor inadimplente por faixa de envelhecimento"
        >
          {dados.map((d, mi) => {
            const total = totais[mi]
            return (
              <div key={d.mes} className="flex h-full flex-1 flex-col justify-end">
                <div
                  className="flex flex-col overflow-hidden rounded-sm"
                  style={{ height: `${(total / maxTotal) * 100}%` }}
                >
                  {d.faixas.map((valor, fi) =>
                    valor > 0 ? (
                      <button
                        key={fi}
                        type="button"
                        aria-label={`${rotuloMes(d.mes)}, ${FAIXAS_AGING[fi]}: ${formatarMoeda(valor)}, ${
                          total > 0 ? Math.round((valor / total) * 100) : 0
                        }% do mês`}
                        onClick={() => navegarFaixa(fi)}
                        onMouseEnter={() => setAtivo({ mes: mi, faixa: fi })}
                        onMouseLeave={() => setAtivo(null)}
                        onFocus={() => setAtivo({ mes: mi, faixa: fi })}
                        onBlur={() => setAtivo(null)}
                        className={`${FAIXA_CLS[fi]} w-full cursor-pointer outline-none transition-opacity
                          duration-100
                          ${ativo && (ativo.mes !== mi || ativo.faixa !== fi) ? 'opacity-40' : ''}`}
                        style={{ flexGrow: valor }}
                      />
                    ) : null,
                  )}
                </div>
              </div>
            )
          })}
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

      {/* legenda — espelha a ordem de severidade */}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {FAIXAS_AGING.map((label, fi) => (
          <span key={label} className="label-mono flex items-center gap-2 text-ink-muted">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${FAIXA_CLS[fi]}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
