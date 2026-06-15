import type { EstadoProcesso } from '../../mocks'

/* Estado do processo = verdade do produto → quadrado + mono (DS v5 slide 14).
   A forma separa as categorias: pílula é fato financeiro, quadrado é processo. */

const PROC: Record<Exclude<EstadoProcesso, 'normal'>, { cls: string; label: string }> = {
  pausado: { cls: 'bg-steel-50 text-steel-600 border-steel-200', label: 'Régua pausada' },
  aprovacao: { cls: 'bg-info-bg text-info-fg border-info-border', label: 'Aguardando aprovação' },
  excecao: { cls: 'bg-hoje-bg text-hoje-fg border-hoje-border', label: 'Exceção manual' },
}

export function ProcessBadge({ estado }: { estado: EstadoProcesso }) {
  if (estado === 'normal') return null
  const { cls, label } = PROC[estado]
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
