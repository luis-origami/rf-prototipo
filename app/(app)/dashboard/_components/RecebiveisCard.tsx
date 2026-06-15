'use client'

import { diasEntre, formatarData, formatarMoeda, DATA_BASE, type Boleto } from '../../../../mocks'
import { Card } from '../../../../components/ui/Card'
import { IconCheck } from '../../../../components/icons'
import { AgingChart, type AgingFaixa } from './AgingChart'
import { FormaPagamentoChart } from './FormaPagamentoChart'

/* Visão prospectiva de recebíveis — próximos 90 dias em faixas de tempo que
   o usuário habilita/desabilita. Total, barra e a seção de forma de
   pagamento (logo abaixo, no mesmo card) seguem apenas as faixas ativas. */

export interface FaixaRecebivel {
  id: string
  label: string
  de: number   // dias a partir da data-base (inclusive)
  ate: number  // inclusive
  cls: string  // rampa de aço — tempo não é severidade
}

export const FAIXAS_RECEBIVEIS: FaixaRecebivel[] = [
  { id: 'f7',  label: 'Até 7 dias',  de: 0,  ate: 7,  cls: 'bg-steel-700' },
  { id: 'f15', label: '8–15 dias',   de: 8,  ate: 15, cls: 'bg-steel-500' },
  { id: 'f30', label: '16–30 dias',  de: 16, ate: 30, cls: 'bg-steel-400' },
  { id: 'f60', label: '31–60 dias',  de: 31, ate: 60, cls: 'bg-steel-300' },
  { id: 'f90', label: '61–90 dias',  de: 61, ate: 90, cls: 'bg-steel-200' },
]

/** faixa de recebível de um boleto a vencer — null fora do horizonte de 90 dias */
export function faixaDoBoleto(b: Boleto): string | null {
  if (b.status !== 'avencer' && b.status !== 'hoje') return null
  const dias = diasEntre(DATA_BASE, b.vencimento)
  const faixa = FAIXAS_RECEBIVEIS.find((f) => dias >= f.de && dias <= f.ate)
  return faixa?.id ?? null
}

interface RecebiveisCardProps {
  /** boletos já filtrados pela empresa selecionada */
  boletos: Boleto[]
  /** faixas habilitadas — controladas pelo dashboard (sincroniza formas de pagamento) */
  ativas: Set<string>
  onToggle: (faixaId: string) => void
}

export function RecebiveisCard({ boletos, ativas, onToggle }: RecebiveisCardProps) {
  const porFaixa = FAIXAS_RECEBIVEIS.map((f) => {
    const itens = boletos.filter((b) => faixaDoBoleto(b) === f.id)
    return { ...f, valor: itens.reduce((s, b) => s + b.valor, 0), qtd: itens.length }
  })

  const ativasComValor = porFaixa.filter((f) => ativas.has(f.id))
  const totalAtivo = ativasComValor.reduce((s, f) => s + f.valor, 0)
  const qtdAtiva = ativasComValor.reduce((s, f) => s + f.qtd, 0)

  const faixasBarra: AgingFaixa[] = ativasComValor.map(({ label, valor, cls }) => ({ label, valor, cls }))

  // recorte compartilhado com a seção de forma de pagamento
  const previstos = boletos.filter((b) => {
    const faixa = faixaDoBoleto(b)
    return faixa != null && ativas.has(faixa)
  })

  return (
    <Card>
      <Card.Header>
        <Card.Title>Recebíveis previstos</Card.Title>
        <span className="label-mono text-ink-muted">90 dias · a partir de {formatarData(DATA_BASE)}</span>
      </Card.Header>
      <Card.Body>
        {/* total das faixas habilitadas */}
        <div className="flex flex-col gap-1">
          <span className="label-mono text-ink-muted">Total no período selecionado</span>
          <span className="num font-display text-2xl font-bold text-ink">
            {formatarMoeda(totalAtivo)}
          </span>
          <span className="num font-mono text-xs text-ink-muted">
            {qtdAtiva === 1 ? '1 título' : `${qtdAtiva} títulos`} a vencer
          </span>
        </div>

        <div className="mt-5">
          {totalAtivo === 0 ? (
            <p className="text-sm text-ink-muted">
              {ativas.size === 0
                ? 'Habilite ao menos uma faixa de tempo abaixo.'
                : 'Nenhum título a vencer nas faixas selecionadas.'}
            </p>
          ) : (
            <AgingChart faixas={faixasBarra} showLegend={false} />
          )}
        </div>

        {/* faixas — clicar habilita/desabilita; total, barra e formas de pagamento seguem */}
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 border-t border-line pt-4">
          {porFaixa.map((f) => {
            const ativa = ativas.has(f.id)
            return (
              <button
                key={f.id}
                type="button"
                role="checkbox"
                aria-checked={ativa}
                onClick={() => onToggle(f.id)}
                className={`-m-1.5 cursor-pointer rounded-md p-1.5 text-left outline-none
                  transition-opacity duration-100 focus-ring ${ativa ? '' : 'opacity-40'}`}
              >
                <span className="label-mono flex items-center gap-2 text-ink-muted">
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-[1.5px]
                      transition-colors duration-100
                      ${ativa ? 'border-accent bg-accent text-white' : 'border-line-strong bg-transparent'}`}
                  >
                    {ativa && <IconCheck size={10} />}
                  </span>
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${f.cls}`} />
                  {f.label}
                </span>
                <span className="num mt-1 block pl-6 font-mono text-sm font-semibold text-ink">
                  {formatarMoeda(f.valor)}
                  <span className="ml-1.5 font-normal text-ink-muted">
                    · {f.qtd} {f.qtd === 1 ? 'título' : 'títulos'}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </Card.Body>

      {/* forma de pagamento — mesma seleção de faixas dos recebíveis acima */}
      <div className="border-t border-line px-5 py-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-display text-base font-semibold text-ink">Forma de pagamento</h4>
          <span className="label-mono text-ink-muted">% do previsto no período</span>
        </div>
        <FormaPagamentoChart boletos={previstos} />
      </div>
    </Card>
  )
}
