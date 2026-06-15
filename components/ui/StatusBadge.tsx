import type { StatusBoleto, SituacaoCliente } from '../../mocks'

/* Estado financeiro = fato do Certtus → pílula colorida (DS v5 slide 14).
   `pago_atraso` não existe no DS: tratado como família "pago" com sufixo —
   a cor diz "recebido", o texto diz como. */

export type FinancialStatus = StatusBoleto | SituacaoCliente

const FAMILY: Record<FinancialStatus, { cls: string; label: string }> = {
  pago: { cls: 'bg-pago-bg text-pago-fg border-pago-border', label: 'Pago' },
  pago_atraso: { cls: 'bg-pago-bg text-pago-fg border-pago-border', label: 'Pago com atraso' },
  avencer: { cls: 'bg-avencer-bg text-avencer-fg border-avencer-border', label: 'A vencer' },
  hoje: { cls: 'bg-hoje-bg text-hoje-fg border-hoje-border', label: 'Vence hoje' },
  atrasado: { cls: 'bg-atrasado-bg text-atrasado-fg border-atrasado-border', label: 'Atrasado' },
  inadimplente: { cls: 'bg-inadimplente-bg text-inadimplente-fg border-inadimplente-border', label: 'Inadimplente' },
  adimplente: { cls: 'bg-pago-bg text-pago-fg border-pago-border', label: 'Em dia' },
}

interface StatusBadgeProps {
  status: FinancialStatus
  /** dias de atraso — exibido como "· N dias" (singular em 1) */
  dias?: number
}

export function StatusBadge({ status, dias }: StatusBadgeProps) {
  const { cls, label } = FAMILY[status]
  const sufixo = dias != null && dias > 0 ? ` · ${dias} ${dias === 1 ? 'dia' : 'dias'}` : ''
  return (
    <span
      className={`num inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5
        text-sm font-semibold ${cls}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-90" />
      {label}
      {sufixo}
    </span>
  )
}
