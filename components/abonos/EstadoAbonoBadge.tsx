import type { EstadoAbono } from '../../mocks'

/* Estado do abono = estado de processo → quadrado + mono (DS v5 slide 14).
   Aplicado/expirado usam os aliases semânticos (success/warning) — a forma
   quadrada distingue do estado financeiro em pílula. Cancelado é neutro. */

const MAP: Record<EstadoAbono, { cls: string; label: string }> = {
  ativo: { cls: 'bg-info-bg text-info-fg border-info-border', label: 'Abono ativo' },
  aplicado: { cls: 'bg-success-bg text-success-fg border-success-border', label: 'Abono aplicado' },
  expirado: { cls: 'bg-warning-bg text-warning-fg border-warning-border', label: 'Abono expirado' },
  cancelado: { cls: 'bg-steel-50 text-steel-600 border-steel-200', label: 'Abono cancelado' },
}

export function EstadoAbonoBadge({ estado }: { estado: EstadoAbono }) {
  const { cls, label } = MAP[estado]
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border px-2 py-0.5
        font-mono text-xs font-medium ${cls}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-[2px] bg-current" />
      {label}
    </span>
  )
}
