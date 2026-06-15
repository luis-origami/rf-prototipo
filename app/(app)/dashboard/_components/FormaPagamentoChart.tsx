'use client'

import {
  getFormaPagamento,
  FORMA_PAGAMENTO_LABEL,
  type Boleto,
  type FormaPagamento,
} from '../../../../mocks'
import { AgingChart, type AgingFaixa } from './AgingChart'

/* Composição por forma de pagamento — barra empilhada 100% com legenda,
   mesma linguagem do aging da carteira. Sincronizada com os recebíveis
   previstos: recebe os boletos das faixas de tempo habilitadas e mostra o
   percentual de cada forma dentro desse recorte. Categoria não é
   severidade: rampa de aço (mais escuro = maior fatia). */

const RAMPA_ACO = [
  'bg-steel-700',
  'bg-steel-500',
  'bg-steel-400',
  'bg-steel-300',
  'bg-steel-200',
  'bg-neutral-300',
] as const

interface FormaPagamentoChartProps {
  /** boletos do recorte ativo (empresa + faixas de recebíveis habilitadas) */
  boletos: Boleto[]
}

export function FormaPagamentoChart({ boletos }: FormaPagamentoChartProps) {
  const porForma = new Map<FormaPagamento, number>()
  for (const b of boletos) {
    const forma = getFormaPagamento(b)
    porForma.set(forma, (porForma.get(forma) ?? 0) + b.valor)
  }

  const faixas: AgingFaixa[] = [...porForma.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([forma, valor], i) => ({
      label: FORMA_PAGAMENTO_LABEL[forma],
      valor,
      cls: RAMPA_ACO[Math.min(i, RAMPA_ACO.length - 1)],
    }))

  if (faixas.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        Nenhum título no período selecionado em recebíveis previstos.
      </p>
    )
  }

  return <AgingChart faixas={faixas} />
}
