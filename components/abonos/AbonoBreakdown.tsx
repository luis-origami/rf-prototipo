import { formatarData, formatarMoeda } from '../../mocks'
import { Tag } from '../ui/Tag'

/* Breakdown de um abono — funciona tanto para o abono vivo quanto para o
   snapshot imutável registrado na comunicação. O principal é dado Certtus
   (mono + cadeado); juros/multa/abonos são estado de processo. O abono é
   sempre sobre encargos — nunca sobre o valor principal. */

export interface AbonoBreakdownValores {
  valorPrincipal: number
  jurosCalculado: number
  multaCalculada: number
  jurosAbonado: number
  multaAbonada: number
  valorFinal: number
  dataPromessaPagamento?: string
}

export function AbonoBreakdown({ valores }: { valores: AbonoBreakdownValores }) {
  const v = valores
  return (
    <dl className="num flex flex-col gap-1.5 font-mono text-xs">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="flex items-center gap-2 text-ink-muted">
          Valor original <Tag variant="source">Certtus</Tag>
        </dt>
        <dd className="text-ink">{formatarMoeda(v.valorPrincipal)}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-ink-muted">Juros calculados</dt>
        <dd className="text-ink">{formatarMoeda(v.jurosCalculado)}</dd>
      </div>
      {v.jurosAbonado > 0 && (
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-muted">Juros abonados</dt>
          <dd className="text-success-fg">− {formatarMoeda(v.jurosAbonado)}</dd>
        </div>
      )}
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-ink-muted">Multa calculada</dt>
        <dd className="text-ink">{formatarMoeda(v.multaCalculada)}</dd>
      </div>
      {v.multaAbonada > 0 && (
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-muted">Multa abonada</dt>
          <dd className="text-success-fg">− {formatarMoeda(v.multaAbonada)}</dd>
        </div>
      )}
      <div className="flex items-baseline justify-between gap-4 border-t border-line pt-1.5">
        <dt className="font-semibold text-ink">Valor final</dt>
        <dd className="font-semibold text-ink">{formatarMoeda(v.valorFinal)}</dd>
      </div>
      {v.dataPromessaPagamento && (
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-muted">Promessa · validade do abono</dt>
          <dd className="text-ink">{formatarData(v.dataPromessaPagamento)}</dd>
        </div>
      )}
    </dl>
  )
}
