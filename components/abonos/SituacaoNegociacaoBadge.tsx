import type { SituacaoNegociacao } from '../../lib/negociacoes'

/* Situação da negociação = estado de processo → quadrado + mono (DS v5 slide 14).
   'aberta' usa o tom de "A vencer" (promessa ativa, mesma família da coluna
   Negociações do Kanban); 'descumprida' herda o vermelho de inadimplência;
   'retornada' é neutro (ação interna, sem juízo sobre o cliente). */

const MAP: Record<SituacaoNegociacao, { cls: string; label: string }> = {
  aberta: { cls: 'bg-avencer-bg text-avencer-fg border-avencer-border', label: 'Em aberto' },
  descumprida: { cls: 'bg-inadimplente-bg text-inadimplente-fg border-inadimplente-border', label: 'Descumprida' },
  retornada: { cls: 'bg-steel-50 text-steel-600 border-steel-200', label: 'Retornada à régua' },
}

export function SituacaoNegociacaoBadge({ situacao }: { situacao: SituacaoNegociacao }) {
  const { cls, label } = MAP[situacao]
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
